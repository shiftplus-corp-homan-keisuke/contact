/**
 * ワークフローサービス
 * 要件: 2.2, 2.3 (状態管理とワークフロー機能)
 */

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';
import { User } from '../../modules/users/entities/user.entity';
import { UserRepository } from '../../modules/users/repositories/user.repository';
import { InquiryStatus } from '../types/inquiry.types';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  // 状態遷移ルール定義
  private readonly statusTransitions: Record<InquiryStatus, InquiryStatus[]> = {
    [InquiryStatus.NEW]: [InquiryStatus.IN_PROGRESS, InquiryStatus.CLOSED],
    [InquiryStatus.IN_PROGRESS]: [InquiryStatus.PENDING, InquiryStatus.RESOLVED, InquiryStatus.CLOSED],
    [InquiryStatus.PENDING]: [InquiryStatus.IN_PROGRESS, InquiryStatus.RESOLVED, InquiryStatus.CLOSED],
    [InquiryStatus.RESOLVED]: [InquiryStatus.CLOSED, InquiryStatus.IN_PROGRESS],
    [InquiryStatus.CLOSED]: [], // クローズ状態からは遷移不可（管理者のみ再オープン可能）
  };

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @InjectRepository(InquiryStatusHistory)
    private readonly statusHistoryRepository: Repository<InquiryStatusHistory>,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 問い合わせの状態を更新する
   * 要件: 2.2 (問い合わせ状態の管理)
   */
  async updateInquiryStatus(
    inquiryId: string,
    newStatus: InquiryStatus,
    userId: string,
    comment?: string
  ): Promise<Inquiry> {
    this.logger.log(`状態更新開始: 問い合わせID=${inquiryId}, 新状態=${newStatus}, ユーザーID=${userId}`);

    // 問い合わせの存在確認
    const inquiry = await this.inquiryRepository.findOne({
      where: { id: inquiryId },
      relations: ['application', 'assignedUser'],
    });

    if (!inquiry) {
      throw new NotFoundException('指定された問い合わせが見つかりません');
    }

    // ユーザーの存在確認
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new BadRequestException('指定されたユーザーが見つかりません');
    }

    // 状態遷移の妥当性チェック
    if (!this.isValidStatusTransition(inquiry.status, newStatus)) {
      throw new BadRequestException(
        `状態「${inquiry.status}」から「${newStatus}」への遷移は許可されていません`
      );
    }

    const oldStatus = inquiry.status;

    // 状態履歴を記録
    await this.recordStatusHistory(inquiryId, oldStatus, newStatus, userId, comment);

    // 問い合わせの状態を更新
    inquiry.status = newStatus;
    const updatedInquiry = await this.inquiryRepository.save(inquiry);

    this.logger.log(`状態更新完了: 問い合わせID=${inquiryId}, ${oldStatus} → ${newStatus}`);

    // 状態変更通知
    await this.notifyStatusChange(updatedInquiry, oldStatus, newStatus, user);

    return updatedInquiry;
  }

  /**
   * 問い合わせの状態履歴を取得する
   * 要件: 2.3 (状態変更履歴の記録機能)
   */
  async getInquiryStatusHistory(inquiryId: string): Promise<InquiryStatusHistory[]> {
    this.logger.log(`状態履歴取得: 問い合わせID=${inquiryId}`);

    // 問い合わせの存在確認
    const inquiry = await this.inquiryRepository.findOne({
      where: { id: inquiryId }
    });

    if (!inquiry) {
      throw new NotFoundException('指定された問い合わせが見つかりません');
    }

    const history = await this.statusHistoryRepository.find({
      where: { inquiryId },
      relations: ['changedByUser'],
      order: { changedAt: 'DESC' }, // 新しい順
    });

    return history;
  }

  /**
   * 状態遷移の妥当性をチェックする
   * 要件: 2.2 (状態管理ルール)
   */
  private isValidStatusTransition(currentStatus: InquiryStatus, newStatus: InquiryStatus): boolean {
    // 同じ状態への遷移は許可しない
    if (currentStatus === newStatus) {
      return false;
    }

    // 許可された遷移かチェック
    const allowedTransitions = this.statusTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * 状態履歴を記録する
   * 要件: 2.3 (状態変更履歴の記録機能)
   */
  private async recordStatusHistory(
    inquiryId: string,
    oldStatus: InquiryStatus,
    newStatus: InquiryStatus,
    changedBy: string,
    comment?: string
  ): Promise<InquiryStatusHistory> {
    this.logger.log(`状態履歴記録: 問い合わせID=${inquiryId}, ${oldStatus} → ${newStatus}`);

    const history = this.statusHistoryRepository.create({
      inquiryId,
      oldStatus,
      newStatus,
      changedBy,
      comment,
    });

    const savedHistory = await this.statusHistoryRepository.save(history);
    
    this.logger.log(`状態履歴記録完了: ID=${savedHistory.id}`);

    return savedHistory;
  }

  /**
   * 状態変更通知を送信する
   * 要件: 2.2 (状態変更時の通知機能)
   */
  private async notifyStatusChange(
    inquiry: Inquiry,
    oldStatus: InquiryStatus,
    newStatus: InquiryStatus,
    changedBy: User
  ): Promise<void> {
    try {
      this.logger.log(`状態変更通知送信: 問い合わせID=${inquiry.id}, ${oldStatus} → ${newStatus}`);
      
      // 実際の通知処理は通知サービスで実装予定
      // ここでは基本的なログ出力のみ
      const statusMessages = {
        [InquiryStatus.NEW]: '新規',
        [InquiryStatus.IN_PROGRESS]: '対応中',
        [InquiryStatus.PENDING]: '保留',
        [InquiryStatus.RESOLVED]: '解決済み',
        [InquiryStatus.CLOSED]: 'クローズ',
      };

      const message = `問い合わせ「${inquiry.title}」の状態が「${statusMessages[oldStatus]}」から「${statusMessages[newStatus]}」に変更されました。変更者: ${changedBy.name}`;
      
      this.logger.log(`通知メッセージ: ${message}`);
      
      // 通知対象者の決定
      const notificationTargets = await this.determineNotificationTargets(inquiry, newStatus);
      this.logger.log(`通知対象者: ${notificationTargets.map(t => t.email).join(', ')}`);
      
    } catch (error) {
      this.logger.error(`状態変更通知エラー: ${error.message}`, error.stack);
      // 通知エラーは状態変更を阻害しない
    }
  }

  /**
   * 通知対象者を決定する
   */
  private async determineNotificationTargets(inquiry: Inquiry, newStatus: InquiryStatus): Promise<User[]> {
    const targets: User[] = [];

    // 担当者がいる場合は担当者に通知
    if (inquiry.assignedUser) {
      targets.push(inquiry.assignedUser);
    }

    // 特定の状態変更時は管理者にも通知
    if (newStatus === InquiryStatus.RESOLVED || newStatus === InquiryStatus.CLOSED) {
      // 管理者ユーザーを取得（実装は簡略化）
      // 実際の実装では役割ベースで管理者を取得
    }

    return targets;
  }

  /**
   * 利用可能な状態遷移を取得する
   */
  getAvailableStatusTransitions(currentStatus: InquiryStatus): InquiryStatus[] {
    return this.statusTransitions[currentStatus] || [];
  }

  /**
   * 状態別の問い合わせ統計を取得する
   */
  async getInquiryStatusStats(appId?: string): Promise<Record<InquiryStatus, number>> {
    this.logger.log(`状態別統計取得: アプリID=${appId || 'all'}`);

    const whereCondition = appId ? { appId } : {};

    const stats: Record<InquiryStatus, number> = {
      [InquiryStatus.NEW]: 0,
      [InquiryStatus.IN_PROGRESS]: 0,
      [InquiryStatus.PENDING]: 0,
      [InquiryStatus.RESOLVED]: 0,
      [InquiryStatus.CLOSED]: 0,
    };

    // 各状態の件数を取得
    for (const status of Object.values(InquiryStatus)) {
      stats[status] = await this.inquiryRepository.count({
        where: { ...whereCondition, status }
      });
    }

    return stats;
  }

  /**
   * 長期間放置されている問い合わせを取得する
   */
  async getStaleInquiries(daysThreshold: number = 7): Promise<Inquiry[]> {
    this.logger.log(`放置問い合わせ取得: ${daysThreshold}日以上`);

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const staleInquiries = await this.inquiryRepository
      .createQueryBuilder('inquiry')
      .leftJoinAndSelect('inquiry.application', 'application')
      .leftJoinAndSelect('inquiry.assignedUser', 'assignedUser')
      .where('inquiry.status IN (:...statuses)', { 
        statuses: [InquiryStatus.NEW, InquiryStatus.IN_PROGRESS, InquiryStatus.PENDING] 
      })
      .andWhere('inquiry.updatedAt < :thresholdDate', { thresholdDate })
      .orderBy('inquiry.updatedAt', 'ASC')
      .getMany();

    return staleInquiries;
  }

  /**
   * 自動状態遷移を実行する（バッチ処理用）
   */
  async executeAutoStatusTransitions(): Promise<void> {
    this.logger.log('自動状態遷移実行開始');

    try {
      // 解決済みから一定期間経過した問い合わせを自動クローズ
      await this.autoCloseResolvedInquiries();

      // その他の自動遷移ルールを実装可能
      
      this.logger.log('自動状態遷移実行完了');
    } catch (error) {
      this.logger.error(`自動状態遷移エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 解決済み問い合わせの自動クローズ
   */
  private async autoCloseResolvedInquiries(daysThreshold: number = 3): Promise<void> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const resolvedInquiries = await this.inquiryRepository.find({
      where: {
        status: InquiryStatus.RESOLVED,
      },
    });

    // 最後の状態変更から指定日数経過した問い合わせを取得
    const inquiriesToClose = [];
    for (const inquiry of resolvedInquiries) {
      const lastStatusChange = await this.statusHistoryRepository.findOne({
        where: { inquiryId: inquiry.id, newStatus: InquiryStatus.RESOLVED },
        order: { changedAt: 'DESC' },
      });

      if (lastStatusChange && lastStatusChange.changedAt < thresholdDate) {
        inquiriesToClose.push(inquiry);
      }
    }

    // 自動クローズ実行
    for (const inquiry of inquiriesToClose) {
      try {
        await this.updateInquiryStatus(
          inquiry.id,
          InquiryStatus.CLOSED,
          'system', // システムユーザーID
          '自動クローズ: 解決済みから3日経過'
        );
        this.logger.log(`自動クローズ実行: 問い合わせID=${inquiry.id}`);
      } catch (error) {
        this.logger.error(`自動クローズエラー: 問い合わせID=${inquiry.id}, ${error.message}`);
      }
    }
  }
}