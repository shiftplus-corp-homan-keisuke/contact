import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationRule } from '../entities/notification-rule.entity';
import { NotificationLog } from '../entities/notification-log.entity';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';
import { NotificationRequestDto, NotificationTrigger, NotificationType } from '../dto/notification.dto';
import { Inquiry } from '../entities/inquiry.entity';
import { User } from '../../modules/users/entities/user.entity';

/**
 * 通知ルールエンジンサービス
 * 条件に基づいて通知を自動実行する
 */
@Injectable()
export class NotificationRuleEngineService {
  private readonly logger = new Logger(NotificationRuleEngineService.name);

  constructor(
    @InjectRepository(NotificationRule)
    private notificationRuleRepository: Repository<NotificationRule>,
    @InjectRepository(NotificationLog)
    private notificationLogRepository: Repository<NotificationLog>,
    @InjectRepository(UserNotificationSettings)
    private userNotificationSettingsRepository: Repository<UserNotificationSettings>,
  ) {}

  /**
   * 問い合わせ作成時の通知処理
   */
  async processInquiryCreated(inquiry: Inquiry): Promise<void> {
    this.logger.log(`問い合わせ作成通知を処理中: ${inquiry.id}`);

    const rules = await this.getActiveRulesByTrigger(NotificationTrigger.INQUIRY_CREATED);
    
    for (const rule of rules) {
      if (await this.evaluateConditions(rule.conditions, { inquiry })) {
        await this.executeActions(rule, { inquiry });
      }
    }
  }

  /**
   * 状態変更時の通知処理
   */
  async processStatusChanged(inquiry: Inquiry, oldStatus: string, newStatus: string): Promise<void> {
    this.logger.log(`状態変更通知を処理中: ${inquiry.id} (${oldStatus} -> ${newStatus})`);

    const rules = await this.getActiveRulesByTrigger(NotificationTrigger.STATUS_CHANGED);
    
    for (const rule of rules) {
      if (await this.evaluateConditions(rule.conditions, { inquiry, oldStatus, newStatus })) {
        await this.executeActions(rule, { inquiry, oldStatus, newStatus });
      }
    }
  }

  /**
   * SLA違反時の通知処理
   */
  async processSLAViolation(inquiry: Inquiry, violationType: string): Promise<void> {
    this.logger.log(`SLA違反通知を処理中: ${inquiry.id} (${violationType})`);

    const rules = await this.getActiveRulesByTrigger(NotificationTrigger.SLA_VIOLATION);
    
    for (const rule of rules) {
      if (await this.evaluateConditions(rule.conditions, { inquiry, violationType })) {
        await this.executeActions(rule, { inquiry, violationType });
      }
    }
  }

  /**
   * エスカレーション時の通知処理
   */
  async processEscalation(inquiry: Inquiry, reason: string): Promise<void> {
    this.logger.log(`エスカレーション通知を処理中: ${inquiry.id} (${reason})`);

    const rules = await this.getActiveRulesByTrigger(NotificationTrigger.ESCALATION);
    
    for (const rule of rules) {
      if (await this.evaluateConditions(rule.conditions, { inquiry, reason })) {
        await this.executeActions(rule, { inquiry, reason });
      }
    }
  }

  /**
   * 回答追加時の通知処理
   */
  async processResponseAdded(inquiry: Inquiry, response: any): Promise<void> {
    this.logger.log(`回答追加通知を処理中: ${inquiry.id}`);

    const rules = await this.getActiveRulesByTrigger(NotificationTrigger.RESPONSE_ADDED);
    
    for (const rule of rules) {
      if (await this.evaluateConditions(rule.conditions, { inquiry, response })) {
        await this.executeActions(rule, { inquiry, response });
      }
    }
  }

  /**
   * 指定されたトリガーのアクティブなルールを取得
   */
  private async getActiveRulesByTrigger(trigger: NotificationTrigger): Promise<NotificationRule[]> {
    return this.notificationRuleRepository.find({
      where: {
        trigger: trigger,
        isActive: true,
      },
    });
  }

