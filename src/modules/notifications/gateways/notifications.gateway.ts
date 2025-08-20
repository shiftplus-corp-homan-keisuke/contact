import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser } from '../../../common/decorators';
import { User } from '../../users/entities';
import { NotificationRequest } from '../types';

@Injectable()
@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationsGateway.name);
    private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.removeUserSocket(client);
    }

    @UseGuards(JwtAuthGuard)
    @SubscribeMessage('join')
    handleJoin(
        @MessageBody() data: { userId: string },
        @ConnectedSocket() client: Socket,
        @CurrentUser() user: User,
    ) {
        // セキュリティチェック: 自分のユーザーIDのみ許可
        if (data.userId !== user.id) {
            client.emit('error', { message: 'Unauthorized' });
            return;
        }

        this.addUserSocket(data.userId, client.id);
        client.join(`user:${data.userId}`);

        this.logger.log(`User ${data.userId} joined with socket ${client.id}`);
        client.emit('joined', { userId: data.userId });
    }

    @UseGuards(JwtAuthGuard)
    @SubscribeMessage('leave')
    handleLeave(
        @MessageBody() data: { userId: string },
        @ConnectedSocket() client: Socket,
        @CurrentUser() user: User,
    ) {
        if (data.userId !== user.id) {
            client.emit('error', { message: 'Unauthorized' });
            return;
        }

        this.removeUserSocket(client);
        client.leave(`user:${data.userId}`);

        this.logger.log(`User ${data.userId} left with socket ${client.id}`);
        client.emit('left', { userId: data.userId });
    }

    // リアルタイム通知送信
    async sendNotificationToUser(userId: string, notification: NotificationRequest) {
        const room = `user:${userId}`;

        this.server.to(room).emit('notification', {
            id: this.generateNotificationId(),
            type: notification.type,
            subject: notification.subject,
            content: notification.content,
            priority: notification.priority,
            timestamp: new Date().toISOString(),
            metadata: notification.metadata,
        });

        this.logger.log(`Sent real-time notification to user ${userId}`);
    }

    // 複数ユーザーへの通知送信
    async sendNotificationToUsers(userIds: string[], notification: NotificationRequest) {
        const promises = userIds.map(userId =>
            this.sendNotificationToUser(userId, notification)
        );

        await Promise.allSettled(promises);
        this.logger.log(`Sent real-time notification to ${userIds.length} users`);
    }

    // ブロードキャスト通知
    async broadcastNotification(notification: NotificationRequest) {
        this.server.emit('broadcast', {
            id: this.generateNotificationId(),
            type: notification.type,
            subject: notification.subject,
            content: notification.content,
            priority: notification.priority,
            timestamp: new Date().toISOString(),
            metadata: notification.metadata,
        });

        this.logger.log('Broadcasted notification to all connected clients');
    }

    // システムアラート送信
    async sendSystemAlert(alert: {
        type: 'maintenance' | 'outage' | 'update';
        message: string;
        severity: 'info' | 'warning' | 'error';
    }) {
        this.server.emit('system_alert', {
            id: this.generateNotificationId(),
            ...alert,
            timestamp: new Date().toISOString(),
        });

        this.logger.log(`Sent system alert: ${alert.type}`);
    }

    // 接続状態確認
    getConnectedUsers(): string[] {
        return Array.from(this.userSockets.keys());
    }

    getUserSocketCount(userId: string): number {
        return this.userSockets.get(userId)?.size || 0;
    }

    isUserConnected(userId: string): boolean {
        return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
    }

    private addUserSocket(userId: string, socketId: string) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socketId);
    }

    private removeUserSocket(client: Socket) {
        for (const [userId, sockets] of this.userSockets.entries()) {
            if (sockets.has(client.id)) {
                sockets.delete(client.id);
                if (sockets.size === 0) {
                    this.userSockets.delete(userId);
                }
                break;
            }
        }
    }

    private generateNotificationId(): string {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}