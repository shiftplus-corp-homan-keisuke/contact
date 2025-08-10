import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from '../notification.controller';
import { RealtimeNotificationService } from '../../services/realtime-notification.service';
import { NotificationRuleEngineService } from '../../services/notification-rule-engine.service';
import { SlackNotificationService } from '../../services/slack-notification.service';
import { TeamsNotificationService } from '../../services/teams-notification.service';
import { NotificationRequestDto, NotificationType, NotificationPriority } from '../../dto/notification.dto';

describe('NotificationController', () => {
  let controller: NotificationController;
  let realtimeNotificationService: RealtimeNotificationService;
  let notificationRuleEngine: NotificationRuleEngineService;
  let slackService: SlackNotificationService;
  let teamsService: TeamsNotificationService;

  const mockRealtimeNotificationService = {
    sendNotification: jest.fn(),
    sendBulkNotifications: jest.fn(),
    sendSystemNotification: jest.fn(),
    getNotificationStats: jest.fn(),
    getConnectedUsersCount: jest.fn(),
    isUserOnline: jest.fn(),
  };

  const mockNotificationRuleEngine = {
    getUserNotificationSettings: jest.fn(),
  };

  const mockSlackService = {
    testConnection: jest.fn(),
    getChannels: jest.fn(),
    getUserInfo: jest.fn(),
  };

  const mockTeamsService = {
    testConnection: jest.fn(),
    getUserInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: RealtimeNotificationService,
          useValue: mockRealtimeNotificationService,
        },
        {
          provide: NotificationRuleEngineService,
          useValue: mockNotificationRuleEngine,
        },
        {
          provide: SlackNotificationService,
          useValue: mockSlackService,
        },
        {
          provide: TeamsNotificationService,
          useValue: mockTeamsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    realtimeNotificationService = module.get<RealtimeNotificationService>(RealtimeNotificationService);
    notificationRuleEngine = module.get<NotificationRuleEngineService>(NotificationRuleEngineService);
    slackService = module.get<SlackNotificationService>(SlackNotificationService);
    teamsService = module.get<TeamsNotificationService>(TeamsNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('通知を正常に送信できること', async () => {
      const notification: NotificationRequestDto = {
        type: NotificationType.WEBSOCKET,
        recipients: ['user123'],
        subject: 'テスト通知',
        content: 'テスト内容',
        priority: NotificationPriority.MEDIUM,
      };

      mockRealtimeNotificationService.sendNotification.mockResolvedValue(undefined);

      const result = await controller.sendNotification(notification);

      expect(mockRealtimeNotificationService.sendNotification).toHaveBeenCalledWith(notification);
      expect(result).toEqual({ message: '通知を送信しました' });
    });
  });

  describe('sendBulkNotifications', () => {
    it('複数の通知を一括送信できること', async () => {
      const notifications: NotificationRequestDto[] = [
        {
          type: NotificationType.WEBSOCKET,
          recipients: ['user1'],
          subject: '通知1',
          content: '内容1',
          priority: NotificationPriority.MEDIUM,
        },
        {
          type: NotificationType.SLACK,
          recipients: ['#general'],
          subject: '通知2',
          content: '内容2',
          priority: NotificationPriority.HIGH,
        },
      ];

      mockRealtimeNotificationService.sendBulkNotifications.mockResolvedValue(undefined);

      const result = await controller.sendBulkNotifications(notifications);

      expect(mockRealtimeNotificationService.sendBulkNotifications).toHaveBeenCalledWith(notifications);
      expect(result).toEqual({ message: '2件の通知を送信しました' });
    });
  });

  describe('sendSystemNotification', () => {
    it('システム通知を正常に送信できること', async () => {
      const body = {
        title: 'メンテナンス通知',
        message: 'システムメンテナンスを実施します',
        priority: 'high',
      };

      mockRealtimeNotificationService.sendSystemNotification.mockResolvedValue(undefined);

      const result = await controller.sendSystemNotification(body);

      expect(mockRealtimeNotificationService.sendSystemNotification).toHaveBeenCalledWith(
        'メンテナンス通知',
        'システムメンテナンスを実施します',
        'high',
      );
      expect(result).toEqual({ message: 'システム通知を送信しました' });
    });
  });

  describe('getUserNotificationSettings', () => {
    it('ユーザーの通知設定を取得できること', async () => {
      const mockSettings = {
        id: 'settings123',
        userId: 'user123',
        emailEnabled: true,
        slackEnabled: false,
        teamsEnabled: true,
        websocketEnabled: true,
      };

      const mockRequest = { user: { id: 'user123' } };
      mockNotificationRuleEngine.getUserNotificationSettings.mockResolvedValue(mockSettings);

      const result = await controller.getUserNotificationSettings(mockRequest);

      expect(mockNotificationRuleEngine.getUserNotificationSettings).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockSettings);
    });
  });

  describe('getNotificationStats', () => {
    it('通知統計を取得できること', async () => {
      const mockStats = [
        { type: 'email', status: 'sent', count: 10 },
        { type: 'slack', status: 'sent', count: 5 },
        { type: 'websocket', status: 'failed', count: 2 },
      ];

      mockRealtimeNotificationService.getNotificationStats.mockResolvedValue(mockStats);

      const result = await controller.getNotificationStats('2024-01-01', '2024-01-31');

      expect(mockRealtimeNotificationService.getNotificationStats).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('getConnectedUsersCount', () => {
    it('接続中のユーザー数を取得できること', async () => {
      mockRealtimeNotificationService.getConnectedUsersCount.mockReturnValue(15);

      const result = await controller.getConnectedUsersCount();

      expect(mockRealtimeNotificationService.getConnectedUsersCount).toHaveBeenCalled();
      expect(result).toEqual({ connectedUsers: 15 });
    });
  });

  describe('getUserOnlineStatus', () => {
    it('ユーザーのオンライン状態を確認できること', async () => {
      mockRealtimeNotificationService.isUserOnline.mockReturnValue(true);

      const result = await controller.getUserOnlineStatus('user123');

      expect(mockRealtimeNotificationService.isUserOnline).toHaveBeenCalledWith('user123');
      expect(result).toEqual({ userId: 'user123', isOnline: true });
    });
  });

  describe('testSlackConnection', () => {
    it('Slack接続テストを実行できること', async () => {
      mockSlackService.testConnection.mockResolvedValue(true);

      const result = await controller.testSlackConnection();

      expect(mockSlackService.testConnection).toHaveBeenCalled();
      expect(result).toEqual({ service: 'Slack', connected: true });
    });

    it('Slack接続失敗時にfalseを返すこと', async () => {
      mockSlackService.testConnection.mockResolvedValue(false);

      const result = await controller.testSlackConnection();

      expect(result).toEqual({ service: 'Slack', connected: false });
    });
  });

  describe('testTeamsConnection', () => {
    it('Teams接続テストを実行できること', async () => {
      mockTeamsService.testConnection.mockResolvedValue(true);

      const result = await controller.testTeamsConnection();

      expect(mockTeamsService.testConnection).toHaveBeenCalled();
      expect(result).toEqual({ service: 'Teams', connected: true });
    });
  });

  describe('getSlackChannels', () => {
    it('Slackチャンネル一覧を取得できること', async () => {
      const mockChannels = [
        { id: 'C123', name: 'general' },
        { id: 'C456', name: 'support' },
      ];

      mockSlackService.getChannels.mockResolvedValue(mockChannels);

      const result = await controller.getSlackChannels();

      expect(mockSlackService.getChannels).toHaveBeenCalled();
      expect(result).toEqual(mockChannels);
    });

    it('Slackチャンネル取得エラー時にエラーメッセージを返すこと', async () => {
      mockSlackService.getChannels.mockRejectedValue(new Error('API Error'));

      const result = await controller.getSlackChannels();

      expect(result).toEqual({ error: 'Slackチャンネルの取得に失敗しました' });
    });
  });

  describe('getSlackUserInfo', () => {
    it('Slackユーザー情報を取得できること', async () => {
      const mockUser = {
        id: 'U123',
        name: 'testuser',
        real_name: 'Test User',
      };

      mockSlackService.getUserInfo.mockResolvedValue(mockUser);

      const result = await controller.getSlackUserInfo('U123');

      expect(mockSlackService.getUserInfo).toHaveBeenCalledWith('U123');
      expect(result).toEqual(mockUser);
    });

    it('Slackユーザー情報取得エラー時にエラーメッセージを返すこと', async () => {
      mockSlackService.getUserInfo.mockRejectedValue(new Error('User not found'));

      const result = await controller.getSlackUserInfo('U123');

      expect(result).toEqual({ error: 'Slackユーザー情報の取得に失敗しました' });
    });
  });

  describe('getTeamsUserInfo', () => {
    it('Teamsユーザー情報を取得できること', async () => {
      const mockUser = {
        id: 'user123',
        displayName: 'Test User',
        mail: 'test@example.com',
      };

      mockTeamsService.getUserInfo.mockResolvedValue(mockUser);

      const result = await controller.getTeamsUserInfo('user123');

      expect(mockTeamsService.getUserInfo).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockUser);
    });

    it('Teamsユーザー情報取得エラー時にエラーメッセージを返すこと', async () => {
      mockTeamsService.getUserInfo.mockRejectedValue(new Error('User not found'));

      const result = await controller.getTeamsUserInfo('user123');

      expect(result).toEqual({ error: 'Teamsユーザー情報の取得に失敗しました' });
    });
  });
});