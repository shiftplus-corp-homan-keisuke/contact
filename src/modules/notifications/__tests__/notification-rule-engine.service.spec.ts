import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationRuleEngineService } from '../services/notification-rule-engine.service';
import { NotificationRule } from '../entities';
import { NotificationsService } from '../services/notifications.service';
import { RealtimeNotificationService } from '../services/realtime-notification.service';
import { SlackNotificationService } from '../services/slack-notification.service';
import { TeamsNotificationService } from '../services/teams-notification.service';
import { NotificationTrigger, NotificationContext } from '../types';

describe('NotificationRuleEngineService', () => {
    let service: NotificationRuleEngineService;
    let mockRepository: jest.Mocked<Repository<NotificationRule>>;
    let mockNotificationsService: jest.Mocked<NotificationsService>;
    let mockRealtimeService: jest.Mocked<RealtimeNotificationService>;
    let mockSlackService: jest.Mocked<SlackNotificationService>;
    let mockTeamsService: jest.Mocked<TeamsNotificationService>;

    beforeEach(async () => {
        const mockRepositoryProvider = {
            provide: getRepositoryToken(NotificationRule),
            useValue: {
                find: jest.fn(),
                findOne: jest.fn(),
                create: jest.fn(),
                save: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                createQueryBuilder: jest.fn(),
            },
        };

        const mockNotificationsServiceProvider = {
            provide: NotificationsService,
            useValue: {
                sendNotification: jest.fn(),
            },
        };

        const mockRealtimeServiceProvider = {
            provide: RealtimeNotificationService,
            useValue: {
                sendInstantNotification: jest.fn(),
            },
        };

        const mockSlackServiceProvider = {
            provide: SlackNotificationService,
            useValue: {
                sendInquiryCreatedNotification: jest.fn(),
                sendSLAViolationNotification: jest.fn(),
                sendStatusChangeNotification: jest.fn(),
                sendCustomMessage: jest.fn(),
            },
        };

        const mockTeamsServiceProvider = {
            provide: TeamsNotificationService,
            useValue: {
                sendInquiryCreatedNotification: jest.fn(),
                sendSLAViolationNotification: jest.fn(),
                sendStatusChangeNotification: jest.fn(),
                sendResponseAddedNotification: jest.fn(),
                sendCustomMessage: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationRuleEngineService,
                mockRepositoryProvider,
                mockNotificationsServiceProvider,
                mockRealtimeServiceProvider,
                mockSlackServiceProvider,
                mockTeamsServiceProvider,
            ],
        }).compile();

        service = module.get<NotificationRuleEngineService>(NotificationRuleEngineService);
        mockRepository = module.get(getRepositoryToken(NotificationRule));
        mockNotificationsService = module.get(NotificationsService);
        mockRealtimeService = module.get(RealtimeNotificationService);
        mockSlackService = module.get(SlackNotificationService);
        mockTeamsService = module.get(TeamsNotificationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('executeRules', () => {
        it('should execute active rules for given trigger', async () => {
            const trigger: NotificationTrigger = 'inquiry_created';
            const context: NotificationContext = {
                inquiry: {
                    id: 'inquiry1',
                    title: 'Test Inquiry',
                    priority: 'high',
                },
            };

            const mockRules: NotificationRule[] = [
                {
                    id: 'rule1',
                    name: 'Test Rule',
                    trigger,
                    conditions: [],
                    actions: [
                        {
                            type: 'email',
                            recipients: ['user1@example.com'],
                        },
                    ],
                    isActive: true,
                } as NotificationRule,
            ];

            mockRepository.find.mockResolvedValue(mockRules);
            mockNotificationsService.sendNotification.mockResolvedValue();

            await service.executeRules(trigger, context, 'user1');

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { trigger, isActive: true },
                order: { createdAt: 'ASC' },
            });
            expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
        });

        it('should skip rules when conditions are not met', async () => {
            const trigger: NotificationTrigger = 'inquiry_created';
            const context: NotificationContext = {
                inquiry: {
                    id: 'inquiry1',
                    title: 'Test Inquiry',
                    priority: 'low',
                },
            };

            const mockRules: NotificationRule[] = [
                {
                    id: 'rule1',
                    name: 'High Priority Rule',
                    trigger,
                    conditions: [
                        {
                            field: 'inquiry.priority',
                            operator: 'equals',
                            value: 'high',
                        },
                    ],
                    actions: [
                        {
                            type: 'email',
                            recipients: ['user1@example.com'],
                        },
                    ],
                    isActive: true,
                } as NotificationRule,
            ];

            mockRepository.find.mockResolvedValue(mockRules);

            await service.executeRules(trigger, context, 'user1');

            expect(mockNotificationsService.sendNotification).not.toHaveBeenCalled();
        });

        it('should execute rules when conditions are met', async () => {
            const trigger: NotificationTrigger = 'inquiry_created';
            const context: NotificationContext = {
                inquiry: {
                    id: 'inquiry1',
                    title: 'Test Inquiry',
                    priority: 'high',
                },
            };

            const mockRules: NotificationRule[] = [
                {
                    id: 'rule1',
                    name: 'High Priority Rule',
                    trigger,
                    conditions: [
                        {
                            field: 'inquiry.priority',
                            operator: 'equals',
                            value: 'high',
                        },
                    ],
                    actions: [
                        {
                            type: 'email',
                            recipients: ['user1@example.com'],
                        },
                    ],
                    isActive: true,
                } as NotificationRule,
            ];

            mockRepository.find.mockResolvedValue(mockRules);
            mockNotificationsService.sendNotification.mockResolvedValue();

            await service.executeRules(trigger, context, 'user1');

            expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
        });
    });

    describe('executeAction', () => {
        it('should execute email action', async () => {
            const rule = {
                id: 'rule1',
                name: 'Test Rule',
                trigger: 'inquiry_created' as NotificationTrigger,
            } as NotificationRule;

            const action = {
                type: 'email' as const,
                recipients: ['user1@example.com'],
            };

            const context: NotificationContext = {
                inquiry: { id: 'inquiry1', title: 'Test' },
            };

            mockNotificationsService.sendNotification.mockResolvedValue();

            await service['executeAction'](rule, action, context, 'user1');

            expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'email',
                    recipients: ['user1@example.com'],
                })
            );
        });

        it('should execute realtime action', async () => {
            const rule = {
                id: 'rule1',
                name: 'Test Rule',
                trigger: 'inquiry_created' as NotificationTrigger,
            } as NotificationRule;

            const action = {
                type: 'realtime' as const,
                recipients: ['user1'],
            };

            const context: NotificationContext = {
                inquiry: { id: 'inquiry1', title: 'Test' },
            };

            mockRealtimeService.sendInstantNotification.mockResolvedValue();

            await service['executeAction'](rule, action, context, 'user1');

            expect(mockRealtimeService.sendInstantNotification).toHaveBeenCalledWith(
                ['user1'],
                expect.objectContaining({
                    type: 'realtime',
                    recipients: ['user1'],
                })
            );
        });

        it('should execute slack action for inquiry created', async () => {
            const rule = {
                id: 'rule1',
                name: 'Test Rule',
                trigger: 'inquiry_created' as NotificationTrigger,
            } as NotificationRule;

            const action = {
                type: 'slack' as const,
                recipients: [],
                webhookUrl: 'https://hooks.slack.com/services/test',
            };

            const context: NotificationContext = {
                inquiry: { id: 'inquiry1', title: 'Test' },
                assignedTo: { name: 'John Doe' },
            };

            mockSlackService.sendInquiryCreatedNotification.mockResolvedValue();

            await service['executeAction'](rule, action, context, 'user1');

            expect(mockSlackService.sendInquiryCreatedNotification).toHaveBeenCalledWith(
                action.webhookUrl,
                context.inquiry,
                context.assignedTo
            );
        });

        it('should execute teams action for response added', async () => {
            const rule = {
                id: 'rule1',
                name: 'Test Rule',
                trigger: 'response_added' as NotificationTrigger,
            } as NotificationRule;

            const action = {
                type: 'teams' as const,
                recipients: [],
                webhookUrl: 'https://outlook.office.com/webhook/test',
            };

            const context: NotificationContext = {
                inquiry: { id: 'inquiry1', title: 'Test' },
                response: { id: 'response1', content: 'Test response' },
                addedBy: { name: 'Support Agent' },
            };

            mockTeamsService.sendResponseAddedNotification.mockResolvedValue();

            await service['executeAction'](rule, action, context, 'user1');

            expect(mockTeamsService.sendResponseAddedNotification).toHaveBeenCalledWith(
                action.webhookUrl,
                context.inquiry,
                context.response,
                context.addedBy
            );
        });
    });

    describe('condition evaluation', () => {
        it('should evaluate equals condition correctly', () => {
            const conditions = [
                {
                    field: 'inquiry.priority',
                    operator: 'equals' as const,
                    value: 'high',
                },
            ];

            const context: NotificationContext = {
                inquiry: { priority: 'high' },
            };

            const result = service['evaluateConditions'](conditions, context);
            expect(result).toBe(true);
        });

        it('should evaluate contains condition correctly', () => {
            const conditions = [
                {
                    field: 'inquiry.title',
                    operator: 'contains' as const,
                    value: 'urgent',
                },
            ];

            const context: NotificationContext = {
                inquiry: { title: 'Urgent issue with login' },
            };

            const result = service['evaluateConditions'](conditions, context);
            expect(result).toBe(true);
        });

        it('should evaluate greater_than condition correctly', () => {
            const conditions = [
                {
                    field: 'inquiry.responseTime',
                    operator: 'greater_than' as const,
                    value: 24,
                },
            ];

            const context: NotificationContext = {
                inquiry: { responseTime: 48 },
            };

            const result = service['evaluateConditions'](conditions, context);
            expect(result).toBe(true);
        });

        it('should return true when no conditions are provided', () => {
            const result = service['evaluateConditions']([], {});
            expect(result).toBe(true);
        });

        it('should return false when any condition fails', () => {
            const conditions = [
                {
                    field: 'inquiry.priority',
                    operator: 'equals' as const,
                    value: 'high',
                },
                {
                    field: 'inquiry.status',
                    operator: 'equals' as const,
                    value: 'new',
                },
            ];

            const context: NotificationContext = {
                inquiry: { priority: 'high', status: 'in_progress' },
            };

            const result = service['evaluateConditions'](conditions, context);
            expect(result).toBe(false);
        });
    });

    describe('cancelDelayedNotification', () => {
        it('should cancel existing delayed notification', () => {
            const delayId = 'test-delay-id';
            const mockTimeout = setTimeout(() => { }, 1000);

            service['delayedNotifications'].set(delayId, mockTimeout);

            const result = service.cancelDelayedNotification(delayId);

            expect(result).toBe(true);
            expect(service['delayedNotifications'].has(delayId)).toBe(false);
        });

        it('should return false for non-existent delayed notification', () => {
            const result = service.cancelDelayedNotification('non-existent-id');
            expect(result).toBe(false);
        });
    });

    describe('getEngineStats', () => {
        it('should return engine statistics', () => {
            const stats = service.getEngineStats();

            expect(stats).toEqual({
                activeRules: 0,
                delayedNotifications: 0,
                lastExecution: expect.any(Date),
            });
        });
    });
});