import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { WebSocketNotificationDto } from '../dto/notification.dto';

/**
 * リアルタイム通知用WebSocketゲートウェイ
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  /**
   * クライアント接続時の処理
   */
  handleConnection(client: Socket) {
    this.logger.log(`クライアント接続: ${client.id}`);
  }

  /**
   * クライアント切断時の処理
   */
  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      this.connectedUsers.delete(client.id);
      this.logger.log(`ユーザー ${userId} が切断されました`);
    }
    this.logger.log(`クライアント切断: ${client.id}`);
  }

  /**
   * ユーザー認証とルーム参加
   */
  @SubscribeMessage('authenticate')
  @UseGuards(JwtAuthGuard)
  async handleAuthentication(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { userId } = data;
      
      // ユーザーIDとソケットIDを関連付け
      this.connectedUsers.set(client.id, userId);
      
      // ユーザー専用ルームに参加
      await client.join(`user:${userId}`);
      
      // 管理者の場合は管理者ルームにも参加
      // TODO: ユーザーの権限チェックを実装
      await client.join('admins');
      
      this.logger.log(`ユーザー ${userId} が認証されました`);
      
      client.emit('authenticated', { success: true });
    } catch (error) {
      this.logger.error('認証エラー:', error);
      client.emit('authentication_error', { message: '認証に失敗しました' });
    }
  }

  /**
   * 特定のユーザーに通知を送信
   */
  async sendToUser(userId: string, notification: WebSocketNotificationDto) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`ユーザー ${userId} に通知を送信: ${notification.title}`);
  }

  /**
   * 管理者全員に通知を送信
   */
  async sendToAdmins(notification: WebSocketNotificationDto) {
    this.server.to('admins').emit('notification', notification);
    this.logger.log(`管理者に通知を送信: ${notification.title}`);
  }

  /**
   * 全ユーザーに通知を送信
   */
  async sendToAll(notification: WebSocketNotificationDto) {
    this.server.emit('notification', notification);
    this.logger.log(`全ユーザーに通知を送信: ${notification.title}`);
  }

  /**
   * 特定のルームに通知を送信
   */
  async sendToRoom(room: string, notification: WebSocketNotificationDto) {
    this.server.to(room).emit('notification', notification);
    this.logger.log(`ルーム ${room} に通知を送信: ${notification.title}`);
  }

  /**
   * 接続中のユーザー数を取得
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * 特定のユーザーがオンラインかチェック
   */
  isUserOnline(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).includes(userId);
  }
}