import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebClient } from '@slack/web-api';
import { NotificationRequestDto } from '../dto/notification.dto';

/**
 * Slack通知サービス
 */
@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);
  private slackClient: WebClient;

  constructor(private configService: ConfigService) {
    const slackToken = this.configService.get<string>('SLACK_BOT_TOKEN');
    if (slackToken) {
      this.slackClient = new WebClient(slackToken);
    } else {
      this.logger.warn('Slack Bot Tokenが設定されていません');
    }
  }

  /**
   * Slackメッセージを送信
   */
  async sendMessage(notification: NotificationRequestDto): Promise<void> {
    if (!this.slackClient) {
      throw new Error('Slack クライアントが初期化されていません');
    }

    try {
      for (const recipient of notification.recipients) {
        await this.slackClient.chat.postMessage({
          channel: recipient,
          text: notification.subject,
          blocks: this.buildMessageBlocks(notification),
        });
      }

      this.logger.log(`Slack通知を送信しました: ${notification.subject}`);
    } catch (error) {
      this.logger.error('Slack通知の送信に失敗しました:', error);
      throw error;
    }
  }

  /**
   * 問い合わせ作成通知用のメッセージブロックを構築
   */
  private buildMessageBlocks(notification: NotificationRequestDto) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: notification.subject,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: notification.content,
        },
      },
    ];

    // 優先度に応じて色を変更
    if (notification.priority === 'urgent' || notification.priority === 'high') {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*優先度:* ${this.getPriorityEmoji(notification.priority)} ${notification.priority.toUpperCase()}`,
        },
      });
    }

    // メタデータがある場合は追加情報を表示
    if (notification.metadata) {
      const { inquiryId, appName, category } = notification.metadata;
      
      if (inquiryId) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*問い合わせID:* ${inquiryId}`,
          },
        });
      }

      if (appName) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*アプリケーション:* ${appName}`,
          },
        });
      }

      if (category) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*カテゴリ:* ${category}`,
          },
        });
      }
    }

    // アクションボタンを追加
    if (notification.metadata?.inquiryId) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '詳細を確認',
            },
            url: `${this.configService.get('FRONTEND_URL')}/inquiries/${notification.metadata.inquiryId}`,
            action_id: 'view_inquiry',
          },
        ],
      } as any);
    }

    return blocks;
  }

  /**
   * 優先度に応じた絵文字を取得
   */
  private getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'urgent':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '📋';
      case 'low':
        return '📝';
      default:
        return '📋';
    }
  }

  /**
   * Slackユーザー情報を取得
   */
  async getUserInfo(userId: string) {
    if (!this.slackClient) {
      throw new Error('Slack クライアントが初期化されていません');
    }

    try {
      const result = await this.slackClient.users.info({ user: userId });
      return result.user;
    } catch (error) {
      this.logger.error(`Slackユーザー情報の取得に失敗しました: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Slackチャンネル一覧を取得
   */
  async getChannels() {
    if (!this.slackClient) {
      throw new Error('Slack クライアントが初期化されていません');
    }

    try {
      const result = await this.slackClient.conversations.list({
        types: 'public_channel,private_channel',
      });
      return result.channels;
    } catch (error) {
      this.logger.error('Slackチャンネル一覧の取得に失敗しました:', error);
      throw error;
    }
  }

  /**
   * Slack接続テスト
   */
  async testConnection(): Promise<boolean> {
    if (!this.slackClient) {
      return false;
    }

    try {
      await this.slackClient.auth.test();
      return true;
    } catch (error) {
      this.logger.error('Slack接続テストに失敗しました:', error);
      return false;
    }
  }
}