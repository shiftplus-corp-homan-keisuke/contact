import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsService } from '../services/notifications.service';
import { EmailNotificationService } from '../services/email-notification.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import {
    NotificationRule,
    NotificationLog,
    UserNotificationSettings
} from '../entities';
import { CreateNotificationRuleDto } from '../dto';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let notificationRuleRepository: Repository<NotificationRule>;
    let notificationLogRepository: Repository<NotificationLog>;
    let userNotificationSettingsRepository: Repository<UserNotificationSettings>;
    let emailService: EmailNotificationService;
    let templateService: NotificationTemplateService;
    let eventEmitter: EventEmitter2;

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockEmailService = {
        sendEmail: jest.fn(),
        sendBulkEmails: jest.fn(),
        verifyConnection: jest.fn(),
    };

    const mockTemplateService = {
        getTemplate: jest.fn(),
        renderTemplate: jest.fn(),
        getTemplatesByTrigger: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: getRepositoryToken(NotificationRule),
                    useValue: mockRepository,
                },
                {
                    provide: getRepositoryToken(NotificationLog),
                    useValue: mockRepository,
                },
                {
                    provide: getRepositoryToken(UserNotificationSettings),
                    useValue: mockRepository,
                },
                {
                    provide: EmailNotificationService,
                    useValue: mockEmailService,
                },
                {
                    provide: NotificationTemplateService,
                    useValue: mockTemplateService,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
        notificationRuleRepository = module.get<Repository<NotificationRule>>(
            getRepositoryToken(NotificationRule),
        );
        notificationLogRepository = module.get<Repository<NotificationLog>>(
            getRepositoryToken(NotificationLog),
        );
        userNotificationSettingsRepository = module.get<Repository<UserNotificationSettings>>(
            getRepositoryToken(UserNotificationSettings),
        );
        emailService = module.get<EmailNotificationService>(EmailNotificationService);
        templateService = module.get<NotificationTemplateService>(NotificationTemplateService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createNotificationRule', () => {
        it('通知ルールを作成できること', async () => {
            const dto: CreateNotificationRuleDto = {
                name: 'テスト通知ルール',
                trigger: 'inquiry_created',
                conditions: [],
                actions: [{
                    type: 'email',
                    recipients: ['test@example.com'],
                }],
            };

            const createdBy = 'user-id';
            const mockRule = {
                id: 'rule-id',
                ...dto,
                createdBy,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockRepository.create.mockReturnValue(mockRule);
            mockRepository.save.mockResolvedValue(mockRule);

            const result = await service.createNotificationRule(dto, createdBy);

            expect(mockRepository.create).toHaveBeenCalledWith({
                ...dto,
                createdBy,
            });
            expect(mockRepository.save).toHaveBeenCalledWith(mockRule);
            expect(result).toEqual(mockRule);
        });
    });

    describe('sendNotification', () => {
        it('メール通知を送信できること', async () => {
            const request = {
                type: 'email' as const,
                recipients: ['test@example.com'],
                subject: 'テスト通知',
                content: 'テスト内容',
                priority: 'medium' as const,
            };

            const mockLog = {
                id: 'log-id',
                channel: 'email',
                recipient: 'test@example.com',
                subject: 'テスト通知',
                content: 'テスト内容',
                status: 'pending',
                createdAt: new Date(),
            };

            mockRepository.create.mockReturnValue(mockLog);
            mockRepository.save.mockResolvedValue([mockLog]);
            mockRepository.update.mockResolvedValue({ affected: 1 });
            mockEmailService.sendEmail.mockResolvedValue(undefined);

            await service.sendNotification(request);

            expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
                to: request.recipients,
                subject: request.subject,
                content: request.content,
            });
            expect(mockRepository.update).toHaveBeenCalledWith(
                mockLog.id,
                expect.objectContaining({ status: 'sent' }),
            );
        });
    });

    describe('triggerNotification', () => {
        it('条件に一致する通知ルールを実行できること', async () => {
            const trigger = 'inquiry_created';
            const context = {
                inquiry: {
                    id: 'inquiry-id',
                    title: 'テスト問い合わせ',
                    priority: 'high',
                },
            };

            const mockRule = {
                id: 'rule-id',
                name: 'テストルール',
                trigger,
                conditions: [
                    { field: 'inquiry.priority', operator: 'equals', value: 'high' },
                ],
                actions: [
                    { type: 'email', recipients: ['admin@example.com'] },
                ],
                isActive: true,
            };

            mockRepository.find.mockResolvedValue([mockRule]);
            mockTemplateService.getTemplate.mockReturnValue({
                id: 'inquiry_created_email',
                subject: '新規問い合わせ: {{inquiry.title}}',
                content: '問い合わせが作成されました: {{inquiry.title}}',
            });
            mockTemplateService.renderTemplate.mockReturnValue({
                subject: '新規問い合わせ: テスト問い合わせ',
                content: '問い合わせが作成されました: テスト問い合わせ',
            });

            const mockLog = { id: 'log-id' };
            mockRepository.create.mockReturnValue(mockLog);
            mockRepository.save.mockResolvedValue([mockLog]);
            mockRepository.update.mockResolvedValue({ affected: 1 });
            mockEmailService.sendEmail.mockResolvedValue(undefined);

            await service.triggerNotification(trigger, context);

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { trigger, isActive: true },
            });
            expect(mockEmailService.sendEmail).toHaveBeenCalled();
        });

        it('条件に一致しない場合は通知を送信しないこと', async () => {
            const trigger = 'inquiry_created';
            const context = {
                inquiry: {
                    id: 'inquiry-id',
                    title: 'テスト問い合わせ',
                    priority: 'low',
                },
            };

            const mockRule = {
                id: 'rule-id',
                name: 'テストルール',
                trigger,
                conditions: [
                    { field: 'inquiry.priority', operator: 'equals', value: 'high' },
                ],
                actions: [
                    { type: 'email', recipients: ['admin@example.com'] },
                ],
                isActive: true,
            };

            mockRepository.find.mockResolvedValue([mockRule]);

            await service.triggerNotification(trigger, context);

            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        });
    });

    describe('getUserNotificationSettings', () => {
        it('ユーザーの通知設定を取得できること', async () => {
            const userId = 'user-id';
            const mockSettings = [
                {
                    userId,
                    trigger: 'inquiry_created',
                    channel: 'email',
                    isEnabled: true,
                    emailAddress: 'user@example.com',
                },
            ];

            mockRepository.find.mockResolvedValue(mockSettings);

            const result = await service.getUserNotificationSettings(userId);

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { userId },
            });
            expect(result.userId).toBe(userId);
            expect(result.settings).toHaveLength(1);
            expect(result.settings[0].trigger).toBe('inquiry_created');
        });
    });

    describe('updateUserNotificationSettings', () => {
        it('ユーザーの通知設定を更新できること', async () => {
            const userId = 'user-id';
            const dto = {
                settings: [
                    {
                        trigger: 'inquiry_created' as const,
                        channel: 'email' as const,
                        isEnabled: true,
                        emailAddress: 'user@example.com',
                    },
                ],
            };

            const mockEntity = {
                userId,
                ...dto.settings[0],
            };

            mockRepository.delete.mockResolvedValue({ affected: 1 });
            mockRepository.create.mockReturnValue(mockEntity);
            mockRepository.save.mockResolvedValue([mockEntity]);

            await service.updateUserNotificationSettings(userId, dto);

            expect(mockRepository.delete).toHaveBeenCalledWith({ userId });
            expect(mockRepository.create).toHaveBeenCalledWith({
                userId,
                ...dto.settings[0],
            });
            expect(mockRepository.save).toHaveBeenCalledWith([mockEntity]);
        });
    });
});