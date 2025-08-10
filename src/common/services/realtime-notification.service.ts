import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationGateway } from '../gateways/notification.gateway';
import { SlackNotificationService } from './slack-notification.service';
import { TeamsNotificationService } from './teams-notification.service';
import { NotificationRuleEngineService } from './notification-rule-engine.service';
import { NotificationLog } from '../entities/notification-log.entity';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';
import { 
  NotificationRequestDto, 
  WebSocketNotificationDto, 
  NotificationType,
  NotificationPriority 
} from '../dto/notification.dto';
import { Inquiry } from '../entities/inquiry.entity';

/**
 * リアルタイム通知サービス
 * 各種通知チャネルを統合管理する
 */
@Injectable()
export class RealtimeNotificationService {
  private readonly logger = new Logger(RealtimeNotificationService.name);

  constructor(
    private notificationGateway: NotificationGateway,
    private slackNotificationService: SlackNotificationService,
    private teamsNotificationService: TeamsNotificationService,
    private notificationRuleEngine: NotificationRuleEngineService,
    @InjectRepository(NotificationLog)
    private notificationLogRepository: Repository<NotificationLog>,
    @InjectRepository(UserNotificationSettings)
    private userNotificationSettingsRepository: Repository<UserNotificationSettings>,
  ) {}

  /**
   * 通知を送信（全チャネル対応）
   */
  async sendNotification(notification: NotificationRequestDto): Promise<void> {
    this.logger.log(`通知送信開始: ${notification.subject}`);

    // 通知ログを作成
    const log = this.notificationLogRepository.create({
      type: notification.type,
      recipients: notification.recipients,
      subject: notification.subject,
      content: notification.content,
      priority: notification.priority,
      status: 'pending',
      metadata: notification.metadata,
    });

    try {
      await this.notificationLogRepository.save(log);

      // 通知タイプに応じて送信
      switch (notification.type) {
        case NotificationType.WEBSOCKET:
          await this.sendWebSocketNotification(notification);
          break;
        case NotificationType.SLACK:
          await this.slackNotificationService.sendMessage(notification);
          break;
        case NotificationType.TEAMS:
          await this.teamsNotificationService.sendMessage(notification);
          break;
        case NotificationType.EMAIL:
          // メール送信は既存のEmailNotificationServiceで処理
          this.logger.log('メール通知は別サービスで処理されます');
          break;
        default:
          throw new Error(`サポートされていない通知タイプ: ${notification.type}`);
      }

      // 送信成功をログに記録
      log.status = 'sent';
      log.sentAt = new Date();
      await this.notificationLogRepository.save(log);

      this.logger.log(`通知送信完了: ${notification.subject}`);
    } catch (error) {
      // 送信失敗をログに記録
      log.status = 'failed';
      log.errorMessage = error.message;
      await this.notificationLogRepository.save(log);

      this.logger.error(`通知送信失敗: ${notification.subject}`, error);
      throw error;
    }
  }

  /**
   * WebSocket通知を送信
   */
  private async sendWebSocketNotification(notification: NotificationRequestDto): Promise<void> {
    const wsNotification: WebSocketNotificationDto = {
      type: 'notification',
      title: notification.subject,
      message: notification.content,
      data: notification.metadata,
      timestamp: new Date(),
    };

    for (const recipient of notification.recipients) {
      if (recipient === 'all') {
        await this.notificationGateway.sendToAll(wsNotification);
      } else if (recipient === 'admins') {
        await this.notificationGateway.sendToAdmins(wsNotification);
      } else if (recipient.startsWith('room:')) {
        const roomName = recipient.replace('room:', '');
        await this.notificationGateway.sendToRoom(roomName, wsNotification);
      } else {
        // 個別ユーザーに送信
        await this.notificationGateway.sendToUser(recipient, wsNotification);
      }
    }
  }

  /**
   * 複数の通知を一括送信
   */
  async sendBulkNotifications(notifications: NotificationRequestDto[]): Promise<void> {
    this.logger.log(`一括通知送信開始: ${notifications.length}件`);

    const promises = notifications.map(notification => 
      this.sendNotification(notification).catch(error => {
        this.logger.error(`通知送信エラー: ${notification.subject}`, error);
        return error;
      })
    );

    await Promise.allSettled(promises);
    this.logger.log(`一括通知送信完了: ${notifications.length}件`);
  }

  /**
   * 問い合わせ作成時の自動通知
   */
  async notifyInquiryCreated(inquiry: Inquiry): Promise<void> {
    this.logger.log(`問い合わせ作成通知: ${inquiry.id}`);

    // ルールエンジンで自動通知を処理
    await this.notificationRuleEngine.processInquiryCreated(inquiry);

    // リアルタイム通知（WebSocket）
    const wsNotification: WebSocketNotificationDto = {
      type: 'inquiry_created',
      title: '新しい問い合わせが作成されました',
      message: `${inquiry.title}`,
      data: {
        inquiryId: inquiry.id,
        appId: inquiry.appId,
        priority: inquiry.priority,
        category: inquiry.category,
      },
      timestamp: new Date(),
    };

    // 管理者とサポート担当者に通知
    await this.notificationGateway.sendToAdmins(wsNotification);
    await this.notificationGateway.sendToRoom('support', wsNotification);
  }

