/**
 * ワークフローサービス
 * 要件2.2: 問い合わせ状態の管理（新規→対応中→解決済み→クローズ）
 * 要件2.3: 状態変更履歴の記録機能
 */

import {
    Injectable,
    BadRequestException,
    Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Inquiry, InquiryStatus } from '../entities/inquiry.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';

/**
 * 状態遷移ルール定義
 */
const STATUS_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
    'new': ['in_progress', 'closed'],
    'in_progress': ['pending', 'resolved', 'closed'],
    'pending': ['in_progress', 'resolved', 'closed'],
    'resolved': ['closed', 'in_progress'], // 再オープン可能
    'closed': ['in_progress'] // 再オープン可能
};

/**
 * 状態変更時の自動処理定義
 */
interface StatusChangeAction {
    updateFields?: Partial<Inquiry>;
    requireComment?: boolean;
    notificationRequired?: boolean;
}

const STATUS_CHANGE_ACTIONS: Record<InquiryStatus, StatusChangeAction> = {
    'new': {},
    'in_progress': {
        notificationRequired: true
    },
    'pending': {
        requireComment: true,
        notificationRequired: true
    },
    'resolved': {
        updateFields: { resolvedAt: new Date() },
        notificationRequired: true
    },
    'closed': {
        updateFields: { closedAt: new Date() },
        notificationRequired: true
    }
};

@Injectable()
export class WorkflowService {
    private readonly logger = new Logger(WorkflowService.name);

    constructor(
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(InquiryStatusHistory)
        private readonly statusHistoryRepository: Repository<InquiryStatusHistory>
    ) { }

    /**
     * 状態遷移が有効かどうかを検証する
     * 要件2.2: 状態管理機能
     */
    validateStatusTransition(
        currentStatus: InquiryStatus,
        newStatus: InquiryStatus
    ): boolean {
        if (currentStatus === newStatus) {
            return false; // 同じ状態への遷移は無効
        }

        const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
        return allowedTransitions.includes(newStatus);
    }

    /**
     * 状態変更を実行する
     * 要件2.2, 2.3: 状態管理と履歴記録機能
     */
    async executeStatusChange(
        inquiryId: string,
        newStatus: InquiryStatus,
        changedBy: string,
        comment?: string,
        ipAddress?: string
    ): Promise<Inquiry> {
        this.logger.log(`状態変更実行開始: ID=${inquiryId}, 新状態=${newStatus}`);

        // 問い合わせを取得
        const inquiry = await this.inquiryRepository.findOne({
            where: { id: inquiryId }
        });

        if (!inquiry) {
            throw new BadRequestException(`問い合わせが見つかりません: ${inquiryId}`);
        }

        const currentStatus = inquiry.status;

        // 状態遷移の妥当性を検証
        if (!this.validateStatusTransition(currentStatus, newStatus)) {
            throw new BadRequestException(
                `無効な状態遷移です: ${currentStatus} → ${newStatus}`
            );
        }

        // 状態変更アクションを取得
        const action = STATUS_CHANGE_ACTIONS[newStatus];

        // コメント必須チェック
        if (action.requireComment && !comment) {
            throw new BadRequestException(
                `状態「${newStatus}」への変更にはコメントが必要です`
            );
        }

        try {
            // 更新データを準備
            const updateData: Partial<Inquiry> = {
                status: newStatus,
                ...action.updateFields
            };

            // resolvedAtの特別処理
            if (newStatus === 'resolved' && !inquiry.resolvedAt) {
                updateData.resolvedAt = new Date();
            }

            // closedAtの特別処理
            if (newStatus === 'closed') {
                updateData.closedAt = new Date();
                // 解決日時が未設定の場合は同時に設定
                if (!inquiry.resolvedAt) {
                    updateData.resolvedAt = new Date();
                }
            }

            // 再オープン時の処理
            if ((currentStatus === 'resolved' || currentStatus === 'closed') &&
                newStatus === 'in_progress') {
                updateData.resolvedAt = null;
                updateData.closedAt = null;
            }

            // 問い合わせを更新
            await this.inquiryRepository.update(inquiryId, updateData);

            // 状態履歴を記録
            await this.createStatusHistory(
                inquiryId,
                currentStatus,
                newStatus,
                changedBy,
                comment,
                ipAddress
            );

            // 通知が必要な場合の処理（後で実装）
            if (action.notificationRequired) {
                await this.triggerNotification(inquiryId, currentStatus, newStatus);
            }

            // 更新後のデータを取得
            const updatedInquiry = await this.inquiryRepository.findOne({
                where: { id: inquiryId }
            });

            this.logger.log(`状態変更実行完了: ID=${inquiryId}, ${currentStatus} → ${newStatus}`);

            return updatedInquiry!;

        } catch (error) {
            this.logger.error(`状態変更実行エラー: ${error.message}`, error.stack);
            throw new BadRequestException('状態変更の実行に失敗しました');
        }
    }

