import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escalation } from '../entities/escalation.entity';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { InquiriesService } from '../../inquiries/services/inquiries.service';

/**
 * エスカレーションサービス
 * 問い合わせのエスカレーション処理を担当
 */
@Injectable()
export class EscalationService {
    private readonly logger = new Logger(EscalationService.name);

    constructor(
        @InjectRepository(Escalation)
        private readonly escalationRepository: Repository<Escalation>,
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly notificationsService: NotificationsService,
        private readonly inquiriesService: InquiriesService,
    ) { }

    /**
     * 手動エスカレーション
     */
    async escalateInquiry(
        inquiryId: string,
        escalatedTo: string,
        escalatedBy: string,
        reason: string,
        comment?: string,
    ): Promise<Escalation> {
        const inquiry = await this.inquiryRepository.findOne({
            where: { id: inquiryId },
            relations: ['assignedUser'],
        });

        if (!inquiry) {
            throw new NotFoundException('問い合わせが見つかりません');
        }

        const toUser = await this.userRepository.findOne({
            where: { id: escalatedTo },
        });

        if (!toUser) {
            throw new NotFoundException('エスカレーション先のユーザーが見つかりません');
        }

        // 現在のエスカレーションレベルを取得
        const currentLevel = await this.getCurrentEscalationLevel(inquiryId);

        const escalation = this.escalationRepository.create({
            inquiryId,
            escalatedFrom: inquiry.assignedTo,
            escalatedTo,
            escalatedBy,
            escalationReason: 'manual',
            escalationLevel: currentLevel + 1,
            comment,
            isAutomatic: false,
        });

        const savedEscalation = await this.escalationRepository.save(escalation);

        // 問い合わせの担当者を更新
        await this.inquiriesService.updateInquiry(inquiryId, { assignedTo: escalatedTo });

        // エスカレーション通知を送信
        await this.notificationsService.sendEscalationNotification(savedEscalation);

        this.logger.log(`問い合わせ ${inquiryId} を ${escalatedTo} にエスカレーションしました`);

        return await this.escalationRepository.findOne({
            where: { id: savedEscalation.id },
            relations: ['inquiry', 'fromUser', 'toUser', 'escalator'],
        });
    }

    /**
     * 自動エスカレーション
     */
    async autoEscalateInquiry(inquiryId: string, reason: string): Promise<Escalation> {
        const inquiry = await this.inquiryRepository.findOne({
            where: { id: inquiryId },
            relations: ['assignedUser', 'application'],
        });

        if (!inquiry) {
            throw new NotFoundException('問い合わせが見つかりません');
        }

        // エスカレーション先を決定
        const escalationTarget = await this.findEscalationTarget(inquiry);

        if (!escalationTarget) {
            this.logger.warn(`問い合わせ ${inquiryId} のエスカレーション先が見つかりません`);
            return null;
        }

        // 現在のエスカレーションレベルを取得
        const currentLevel = await this.getCurrentEscalationLevel(inquiryId);

        const escalation = this.escalationRepository.create({
            inquiryId,
            escalatedFrom: inquiry.assignedTo,
            escalatedTo: escalationTarget.id,
            escalationReason: 'sla_violation',
            escalationLevel: currentLevel + 1,
            comment: reason,
            isAutomatic: true,
        });

        const savedEscalation = await this.escalationRepository.save(escalation);

        // 問い合わせの担当者を更新
        await this.inquiriesService.updateInquiry(inquiryId, { assignedTo: escalationTarget.id });

        // 優先度を上げる
        if (inquiry.priority !== 'urgent') {
            const newPriority = this.getEscalatedPriority(inquiry.priority);
            await this.inquiriesService.updateInquiry(inquiryId, { priority: newPriority });
        }

        // エスカレーション通知を送信
        await this.notificationsService.sendEscalationNotification(savedEscalation);

        this.logger.log(`問い合わせ ${inquiryId} を自動エスカレーションしました`);

        return await this.escalationRepository.findOne({
            where: { id: savedEscalation.id },
            relations: ['inquiry', 'fromUser', 'toUser'],
        });
    }

    /**
     * エスカレーション履歴を取得
     */
    async getEscalationHistory(inquiryId: string): Promise<Escalation[]> {
        return await this.escalationRepository.find({
            where: { inquiryId },
            relations: ['fromUser', 'toUser', 'escalator'],
            order: { escalatedAt: 'ASC' },
        });
    }