  /**
   * 状態変更時の自動通知
   */
  async notifyStatusChanged(inquiry: Inquiry, oldStatus: string, newStatus: string): Promise<void> {
    this.logger.log(`状態変更通知: ${inquiry.id} (${oldStatus} -> ${newStatus})`);

    // ルールエンジンで自動通知を処理
    await this.notificationRuleEngine.processStatusChanged(inquiry, oldStatus, newStatus);

    // リアルタイム通知（WebSocket）
    const wsNotification: WebSocketNotificationDto = {
      type: 'status_changed',
      title: '問い合わせの状態が変更されました',
      message: `${inquiry.title} の状態が ${oldStatus} から ${newStatus} に変更されました`,
      data: {
        inquiryId: inquiry.id,
        oldStatus,
        newStatus,
        appId: inquiry.appId,
      },
      timestamp: new Date(),
    };

    // 関係者に通知
    if (inquiry.assignedTo) {
      await this.notificationGateway.sendToUser(inquiry.assignedTo, wsNotification);
    }
    await this.notificationGateway.sendToAdmins(wsNotification);
  }

  /**
   * 回答追加時の自動通知
   */
  async notifyResponseAdded(inquiry: Inquiry, response: any): Promise<void> {
    this.logger.log(`回答追加通知: ${inquiry.id}`);

    // ルールエンジンで自動通知を処理
    await this.notificationRuleEngine.processResponseAdded(inquiry, response);

    // リアルタイム通知（WebSocket）
    const wsNotification: WebSocketNotificationDto = {
      type: 'response_added',
      title: '新しい回答が追加されました',
      message: `${inquiry.title} に回答が追加されました`,
      data: {
        inquiryId: inquiry.id,
        responseId: response.id,
        appId: inquiry.appId,
      },
      timestamp: new Date(),
    };

    // 関係者に通知
    if (inquiry.assignedTo) {
      await this.notificationGateway.sendToUser(inquiry.assignedTo, wsNotification);
    }
    await this.notificationGateway.sendToAdmins(wsNotification);
  }

  /**
   * SLA違反時の緊急通知
   */
  async notifySLAViolation(inquiry: Inquiry, violationType: string): Promise<void> {
    this.logger.log(`SLA違反通知: ${inquiry.id} (${violationType})`);

    // ルールエンジンで自動通知を処理
    await this.notificationRuleEngine.processSLAViolation(inquiry, violationType);

    // 緊急通知（WebSocket）
    const wsNotification: WebSocketNotificationDto = {
      type: 'sla_violation',
      title: 'SLA違反が発生しました',
      message: `${inquiry.title} でSLA違反が発生しました (${violationType})`,
      data: {
        inquiryId: inquiry.id,
        violationType,
        appId: inquiry.appId,
        priority: 'urgent',
      },
      timestamp: new Date(),
    };

    // 管理者に緊急通知
    await this.notificationGateway.sendToAdmins(wsNotification);
    await this.notificationGateway.sendToRoom('managers', wsNotification);
  }

  /**
   * エスカレーション時の通知
   */
  async notifyEscalation(inquiry: Inquiry, reason: string): Promise<void> {
    this.logger.log(`エスカレーション通知: ${inquiry.id} (${reason})`);

    // ルールエンジンで自動通知を処理
    await this.notificationRuleEngine.processEscalation(inquiry, reason);

    // エスカレーション通知（WebSocket）
    const wsNotification: WebSocketNotificationDto = {
      type: 'escalation',
      title: '問い合わせがエスカレーションされました',
      message: `${inquiry.title} がエスカレーションされました (${reason})`,
      data: {
        inquiryId: inquiry.id,
        reason,
        appId: inquiry.appId,
        priority: 'high',
      },
      timestamp: new Date(),
    };

    // 管理者とマネージャーに通知
    await this.notificationGateway.sendToAdmins(wsNotification);
    await this.notificationGateway.sendToRoom('managers', wsNotification);
  }

  /**
   * ユーザーの通知設定に基づいて通知チャネルを決定
   */
  async getEnabledNotificationChannels(userId: string): Promise<NotificationType[]> {
    const settings = await this.notificationRuleEngine.getUserNotificationSettings(userId);
    const channels: NotificationType[] = [];

    if (settings.emailEnabled) {
      channels.push(NotificationType.EMAIL);
    }
    if (settings.slackEnabled) {
      channels.push(NotificationType.SLACK);
    }
    if (settings.teamsEnabled) {
      channels.push(NotificationType.TEAMS);
    }
    if (settings.websocketEnabled) {
      channels.push(NotificationType.WEBSOCKET);
    }

    return channels;
  }

  /**
   * 通知統計を取得
   */
  async getNotificationStats(startDate: Date, endDate: Date) {
    return this.notificationRuleEngine.getNotificationStats(startDate, endDate);
  }

  /**
   * 接続中のユーザー数を取得
   */
  getConnectedUsersCount(): number {
    return this.notificationGateway.getConnectedUsersCount();
  }

  /**
   * ユーザーのオンライン状態を確認
   */
  isUserOnline(userId: string): boolean {
    return this.notificationGateway.isUserOnline(userId);
  }

  /**
   * システム通知を送信（メンテナンス情報など）
   */
  async sendSystemNotification(title: string, message: string, priority: NotificationPriority = NotificationPriority.MEDIUM): Promise<void> {
    const wsNotification: WebSocketNotificationDto = {
      type: 'system',
      title,
      message,
      data: { priority },
      timestamp: new Date(),
    };

    await this.notificationGateway.sendToAll(wsNotification);
    this.logger.log(`システム通知を送信: ${title}`);
  }

  /**
   * 特定のロールのユーザーに通知を送信
   */
  async sendToRoles(roles: string[], notification: any): Promise<void> {
    for (const role of roles) {
      await this.notificationGateway.sendToRoom(role, notification);
    }
    this.logger.log(`ロール ${roles.join(', ')} に通知を送信: ${notification.title || notification.subject}`);
  }
}