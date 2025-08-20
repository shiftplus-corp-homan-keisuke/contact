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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyticsService } from '../services/analytics.service';
import { RealTimeUpdateDto } from '../dto/analytics.dto';

/**
 * 分析データのリアルタイム更新WebSocketゲートウェイ
 * ダッシュボードのリアルタイムデータ更新を提供
 */
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
    private connectedClients = new Map<string, Socket>();
    private updateInterval: NodeJS.Timeout;

    constructor(private readonly analyticsService: AnalyticsService) { }

    /**
     * ゲートウェイ初期化
     */
    afterInit(server: Server) {
        this.logger.log('Analytics WebSocket Gateway initialized');

        // 定期的なダッシュボードデータ更新（30秒間隔）
        this.updateInterval = setInterval(async () => {
            await this.broadcastDashboardUpdate();
        }, 30000);
    }

    /**
     * クライアント接続時の処理
     */
    async handleConnection(client: Socket) {
        try {
            this.logger.log(`Client connected: ${client.id}`);
            this.connectedClients.set(client.id, client);

            // 接続時に初期ダッシュボードデータを送信
            const dashboardData = await this.analyticsService.getDashboardData();
            client.emit('dashboard_data', {
                type: 'initial_data',
                data: dashboardData,
                timestamp: new Date(),
            });

            this.logger.log(`Initial dashboard data sent to client: ${client.id}`);
        } catch (error) {
            this.logger.error(`Connection error for client ${client.id}:`, error);
            client.disconnect();
        }
    }

    /**
     * クライアント切断時の処理
     */
    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.connectedClients.delete(client.id);
    }

    /**
     * ダッシュボード購読
     */
    @SubscribeMessage('subscribe_dashboard')
    async handleSubscribeDashboard(
        @MessageBody() data: { filters?: any },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            this.logger.log(`Dashboard subscription from client: ${client.id}`, { filters: data.filters });

            // フィルター付きダッシュボードデータを送信
            const dashboardData = await this.analyticsService.getDashboardData(data.filters || {});

            client.emit('dashboard_data', {
                type: 'filtered_data',
                data: dashboardData,
                filters: data.filters,
                timestamp: new Date(),
            });

            // クライアントのフィルター情報を保存（今後の更新で使用）
            client.data.filters = data.filters;

        } catch (error) {
            this.logger.error(`Dashboard subscription error for client ${client.id}:`, error);
            client.emit('error', {
                message: 'ダッシュボードデータの取得に失敗しました',
                error: error.message,
            });
        }
    }

    /**
     * 統計データ購読
     */
    @SubscribeMessage('subscribe_statistics')
    async handleSubscribeStatistics(
        @MessageBody() data: { filters?: any },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            this.logger.log(`Statistics subscription from client: ${client.id}`, { filters: data.filters });

            const statistics = await this.analyticsService.getInquiryStatistics(data.filters || {});

            client.emit('statistics_data', {
                type: 'statistics_update',
                data: statistics,
                filters: data.filters,
                timestamp: new Date(),
            });

        } catch (error) {
            this.logger.error(`Statistics subscription error for client ${client.id}:`, error);
            client.emit('error', {
                message: '統計データの取得に失敗しました',
                error: error.message,
            });
        }
    }

    /**
     * 応答時間分析購読
     */
    @SubscribeMessage('subscribe_response_time')
    async handleSubscribeResponseTime(
        @MessageBody() data: { filters?: any },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            this.logger.log(`Response time subscription from client: ${client.id}`, { filters: data.filters });

            const responseTimeAnalytics = await this.analyticsService.getResponseTimeAnalytics(data.filters || {});

            client.emit('response_time_data', {
                type: 'response_time_update',
                data: responseTimeAnalytics,
                filters: data.filters,
                timestamp: new Date(),
            });

        } catch (error) {
            this.logger.error(`Response time subscription error for client ${client.id}:`, error);
            client.emit('error', {
                message: '応答時間分析データの取得に失敗しました',
                error: error.message,
            });
        }
    }

    /**
     * 全クライアントにダッシュボード更新をブロードキャスト
     */
    async broadcastDashboardUpdate() {
        if (this.connectedClients.size === 0) {
            return;
        }

        try {
            this.logger.log(`Broadcasting dashboard update to ${this.connectedClients.size} clients`);

            // 各クライアントのフィルターに応じてデータを送信
            const promises = Array.from(this.connectedClients.values()).map(async (client) => {
                try {
                    const filters = client.data.filters || {};
                    const dashboardData = await this.analyticsService.getDashboardData(filters);

                    client.emit('dashboard_update', {
                        type: 'periodic_update',
                        data: dashboardData,
                        timestamp: new Date(),
                    });
                } catch (error) {
                    this.logger.error(`Failed to send update to client ${client.id}:`, error);
                }
            });

            await Promise.all(promises);
            this.logger.log('Dashboard update broadcast completed');

        } catch (error) {
            this.logger.error('Dashboard update broadcast error:', error);
        }
    }

    /**
     * 特定のイベントによる即座更新
     */
    async broadcastRealTimeUpdate(update: RealTimeUpdateDto) {
        if (this.connectedClients.size === 0) {
            return;
        }

        try {
            this.logger.log(`Broadcasting real-time update: ${update.type}`, {
                clientCount: this.connectedClients.size
            });

            // 全クライアントに即座更新を送信
            this.server.emit('real_time_update', update);

            // 更新されたダッシュボードデータも送信
            setTimeout(async () => {
                await this.broadcastDashboardUpdate();
            }, 1000); // 1秒後にダッシュボードデータを更新

        } catch (error) {
            this.logger.error('Real-time update broadcast error:', error);
        }
    }

    /**
     * 問い合わせ作成時の更新通知
     */
    async notifyInquiryCreated(inquiryData: any) {
        const update: RealTimeUpdateDto = {
            type: 'inquiry_created',
            data: inquiryData,
            timestamp: new Date(),
        };

        await this.broadcastRealTimeUpdate(update);
    }

    /**
     * 問い合わせ更新時の更新通知
     */
    async notifyInquiryUpdated(inquiryData: any) {
        const update: RealTimeUpdateDto = {
            type: 'inquiry_updated',
            data: inquiryData,
            timestamp: new Date(),
        };

        await this.broadcastRealTimeUpdate(update);
    }

    /**
     * 問い合わせ解決時の更新通知
     */
    async notifyInquiryResolved(inquiryData: any) {
        const update: RealTimeUpdateDto = {
            type: 'inquiry_resolved',
            data: inquiryData,
            timestamp: new Date(),
        };

        await this.broadcastRealTimeUpdate(update);
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