    /**
     * 最新のエスカレーションを取得
     */
    async getLatestEscalation(inquiryId: string): Promise<Escalation | null> {
        return await this.escalationRepository.findOne({
            where: { inquiryId },
            relations: ['fromUser', 'toUser', 'escalator'],
            order: { escalatedAt: 'DESC' },
        });
    }

    /**
     * 現在のエスカレーションレベルを取得
     */
    private async getCurrentEscalationLevel(inquiryId: string): Promise<number> {
        const latestEscalation = await this.getLatestEscalation(inquiryId);
        return latestEscalation ? latestEscalation.escalationLevel : 0;
    }

    /**
     * エスカレーション先を決定
     */
    private async findEscalationTarget(inquiry: Inquiry): Promise<User | null> {
        // 現在の担当者の上司を探す
        if (inquiry.assignedUser) {
            const supervisor = await this.userRepository.findOne({
                where: {
                    // 上司の検索ロジック（実装に応じて調整）
                    role: { name: 'supervisor' },
                },
                relations: ['role'],
            });

            if (supervisor) {
                return supervisor;
            }
        }

        // 管理者を探す
        const admin = await this.userRepository.findOne({
            where: {
                role: { name: 'admin' },
            },
            relations: ['role'],
        });

        return admin;
    }

    /**
     * エスカレーション後の優先度を決定
     */
    private getEscalatedPriority(currentPriority: string): 'low' | 'medium' | 'high' | 'urgent' {
        switch (currentPriority) {
            case 'low':
                return 'medium';
            case 'medium':
                return 'high';
            case 'high':
                return 'urgent';
            default:
                return 'urgent';
        }
    }

    /**
     * エスカレーション統計を取得
     */
    async getEscalationStats(appId?: string, startDate?: Date, endDate?: Date) {
        const queryBuilder = this.escalationRepository
            .createQueryBuilder('escalation')
            .leftJoinAndSelect('escalation.inquiry', 'inquiry');

        if (appId) {
            queryBuilder.andWhere('inquiry.appId = :appId', { appId });
        }

        if (startDate) {
            queryBuilder.andWhere('escalation.escalatedAt >= :startDate', { startDate });
        }

        if (endDate) {
            queryBuilder.andWhere('escalation.escalatedAt <= :endDate', { endDate });
        }

        const escalations = await queryBuilder.getMany();

        return {
            total: escalations.length,
            automatic: escalations.filter(e => e.isAutomatic).length,
            manual: escalations.filter(e => !e.isAutomatic).length,
            byReason: this.groupBy(escalations, 'escalationReason'),
            byLevel: this.groupBy(escalations, 'escalationLevel'),
            averageLevel: escalations.reduce((sum, e) => sum + e.escalationLevel, 0) / escalations.length || 0,
        };
    }

    /**
     * 配列をキーでグループ化
     */
    private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
        return array.reduce((groups, item) => {
            const value = String(item[key]);
            groups[value] = (groups[value] || 0) + 1;
            return groups;
        }, {} as Record<string, number>);
    }

    /**
     * ユーザー別エスカレーション統計
     */
    async getUserEscalationStats(userId: string, startDate?: Date, endDate?: Date) {
        const queryBuilder = this.escalationRepository
            .createQueryBuilder('escalation')
            .leftJoinAndSelect('escalation.inquiry', 'inquiry');

        queryBuilder.andWhere(
            '(escalation.escalatedFrom = :userId OR escalation.escalatedTo = :userId)',
            { userId }
        );

        if (startDate) {
            queryBuilder.andWhere('escalation.escalatedAt >= :startDate', { startDate });
        }

        if (endDate) {
            queryBuilder.andWhere('escalation.escalatedAt <= :endDate', { endDate });
        }

        const escalations = await queryBuilder.getMany();

        const escalatedFrom = escalations.filter(e => e.escalatedFrom === userId);
        const escalatedTo = escalations.filter(e => e.escalatedTo === userId);

        return {
            totalInvolved: escalations.length,
            escalatedFrom: escalatedFrom.length,
            escalatedTo: escalatedTo.length,
            automaticEscalations: escalatedTo.filter(e => e.isAutomatic).length,
            manualEscalations: escalatedTo.filter(e => !e.isAutomatic).length,
        };
    }
}