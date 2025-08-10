import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from '../notification.gateway';
import { WebSocketNotificationDto } from '../../dto/notification.dto';

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let mockServer: any;
  let mockSocket: any;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      id: 'socket123',
      join: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationGateway],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('クライアント接続時にログを出力すること', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      
      gateway.handleConnection(mockSocket);
      
      expect(logSpy).toHaveBeenCalledWith('クライアント接続: socket123');
    });
  });

  describe('handleDisconnect', () => {
    it('クライアント切断時にログを出力すること', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      
      gateway.handleDisconnect(mockSocket);
      
      expect(logSpy).toHaveBeenCalledWith('クライアント切断: socket123');
    });

    it('認証済みユーザーの切断時に追加ログを出力すること', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      
      // ユーザーを接続状態に設定
      gateway['connectedUsers'].set('socket123', 'user123');
      
      gateway.handleDisconnect(mockSocket);
      
      expect(logSpy).toHaveBeenCalledWith('ユーザー user123 が切断されました');
      expect(logSpy).toHaveBeenCalledWith('クライアント切断: socket123');
      expect(gateway['connectedUsers'].has('socket123')).toBe(false);
    });
  });

  describe('handleAuthentication', () => {
    it('ユーザー認証を正常に処理できること', async () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      const data = { userId: 'user123' };
      
      await gateway.handleAuthentication(data, mockSocket);
      
      expect(gateway['connectedUsers'].get('socket123')).toBe('user123');
      expect(mockSocket.join).toHaveBeenCalledWith('user:user123');
      expect(mockSocket.join).toHaveBeenCalledWith('admins');
      expect(mockSocket.emit).toHaveBeenCalledWith('authenticated', { success: true });
      expect(logSpy).toHaveBeenCalledWith('ユーザー user123 が認証されました');
    });

    it('認証エラー時にエラーメッセージを送信すること', async () => {
      const errorSpy = jest.spyOn(gateway['logger'], 'error');
      const data = { userId: 'user123' };
      
      // joinメソッドでエラーを発生させる
      mockSocket.join.mockRejectedValue(new Error('認証エラー'));
      
      await gateway.handleAuthentication(data, mockSocket);
      
      expect(errorSpy).toHaveBeenCalledWith('認証エラー:', expect.any(Error));
      expect(mockSocket.emit).toHaveBeenCalledWith('authentication_error', { 
        message: '認証に失敗しました' 
      });
    });
  });

  describe('sendToUser', () => {
    it('特定のユーザーに通知を送信できること', async () => {
      const notification: WebSocketNotificationDto = {
        type: 'test',
        title: 'テスト通知',
        message: 'テストメッセージ',
        timestamp: new Date(),
      };
      
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      
      await gateway.sendToUser('user123', notification);
      
      expect(mockServer.to).toHaveBeenCalledWith('user:user123');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
      expect(logSpy).toHaveBeenCalledWith('ユーザー user123 に通知を送信: テスト通知');
    });
  });

  describe('sendToAdmins', () => {
    it('管理者全員に通知を送信できること', async () => {
      const notification: WebSocketNotificationDto = {
        type: 'admin',
        title: '管理者通知',
        message: '管理者向けメッセージ',
        timestamp: new Date(),
      };
      
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      
      await gateway.sendToAdmins(notification);
      
      expect(mockServer.to).toHaveBeenCalledWith('admins');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
      expect(logSpy).toHaveBeenCalledWith('管理者に通知を送信: 管理者通知');
    });
  });

  describe('sendToAll', () => {
    it('全ユーザーに通知を送信できること', async () => {
      const notification: WebSocketNotificationDto = {
        type: 'system',
        title: 'システム通知',
        message: 'システムメッセージ',
        timestamp: new Date(),
      };
      
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      
      await gateway.sendToAll(notification);
      
      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
      expect(logSpy).toHaveBeenCalledWith('全ユーザーに通知を送信: システム通知');
    });
  });

  describe('sendToRoom', () => {
    it('特定のルームに通知を送信できること', async () => {
      const notification: WebSocketNotificationDto = {
        type: 'room',
        title: 'ルーム通知',
        message: 'ルームメッセージ',
        timestamp: new Date(),
      };
      
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      
      await gateway.sendToRoom('support', notification);
      
      expect(mockServer.to).toHaveBeenCalledWith('support');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
      expect(logSpy).toHaveBeenCalledWith('ルーム support に通知を送信: ルーム通知');
    });
  });

  describe('getConnectedUsersCount', () => {
    it('接続中のユーザー数を正しく返すこと', () => {
      gateway['connectedUsers'].set('socket1', 'user1');
      gateway['connectedUsers'].set('socket2', 'user2');
      gateway['connectedUsers'].set('socket3', 'user3');
      
      const count = gateway.getConnectedUsersCount();
      
      expect(count).toBe(3);
    });
  });

  describe('isUserOnline', () => {
    it('オンラインユーザーに対してtrueを返すこと', () => {
      gateway['connectedUsers'].set('socket1', 'user123');
      
      const isOnline = gateway.isUserOnline('user123');
      
      expect(isOnline).toBe(true);
    });

    it('オフラインユーザーに対してfalseを返すこと', () => {
      const isOnline = gateway.isUserOnline('user456');
      
      expect(isOnline).toBe(false);
    });

    it('複数の接続があるユーザーに対してtrueを返すこと', () => {
      gateway['connectedUsers'].set('socket1', 'user123');
      gateway['connectedUsers'].set('socket2', 'user123');
      gateway['connectedUsers'].set('socket3', 'user456');
      
      const isOnline = gateway.isUserOnline('user123');
      
      expect(isOnline).toBe(true);
    });
  });
});