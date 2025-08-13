import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeNotificationService } from '../realtime-notification.service';
import { NotificationGateway } from '../../../modules/notifications/gateways/notification.gateway';
import { SlackNotificationService } from '../slack-notification.service';
import { TeamsNotificationService } from '../teams-notification.service';
import { NotificationRuleEngineService } from '../notification-rule-engine.service';
import { NotificationLog } from '../../entities/notification-log.entity';
import { UserNotificationSettings } from '../../entities/user-notification-settings.entity';
import { NotificationRequestDto, NotificationType, NotificationPriority } from '../../dto/notification.dto';

describe('RealtimeNotificationService', () => {
  let service: RealtimeNotificationService;
  let notificationLogRepository: Repository<NotificationLog>;
  let userNotificationSettingsRepository: Repository<UserNotificationSettings>;
  let notificationGateway: NotificationGateway;
  let slackService: SlackNotificationService;
  let teamsService: TeamsNotificationService;
  let ruleEngine: NotificationRuleEngineService;

  const mockNotificationLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserNotificationSettingsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockNotificationGateway = {
    sendToUser: jest.fn(),
    sendToAdmins: jest.fn(),
    sendToAll: jest.fn(),
    sendToRoom: jest.fn(),
    getConnectedUsersCount: jest.fn(),
    isUserOnline: jest.fn(),
  };

  const mockSlackService = {
    sendMessage: jest.fn(),
    testConnection: jest.fn(),
  };

  const mockTeamsService = {
    sendMessage: jest.fn(),
    testConnection: jest.fn(),
  };

  const mockRuleEngine = {
    processInquiryCreated: jest.fn(),
    processStatusChanged: jest.fn(),
    processResponseAdded: jest.fn(),
    processSLAViolation: jest.fn(),
    processEscalation: jest.fn(),
    getUserNotificationSettings: jest.fn(),
    getNotificationStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeNotificationService,
        {
          provide: getRepositoryToken(NotificationLog),
          useValue: mockNotificationLogRepository,
        },
        {
          provide: getRepositoryToken(UserNotificationSettings),
          useValue: mockUserNotificationSettingsRepository,
        },
        {
          provide: NotificationGateway,
          useValue: mockNotificationGateway,
        },
        {
          provide: SlackNotificationService,
          useValue: mockSlackService,
        },
        {
          provide: TeamsNotificationService,
          useValue: mockTeamsService,
        },
        {
          provide: NotificationRuleEngineService,
          useValue: mockRuleEngine,
        },
      ],
    }).compile();

    service = module.get<RealtimeNotificationService>(RealtimeNotificationService);
    notificationLogRepository = module.get<Repository<NotificationLog>>(getRepositoryToken(NotificationLog));
    userNotificationSettingsRepository = module.get<Repository<UserNotificationSettings>>(getRepositoryToken(UserNotificationSettings));
    notificationGateway = module.get<NotificationGateway>(NotificationGateway);
    slackService = module.get<SlackNotificationService>(SlackNotificationService);
    teamsService = module.get<TeamsNotificationService>(TeamsNotificationService);
    ruleEngine = module.get<NotificationRuleEngineService>(NotificationRuleEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('WebSocket通知を正常に送信できること', async () => {
      const notification: NotificationRequestDto = {
        type: NotificationType.WEBSOCKET,
        recipients: ['user123'],
        subject: 'テスト通知',
        content: 'これはテスト通知です',
        priority: NotificationPriority.MEDIUM,
      };

      const mockLog = { id: 'log123', status: 'pending' };
      mockNotificationLogRepository.create.mockReturnValue(mockLog);
      mockNotificationLogRepository.save.mockResolvedValue(mockLog);

      await service.sendNotification(notification);

      expect(mockNotificationLogRepository.create).toHaveBeenCalledWith({
        type: notification.type,
        recipients: notification.recipients,
        subject: notification.subject,
        content: notification.content,
        priority: notification.priority,
        status: 'pending',
        metadata: notification.metadata,
      });

      expect(mockNotificationGateway.sendToUser).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          type: 'notification',
          title: 'テスト通知',
          message: 'これはテスト通知です',
        }),
      );

      expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
          sentAt: expect.any(Date),
        }),
      );
    });

    it('Slack通知を正常に送信できること', async () => {
      const notification: NotificationRequestDto = {
        type: NotificationType.SLACK,
        recipients: ['#general'],
        subject: 'Slackテスト通知',
        content: 'これはSlackテスト通知です',
        priority: NotificationPriority.HIGH,
      };

      const mockLog = { id: 'log123', status: 'pending' };
      mockNotificationLogRepository.create.mockReturnValue(mockLog);
      mockNotificationLogRepository.save.mockResolvedValue(mockLog);
      mockSlackService.sendMessage.mockResolvedValue(undefined);

      await service.sendNotification(notification);

      expect(mockSlackService.sendMessage).toHaveBeenCalledWith(notification);
      expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
          sentAt: expect.any(Date),
        }),
      );
    });

    it('Teams通知を正常に送信できること', async () => {
      const notification: NotificationRequestDto = {
        type: NotificationType.TEAMS,
        recipients: ['user@example.com'],
        subject: 'Teamsテスト通知',
        content: 'これはTeamsテスト通知です',
        priority: NotificationPriority.URGENT,
      };

      const mockLog = { id: 'log123', status: 'pending' };
      mockNotificationLogRepository.create.mockReturnValue(mockLog);
      mockNotificationLogRepository.save.mockResolvedValue(mockLog);
      mockTeamsService.sendMessage.mockResolvedValue(undefined);

      await service.sendNotification(notification);

      expect(mockTeamsService.sendMessage).toHaveBeenCalledWith(notification);
      expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
          sentAt: expect.any(Date),
        }),
      );
    });

    it('通知送信失敗時にエラーログを記録すること', async () => {
      const notification: NotificationRequestDto = {
        type: NotificationType.SLACK,
        recipients: ['#general'],
        subject: 'エラーテスト',
        content: 'エラーテスト通知',
        priority: NotificationPriority.MEDIUM,
      };

      const mockLog = { id: 'log123', status: 'pending' };
      mockNotificationLogRepository.create.mockReturnValue(mockLog);
      mockNotificationLogRepository.save.mockResolvedValue(mockLog);
      
      const error = new Error('Slack送信エラー');
      mockSlackService.sendMessage.mockRejectedValue(error);

      await expect(service.sendNotification(notification)).rejects.toThrow('Slack送信エラー');

      expect(mockNotificationLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Slack送信エラー',
        }),
      );
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
          type: NotificationType.WEBSOCKET,
          recipients: ['user2'],
          subject: '通知2',
          content: '内容2',
          priority: NotificationPriority.HIGH,
        },
      ];

      const mockLog = { id: 'log123', status: 'pending' };
      mockNotificationLogRepository.create.mockReturnValue(mockLog);
      mockNotificationLogRepository.save.mockResolvedValue(mockLog);

      await service.sendBulkNotifications(notifications);

      expect(mockNotificationLogRepository.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationGateway.sendToUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('notifyInquiryCreated', () => {
    it('問い合わせ作成通知を正常に送信できること', async () => {
      const inquiry = {
        id: 'inquiry123',
        title: 'テスト問い合わせ',
        appId: 'app123',
        priority: 'high',
        category: 'technical',
      } as any;

      mockRuleEngine.processInquiryCreated.mockResolvedValue(undefined);

      await service.notifyInquiryCreated(inquiry);

      expect(mockRuleEngine.processInquiryCreated).toHaveBeenCalledWith(inquiry);
      expect(mockNotificationGateway.sendToAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inquiry_created',
          title: '新しい問い合わせが作成されました',
          message: 'テスト問い合わせ',
        }),
      );
      expect(mockNotificationGateway.sendToRoom).toHaveBeenCalledWith(
        'support',
        expect.objectContaining({
          type: 'inquiry_created',
        }),
      );
    });
  });

  describe('notifyStatusChanged', () => {
    it('状態変更通知を正常に送信できること', async () => {
      const inquiry = {
        id: 'inquiry123',
        title: 'テスト問い合わせ',
        appId: 'app123',
        assignedTo: 'user123',
      } as any;

      mockRuleEngine.processStatusChanged.mockResolvedValue(undefined);

      await service.notifyStatusChanged(inquiry, 'new', 'in_progress');

      expect(mockRuleEngine.processStatusChanged).toHaveBeenCalledWith(inquiry, 'new', 'in_progress');
      expect(mockNotificationGateway.sendToUser).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          type: 'status_changed',
          title: '問い合わせの状態が変更されました',
        }),
      );
      expect(mockNotificationGateway.sendToAdmins).toHaveBeenCalled();
    });
  });

  describe('notifySLAViolation', () => {
    it('SLA違反通知を正常に送信できること', async () => {
      const inquiry = {
        id: 'inquiry123',
        title: 'SLA違反問い合わせ',
        appId: 'app123',
      } as any;

      mockRuleEngine.processSLAViolation.mockResolvedValue(undefined);

      await service.notifySLAViolation(inquiry, 'response_time');

      expect(mockRuleEngine.processSLAViolation).toHaveBeenCalledWith(inquiry, 'response_time');
      expect(mockNotificationGateway.sendToAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sla_violation',
          title: 'SLA違反が発生しました',
        }),
      );
      expect(mockNotificationGateway.sendToRoom).toHaveBeenCalledWith(
        'managers',
        expect.objectContaining({
          type: 'sla_violation',
        }),
      );
    });
  });

  describe('getEnabledNotificationChannels', () => {
    it('ユーザーの有効な通知チャネルを取得できること', async () => {
      const mockSettings = {
        emailEnabled: true,
        slackEnabled: true,
        teamsEnabled: false,
        websocketEnabled: true,
      };

      mockRuleEngine.getUserNotificationSettings.mockResolvedValue(mockSettings);

      const channels = await service.getEnabledNotificationChannels('user123');

      expect(channels).toEqual([
        NotificationType.EMAIL,
        NotificationType.SLACK,
        NotificationType.WEBSOCKET,
      ]);
    });
  });

  describe('sendSystemNotification', () => {
    it('システム通知を全ユーザーに送信できること', async () => {
      await service.sendSystemNotification('メンテナンス通知', 'システムメンテナンスを実施します');

      expect(mockNotificationGateway.sendToAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system',
          title: 'メンテナンス通知',
          message: 'システムメンテナンスを実施します',
        }),
      );
    });
  });
});