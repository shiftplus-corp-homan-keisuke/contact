/**
 * 分析リアルタイム更新ゲートウェイ
 * 要件: 9.1 (リアルタイムデータ更新機能)
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsFiltersDto, RealtimeStatsDto } from '../dto/analytics.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  namespace: '/analytics',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class AnalyticsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalyticsGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private updateInterval: NodeJS.Timeout;

  constructor(private readonly analyticsService: AnalyticsService) {}

  afterInit(server: Server) {
    this.logger.log('Analytics WebSocket Gateway initialized');
    
    // 30秒ごとにリアルタイム統計を更新
    this.updateInterval = setInterval(async () => {
      await this.broadcastRealtimeStats();
    }, 30000);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      this.logger.log(`Client connected: ${client.id}`);
      
      // 認証情報の検証（実際の実装では JWT トークンを検証）
      // const token = client.handshake.auth.token;
      // const user = await this.authService.validateToken(token);
      // client.userId = user.id;
      // client.userRole = user.role;

      this.connectedClients.set(client.id, client);

      // 接続時に初期統計データを送信
      const realtimeStats = await this.analyticsService.getRealtimeStats();
      client.emit('realtime-stats', realtimeStats);

      this.logger.log(`Total connected clients: ${this.connectedClients.size}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
    this.logger.log(`Total connected clients: ${this.connectedClients.size}`);
  }

  /**
   * 統計フィルターの購読
   */
  @SubscribeMessage('subscribe-stats')
  async handleSubscribeStats(
    @MessageBody() filters: AnalyticsFiltersDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      this.logger.log(`Client ${client.id} subscribed to stats with filters: ${JSON.stringify(filters)}`);

      // フィルター付き統計を取得して送信
      const stats = await this.analyticsService.getInquiryStatistics(filters);
      client.emit('filtered-stats', stats);

      // クライアントのフィルター情報を保存（後でブロードキャスト時に使用）
      client.data = { ...client.data, filters };
    } catch (error) {
      this.logger.error(`Subscribe stats error: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to stats' });
    }
  }

  /**
   * 統計フィルターの購読解除
   */
  @SubscribeMessage('unsubscribe-stats')
  handleUnsubscribeStats(@ConnectedSocket() client: AuthenticatedSocket) {
    this.logger.log(`Client ${client.id} unsubscribed from stats`);
    delete client.data?.filters;
  }

  /**
   * 特定アプリの統計購読
   */
  @SubscribeMessage('subscribe-app-stats')
  async handleSubscribeAppStats(
    @MessageBody() data: { appId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      this.logger.log(`Client ${client.id} subscribed to app stats: ${data.appId}`);

      const filters: AnalyticsFiltersDto = { appId: data.appId };
      const stats = await this.analyticsService.getInquiryStatistics(filters);
      
      client.emit('app-stats', {
        appId: data.appId,
        stats
      });

      // アプリ別統計の購読情報を保存
      client.data = { ...client.data, subscribedApps: [...(client.data?.subscribedApps || []), data.appId] };
    } catch (error) {
      this.logger.error(`Subscribe app stats error: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to app stats' });
    }
  }

  /**
   * リアルタイム統計をすべてのクライアントにブロードキャスト
   */
  private async broadcastRealtimeStats() {
    try {
      if (this.connectedClients.size === 0) {
        return;
      }

      const realtimeStats = await this.analyticsService.getRealtimeStats();
      this.server.emit('realtime-stats', realtimeStats);

      this.logger.debug(`Broadcasted realtime stats to ${this.connectedClients.size} clients`);
    } catch (error) {
      this.logger.error(`Broadcast realtime stats error: ${error.message}`);
    }
  }

  /**
   * 新しい問い合わせ作成時の通知
   */
  async notifyInquiryCreated(inquiryData: any) {
    try {
      // リアルタイム統計を更新
      const realtimeStats = await this.analyticsService.getRealtimeStats();
      this.server.emit('realtime-stats', realtimeStats);

      // 新規問い合わせ通知
      this.server.emit('inquiry-created', {
        inquiry: inquiryData,
        timestamp: new Date()
      });

      // アプリ別統計を購読しているクライアントに更新通知
      for (const [clientId, client] of this.connectedClients) {
        const subscribedApps = client.data?.subscribedApps || [];
        if (subscribedApps.includes(inquiryData.appId)) {
          const appStats = await this.analyticsService.getInquiryStatistics({ appId: inquiryData.appId });
          client.emit('app-stats', {
            appId: inquiryData.appId,
            stats: appStats
          });
        }
      }

      this.logger.log(`Notified inquiry created: ${inquiryData.id}`);
    } catch (error) {
      this.logger.error(`Notify inquiry created error: ${error.message}`);
    }
  }

  /**
   * 問い合わせ状態変更時の通知
   */
  async notifyInquiryStatusChanged(inquiryData: any) {
    try {
      // リアルタイム統計を更新
      const realtimeStats = await this.analyticsService.getRealtimeStats();
      this.server.emit('realtime-stats', realtimeStats);

      // 状態変更通知
      this.server.emit('inquiry-status-changed', {
        inquiry: inquiryData,
        timestamp: new Date()
      });

      this.logger.log(`Notified inquiry status changed: ${inquiryData.id} -> ${inquiryData.status}`);
    } catch (error) {
      this.logger.error(`Notify inquiry status changed error: ${error.message}`);
    }
  }

  /**
   * 回答追加時の通知
   */
  async notifyResponseAdded(responseData: any) {
    try {
      // リアルタイム統計を更新
      const realtimeStats = await this.analyticsService.getRealtimeStats();
      this.server.emit('realtime-stats', realtimeStats);

      // 回答追加通知
      this.server.emit('response-added', {
        response: responseData,
        timestamp: new Date()
      });

      this.logger.log(`Notified response added: ${responseData.id}`);
    } catch (error) {
      this.logger.error(`Notify response added error: ${error.message}`);
    }
  }

  /**
   * カスタム統計更新の送信
   */
  async sendCustomStatsUpdate(filters: AnalyticsFiltersDto, targetClientId?: string) {
    try {
      const stats = await this.analyticsService.getInquiryStatistics(filters);
      
      if (targetClientId) {
        const client = this.connectedClients.get(targetClientId);
        if (client) {
          client.emit('custom-stats-update', { filters, stats });
        }
      } else {
        this.server.emit('custom-stats-update', { filters, stats });
      }

      this.logger.log(`Sent custom stats update`);
    } catch (error) {
      this.logger.error(`Send custom stats update error: ${error.message}`);
    }
  }

  /**
   * ゲートウェイ終了時のクリーンアップ
   */
  onModuleDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.logger.log('Analytics Gateway destroyed');
  }
}