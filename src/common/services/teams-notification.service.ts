import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@microsoft/microsoft-graph-client';
import axios from 'axios';
import { NotificationRequestDto } from '../dto/notification.dto';

/**
 * Microsoft Teams通知サービス
 */
@Injectable()
export class TeamsNotificationService {
  private readonly logger = new Logger(TeamsNotificationService.name);
  private graphClient: Client;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('TEAMS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('TEAMS_CLIENT_SECRET');
    const tenantId = this.configService.get<string>('TEAMS_TENANT_ID');

    if (clientId && clientSecret && tenantId) {
      this.initializeGraphClient(clientId, clientSecret, tenantId);
    } else {
      this.logger.warn('Microsoft Teams の設定が不完全です');
    }
  }

  /**
   * Microsoft Graph クライアントを初期化
   */
  private async initializeGraphClient(clientId: string, clientSecret: string, tenantId: string) {
    try {
      // アクセストークンを取得
      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const accessToken = tokenResponse.data.access_token;

      // Graph クライアントを初期化
      this.graphClient = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      this.logger.log('Microsoft Graph クライアントが初期化されました');
    } catch (error) {
      this.logger.error('Microsoft Graph クライアントの初期化に失敗しました:', error);
    }
  }

  /**
   * Teams チャットメッセージを送信
   */
  async sendMessage(notification: NotificationRequestDto): Promise<void> {
    if (!this.graphClient) {
      throw new Error('Microsoft Graph クライアントが初期化されていません');
    }

    try {
      for (const recipient of notification.recipients) {
        // ユーザーIDまたはチャンネルIDに応じて送信方法を変更
        if (recipient.startsWith('chat:')) {
          await this.sendChatMessage(recipient.replace('chat:', ''), notification);
        } else if (recipient.startsWith('channel:')) {
          await this.sendChannelMessage(recipient.replace('channel:', ''), notification);
        } else {
          // デフォルトはダイレクトメッセージ
          await this.sendDirectMessage(recipient, notification);
        }
      }

      this.logger.log(`Teams通知を送信しました: ${notification.subject}`);
    } catch (error) {
      this.logger.error('Teams通知の送信に失敗しました:', error);
      throw error;
    }
  }

  /**
   * ダイレクトメッセージを送信
   */
  private async sendDirectMessage(userId: string, notification: NotificationRequestDto) {
    const message = this.buildAdaptiveCard(notification);

    await this.graphClient
      .api(`/users/${userId}/chats`)
      .post({
        chatType: 'oneOnOne',
        members: [
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`,
          },
        ],
      })
      .then(async (chat) => {
        await this.graphClient.api(`/chats/${chat.id}/messages`).post({
          body: {
            contentType: 'html',
            content: message,
          },
        });
      });
  }

  /**
   * チャットメッセージを送信
   */
  private async sendChatMessage(chatId: string, notification: NotificationRequestDto) {
    const message = this.buildAdaptiveCard(notification);

    await this.graphClient.api(`/chats/${chatId}/messages`).post({
      body: {
        contentType: 'html',
        content: message,
      },
    });
  }

  /**
   * チャンネルメッセージを送信
   */
  private async sendChannelMessage(channelId: string, notification: NotificationRequestDto) {
    const [teamId, actualChannelId] = channelId.split('/');
    const message = this.buildAdaptiveCard(notification);

    await this.graphClient.api(`/teams/${teamId}/channels/${actualChannelId}/messages`).post({
      body: {
        contentType: 'html',
        content: message,
      },
    });
  }

  /**
   * Adaptive Card形式のメッセージを構築
   */
  private buildAdaptiveCard(notification: NotificationRequestDto): string {
    const priorityColor = this.getPriorityColor(notification.priority);
    const priorityEmoji = this.getPriorityEmoji(notification.priority);

    let html = `
      <div style="border-left: 4px solid ${priorityColor}; padding: 16px; margin: 8px 0;">
        <h3 style="margin: 0 0 8px 0; color: ${priorityColor};">
          ${priorityEmoji} ${notification.subject}
        </h3>
        <p style="margin: 8px 0;">${notification.content}</p>
    `;

    // メタデータがある場合は追加情報を表示
    if (notification.metadata) {
      const { inquiryId, appName, category } = notification.metadata;
      
      html += '<div style="margin-top: 12px; font-size: 0.9em; color: #666;">';
      
      if (inquiryId) {
        html += `<div><strong>問い合わせID:</strong> ${inquiryId}</div>`;
      }
      
      if (appName) {
        html += `<div><strong>アプリケーション:</strong> ${appName}</div>`;
      }
      
      if (category) {
        html += `<div><strong>カテゴリ:</strong> ${category}</div>`;
      }
      
      html += '</div>';

      // 詳細確認リンクを追加
      if (inquiryId) {
        const detailUrl = `${this.configService.get('FRONTEND_URL')}/inquiries/${inquiryId}`;
        html += `
          <div style="margin-top: 12px;">
            <a href="${detailUrl}" style="background-color: ${priorityColor}; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
              詳細を確認
            </a>
          </div>
        `;
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * 優先度に応じた色を取得
   */
  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent':
        return '#FF4444';
      case 'high':
        return '#FF8800';
      case 'medium':
        return '#0078D4';
      case 'low':
        return '#107C10';
      default:
        return '#0078D4';
    }
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
   * Teams接続テスト
   */
  async testConnection(): Promise<boolean> {
    if (!this.graphClient) {
      return false;
    }

    try {
      await this.graphClient.api('/me').get();
      return true;
    } catch (error) {
      this.logger.error('Teams接続テストに失敗しました:', error);
      return false;
    }
  }

  /**
   * ユーザー情報を取得
   */
  async getUserInfo(userId: string) {
    if (!this.graphClient) {
      throw new Error('Microsoft Graph クライアントが初期化されていません');
    }

    try {
      const user = await this.graphClient.api(`/users/${userId}`).get();
      return user;
    } catch (error) {
      this.logger.error(`Teamsユーザー情報の取得に失敗しました: ${userId}`, error);
      throw error;
    }
  }
}