    /**
     * 利用可能な状態遷移を取得する
     */
    getAvailableTransitions(currentStatus: InquiryStatus): InquiryStatus[] {
        return STATUS_TRANSITIONS[currentStatus] || [];
    }

    /**
     * 状態変更アクションの詳細を取得する
     */
    getStatusChangeAction(status: InquiryStatus): StatusChangeAction {
        return STATUS_CHANGE_ACTIONS[status] || {};
    }

    /**
     * 問い合わせの状態統計を取得する
     */
    async getStatusStatistics(appId?: string): Promise<Record<InquiryStatus, number>> {
        this.logger.log(`状態統計取得開始: appId=${appId}`);

        const queryBuilder = this.inquiryRepository
            .createQueryBuilder('inquiry')
            .select('inquiry.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('inquiry.status');

        if (appId) {
            queryBuilder.where('inquiry.appId = :appId', { appId });
        }

        const results = await queryBuilder.getRawMany();

        // 全ての状態を初期化
        const statistics: Record<InquiryStatus, number> = {
            'new': 0,
            'in_progress': 0,
            'pending': 0,
            'resolved': 0,
            'closed': 0
        };

        // 結果をマッピング
        results.forEach(result => {
            statistics[result.status as InquiryStatus] = parseInt(result.count, 10);
        });

        this.logger.log(`状態統計取得完了: ${JSON.stringify(statistics)}`);

        return statistics;
    }

    /**
     * 状態履歴を作成する
     */
    private async createStatusHistory(
        inquiryId: string,
        oldStatus: InquiryStatus,
        newStatus: InquiryStatus,
        changedBy: string,
        comment?: string,
        ipAddress?: string
    ): Promise<void> {
        const statusHistory = this.statusHistoryRepository.create({
            inquiryId,
            oldStatus,
            newStatus,
            changedBy,
            comment,
            ipAddress,
            metadata: {
                timestamp: new Date().toISOString(),
                source: 'workflow_service'
            }
        });

        await this.statusHistoryRepository.save(statusHistory);
    }

    /**
     * 通知をトリガーする（後で実装）
     */
    private async triggerNotification(
        inquiryId: string,
        oldStatus: InquiryStatus,
        newStatus: InquiryStatus
    ): Promise<void> {
        this.logger.log(`通知トリガー: ID=${inquiryId}, ${oldStatus} → ${newStatus}`);
        // TODO: 通知サービスとの連携を実装
    }

    /**
     * 自動状態遷移のチェック（定期実行用）
     */
    async checkAutoTransitions(): Promise<void> {
        this.logger.log('自動状態遷移チェック開始');

        // 例: 一定期間回答がない問い合わせを「保留」に変更
        const pendingThreshold = new Date();
        pendingThreshold.setHours(pendingThreshold.getHours() - 24); // 24時間前

        const staleInquiries = await this.inquiryRepository
            .createQueryBuilder('inquiry')
            .where('inquiry.status = :status', { status: 'in_progress' })
            .andWhere('inquiry.updatedAt < :threshold', { threshold: pendingThreshold })
            .andWhere('inquiry.firstResponseAt IS NULL')
            .getMany();

        for (const inquiry of staleInquiries) {
            try {
                await this.executeStatusChange(
                    inquiry.id,
                    'pending',
                    'system',
                    '24時間以上回答がないため自動的に保留状態に変更されました'
                );
            } catch (error) {
                this.logger.error(`自動状態遷移エラー: ID=${inquiry.id}, ${error.message}`);
            }
        }

        this.logger.log(`自動状態遷移チェック完了: 処理件数=${staleInquiries.length}`);
    }
}