  /**
   * 条件を評価
   */
  private async evaluateConditions(conditions: Record<string, any>, context: Record<string, any>): Promise<boolean> {
    try {
      // アプリケーション条件
      if (conditions.appIds && conditions.appIds.length > 0) {
        if (!conditions.appIds.includes(context.inquiry?.appId)) {
          return false;
        }
      }

      // 優先度条件
      if (conditions.priorities && conditions.priorities.length > 0) {
        if (!conditions.priorities.includes(context.inquiry?.priority)) {
          return false;
        }
      }

      // カテゴリ条件
      if (conditions.categories && conditions.categories.length > 0) {
        if (!conditions.categories.includes(context.inquiry?.category)) {
          return false;
        }
      }

      // 状態条件（状態変更時）
      if (conditions.fromStatuses && conditions.fromStatuses.length > 0) {
        if (!conditions.fromStatuses.includes(context.oldStatus)) {
          return false;
        }
      }

      if (conditions.toStatuses && conditions.toStatuses.length > 0) {
        if (!conditions.toStatuses.includes(context.newStatus)) {
          return false;
        }
      }

      // 時間条件（営業時間内/外など）
      if (conditions.timeConditions) {
        const now = new Date();
        const currentHour = now.getHours();
        
        if (conditions.timeConditions.businessHoursOnly) {
          if (currentHour < 9 || currentHour >= 18) {
            return false;
          }
        }
      }

      // カスタム条件の評価
      if (conditions.customConditions) {
        for (const customCondition of conditions.customConditions) {
          if (!await this.evaluateCustomCondition(customCondition, context)) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error('条件評価エラー:', error);
      return false;
    }
  }

  /**
   * カスタム条件を評価
   */
  private async evaluateCustomCondition(condition: any, context: Record<string, any>): Promise<boolean> {
    // カスタム条件の実装
    // 例: 特定の文字列が含まれているかチェック
    if (condition.type === 'contains_text') {
      const text = context.inquiry?.content || '';
      return text.toLowerCase().includes(condition.value.toLowerCase());
    }

    // 例: 担当者が設定されているかチェック
    if (condition.type === 'has_assignee') {
      return !!context.inquiry?.assignedTo;
    }

    // 例: 作成から一定時間経過しているかチェック
    if (condition.type === 'time_elapsed') {
      const createdAt = new Date(context.inquiry?.createdAt);
      const now = new Date();
      const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      return elapsedMinutes >= condition.minutes;
    }

    return true;
  }

  /**
   * アクションを実行
   */
  private async executeActions(rule: NotificationRule, context: Record<string, any>): Promise<void> {
    try {
      for (const action of rule.actions.notifications || []) {
        const notification = await this.buildNotification(action, context);
        
        // 通知ログを作成
        const log = this.notificationLogRepository.create({
          type: action.type,
          recipients: action.recipients,
          subject: notification.subject,
          content: notification.content,
          priority: notification.priority,
          status: 'pending',
          metadata: notification.metadata,
          inquiryId: context.inquiry?.id,
          ruleId: rule.id,
        });

        await this.notificationLogRepository.save(log);

        // 実際の通知送信は別のサービスで処理
        // ここでは通知リクエストを作成するだけ
        this.logger.log(`通知アクションを実行: ${action.type} - ${notification.subject}`);
      }
    } catch (error) {
      this.logger.error('アクション実行エラー:', error);
    }
  }

  /**
   * 通知メッセージを構築
   */
  private async buildNotification(action: any, context: Record<string, any>): Promise<NotificationRequestDto> {
    const inquiry = context.inquiry;
    
    // テンプレート変数を置換
    const subject = this.replaceTemplateVariables(action.subject, context);
    const content = this.replaceTemplateVariables(action.content, context);

    return {
      type: action.type as NotificationType,
      recipients: action.recipients,
      subject,
      content,
      priority: action.priority || 'medium',
      metadata: {
        inquiryId: inquiry?.id,
        appId: inquiry?.appId,
        appName: inquiry?.app?.name,
        category: inquiry?.category,
        priority: inquiry?.priority,
        status: inquiry?.status,
        ...context,
      },
    };
  }

  /**
   * テンプレート変数を置換
   */
  private replaceTemplateVariables(template: string, context: Record<string, any>): string {
    let result = template;
    
    // 問い合わせ関連の変数
    if (context.inquiry) {
      result = result.replace(/\{\{inquiry\.id\}\}/g, context.inquiry.id || '');
      result = result.replace(/\{\{inquiry\.title\}\}/g, context.inquiry.title || '');
      result = result.replace(/\{\{inquiry\.content\}\}/g, context.inquiry.content || '');
      result = result.replace(/\{\{inquiry\.status\}\}/g, context.inquiry.status || '');
      result = result.replace(/\{\{inquiry\.priority\}\}/g, context.inquiry.priority || '');
      result = result.replace(/\{\{inquiry\.category\}\}/g, context.inquiry.category || '');
      result = result.replace(/\{\{inquiry\.customerName\}\}/g, context.inquiry.customerName || '');
      result = result.replace(/\{\{inquiry\.customerEmail\}\}/g, context.inquiry.customerEmail || '');
    }

    // 状態変更関連の変数
    if (context.oldStatus) {
      result = result.replace(/\{\{oldStatus\}\}/g, context.oldStatus);
    }
    if (context.newStatus) {
      result = result.replace(/\{\{newStatus\}\}/g, context.newStatus);
    }

    // その他の変数
    if (context.reason) {
      result = result.replace(/\{\{reason\}\}/g, context.reason);
    }
    if (context.violationType) {
      result = result.replace(/\{\{violationType\}\}/g, context.violationType);
    }

    // 日時変数
    const now = new Date();
    result = result.replace(/\{\{currentDate\}\}/g, now.toLocaleDateString('ja-JP'));
    result = result.replace(/\{\{currentTime\}\}/g, now.toLocaleTimeString('ja-JP'));

    return result;
  }

  /**
   * ユーザーの通知設定を取得
   */
  async getUserNotificationSettings(userId: string): Promise<UserNotificationSettings> {
    let settings = await this.userNotificationSettingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // デフォルト設定を作成
      settings = this.userNotificationSettingsRepository.create({
        userId,
        emailEnabled: true,
        slackEnabled: false,
        teamsEnabled: false,
        websocketEnabled: true,
        preferences: {},
      });
      await this.userNotificationSettingsRepository.save(settings);
    }

    return settings;
  }

  /**
   * 通知ログの統計を取得
   */
  async getNotificationStats(startDate: Date, endDate: Date) {
    const stats = await this.notificationLogRepository
      .createQueryBuilder('log')
      .select('log.type', 'type')
      .addSelect('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('log.type, log.status')
      .getRawMany();

    return stats;
  }
}