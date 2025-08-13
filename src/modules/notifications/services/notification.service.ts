/**
 * 通知サービス
 * 要件: 1.5 (登録完了通知), 2.2, 2.3 (状態変更通知)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { 
  NotificationRequest, 
  NotificationRule, 
  NotificationSettings,
  EmailNotificationData,
  NotificationChannel,
  NotificationPriority 
} from '../../common/types/notification.types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly emailTransporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // メール送信設定
    this.emailTransporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  /**
   * 通知送信
   * 要件: 1.5 (登録完了通知)
   */
  async sendNotification(notification: NotificationRequest): Promise<void> {
    try {
      this.logger.log(`通知送信開始: type=${notification.type}, recipients=${notification.recipients.length}`);

      switch (notification.type) {
        case 'email':
          await this.sendEmailNotification(notification);
          break;
        case 'slack':
          await this.sendSlackNotification(notification);
          break;
        case 'teams':
          await this.sendTeamsNotification(notification);
          break;
        case 'webhook':
          await this.sendWebhookNotification(notification);
          break;
        default:
          throw new Error(`サポートされていない通知タイプ: ${notification.type}`);
      }

      this.logger.log(`通知送信完了: type=${notification.type}`);
    } catch (error) {
      this.logger.error(`通知送信エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 一括通知送信
   */
  async sendBulkNotifications(notifications: NotificationRequest[]): Promise<void> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(`一括通知送信で${failed.length}件が失敗しました`);
    }

    this.logger.log(`一括通知送信完了: 成功=${results.length - failed.length}, 失敗=${failed.length}`);
  }

  /**
   * メール通知送信
   */
  private async sendEmailNotification(notification: NotificationRequest): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM', 'noreply@example.com'),
      to: notification.recipients.join(', '),
      subject: notification.subject,
      html: this.generateEmailHtml(notification),
      priority: this.getEmailPriority(notification.priority),
    };

    await this.emailTransporter.sendMail(mailOptions);
    this.logger.log(`メール送信完了: to=${notification.recipients.join(', ')}`);
  }

  /**
   * Slack通知送信
   */
  private async sendSlackNotification(notification: NotificationRequest): Promise<void> {
    const webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new Error('Slack Webhook URLが設定されていません');
    }

    const payload = {
      text: notification.subject,
      attachments: [
        {
          color: this.getSlackColor(notification.priority),
          text: notification.content,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack通知送信失敗: ${response.statusText}`);
    }

    this.logger.log('Slack通知送信完了');
  }

  /**
   * Teams通知送信
   */
  private async sendTeamsNotification(notification: NotificationRequest): Promise<void> {
    const webhookUrl = this.configService.get<string>('TEAMS_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new Error('Teams Webhook URLが設定されていません');
    }

    const payload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: this.getTeamsColor(notification.priority),
      summary: notification.subject,
      sections: [
        {
          activityTitle: notification.subject,
          activityText: notification.content,
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Teams通知送信失敗: ${response.statusText}`);
    }

    this.logger.log('Teams通知送信完了');
  }

  /**
   * Webhook通知送信
   */
  private async sendWebhookNotification(notification: NotificationRequest): Promise<void> {
    const webhookUrl = notification.metadata?.webhookUrl;
    if (!webhookUrl) {
      throw new Error('Webhook URLが指定されていません');
    }

    const payload = {
      type: 'notification',
      subject: notification.subject,
      content: notification.content,
      priority: notification.priority,
      timestamp: new Date().toISOString(),
      metadata: notification.metadata,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook通知送信失敗: ${response.statusText}`);
    }

    this.logger.log(`Webhook通知送信完了: ${webhookUrl}`);
  }

  /**
   * 問い合わせ作成通知
   * 要件: 1.5 (登録完了通知)
   */
  async sendInquiryCreatedNotification(inquiryId: string, inquiryTitle: string, appName: string): Promise<void> {
    const notification: NotificationRequest = {
      type: 'email',
      recipients: await this.getNotificationRecipients('inquiry_created'),
      subject: `新しい問い合わせが登録されました - ${appName}`,
      content: `
        <h2>新しい問い合わせが登録されました</h2>
        <p><strong>アプリケーション:</strong> ${appName}</p>
        <p><strong>タイトル:</strong> ${inquiryTitle}</p>
        <p><strong>問い合わせID:</strong> ${inquiryId}</p>
        <p>管理画面で詳細を確認してください。</p>
      `,
      priority: 'medium',
      metadata: {
        inquiryId,
        type: 'inquiry_created',
      },
    };

    await this.sendNotification(notification);
  }

  /**
   * 問い合わせ状態変更通知
   * 要件: 2.2, 2.3 (状態変更通知)
   */
  async sendInquiryStatusChangedNotification(
    inquiryId: string,
    inquiryTitle: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string
  ): Promise<void> {
    const notification: NotificationRequest = {
      type: 'email',
      recipients: await this.getNotificationRecipients('status_changed'),
      subject: `問い合わせの状態が変更されました - ${inquiryTitle}`,
      content: `
        <h2>問い合わせの状態が変更されました</h2>
        <p><strong>タイトル:</strong> ${inquiryTitle}</p>
        <p><strong>問い合わせID:</strong> ${inquiryId}</p>
        <p><strong>変更前:</strong> ${oldStatus}</p>
        <p><strong>変更後:</strong> ${newStatus}</p>
        <p><strong>変更者:</strong> ${changedBy}</p>
        <p>管理画面で詳細を確認してください。</p>
      `,
      priority: 'medium',
      metadata: {
        inquiryId,
        oldStatus,
        newStatus,
        type: 'status_changed',
      },
    };

    await this.sendNotification(notification);
  }

  /**
   * 回答追加通知
   * 要件: 2.1 (回答追加通知)
   */
  async sendResponseAddedNotification(
    inquiryId: string,
    inquiryTitle: string,
    responseContent: string,
    respondedBy: string
  ): Promise<void> {
    const notification: NotificationRequest = {
      type: 'email',
      recipients: await this.getNotificationRecipients('response_added'),
      subject: `問い合わせに回答が追加されました - ${inquiryTitle}`,
      content: `
        <h2>問い合わせに回答が追加されました</h2>
        <p><strong>タイトル:</strong> ${inquiryTitle}</p>
        <p><strong>問い合わせID:</strong> ${inquiryId}</p>
        <p><strong>回答者:</strong> ${respondedBy}</p>
        <p><strong>回答内容:</strong></p>
        <div style="border-left: 3px solid #007bff; padding-left: 15px; margin: 10px 0;">
          ${responseContent.substring(0, 200)}${responseContent.length > 200 ? '...' : ''}
        </div>
        <p>管理画面で詳細を確認してください。</p>
      `,
      priority: 'medium',
      metadata: {
        inquiryId,
        type: 'response_added',
      },
    };

    await this.sendNotification(notification);
  }

  /**
   * HTMLメール生成
   */
  private generateEmailHtml(notification: NotificationRequest): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .priority-high { border-left: 5px solid #dc3545; }
          .priority-medium { border-left: 5px solid #ffc107; }
          .priority-low { border-left: 5px solid #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>問い合わせ管理システム</h1>
          </div>
          <div class="content priority-${notification.priority}">
            ${notification.content}
          </div>
          <div class="footer">
            <p>このメールは問い合わせ管理システムから自動送信されています。</p>
            <p>返信は不要です。</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 通知受信者取得
   */
  private async getNotificationRecipients(eventType: string): Promise<string[]> {
    // 実際の実装では、データベースから通知設定を取得
    // ここでは簡単な例として固定値を返す
    const defaultRecipients = this.configService.get<string>('DEFAULT_NOTIFICATION_RECIPIENTS', '').split(',').filter(email => email.trim());
    
    return defaultRecipients.length > 0 ? defaultRecipients : ['admin@example.com'];
  }

  /**
   * メール優先度取得
   */
  private getEmailPriority(priority: NotificationPriority): 'high' | 'normal' | 'low' {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }

  /**
   * Slack色取得
   */
  private getSlackColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'urgent':
        return 'danger';
      case 'high':
        return 'warning';
      case 'low':
        return 'good';
      default:
        return '#007bff';
    }
  }

  /**
   * Teams色取得
   */
  private getTeamsColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'urgent':
        return 'FF0000';
      case 'high':
        return 'FFA500';
      case 'low':
        return '00FF00';
      default:
        return '007bff';
    }
  }
}