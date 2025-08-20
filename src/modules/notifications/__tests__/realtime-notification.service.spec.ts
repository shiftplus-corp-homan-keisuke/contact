import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RealtimeNotificationService } from '../services/realtime-notification.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { NotificationsService } from '../services/notifications.service';
import { NotificationRequest } from '../types';

describe('RealtimeNotificationService', () => {
    let service: RealtimeNotificationService;
    let mockGateway: jest.Mocked<NotificationsGateway>;
    let mockNotificationsService: jest.Mocked<NotificationsService>;
    let mockEventEmitter: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        const mockGatewayProvider = {
            provide: NotificationsGateway,
            useValue: {
                sendNotificationToUsers: jest.fn(),
                sendSystemAlert: jest.fn(),
                getConnectedUsers: jest.fn(),
                getUserSocketCount: jest.fn(),
                isUserConnected: jest.fn(),
            },
        };

        const mockNotificationsServiceProvider = {
            provide: NotificationsService,
            useValue: {
                sendNotification: jest.fn(),
            },
        };

        const mockEventEmitterProvider = {
            provide: EventEmitter2,
            useValue: {
                emit: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RealtimeNotificationService,
                mockGatewayProvider,
                mockNotificationsServiceProvider,
                mockEventEmitterProvider,
            ],
        }).compile();

        service = module.get<RealtimeNotificationService>(RealtimeNotificationService);
        mockGateway = module.get(NotificationsGateway);
        mockNotificationsService = module.get(NotificationsService);
        mockEventEmitter = module.get(EventEmitter2);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendInstantNotification', () => {
        it('should send instant notification to users', async () => {
            const userIds = ['user1', 'user2'];
            const notification: NotificationRequest = {
                type: 'realtime',
                recipients: userIds,
                subject: 'Test Notification',
                content: 'This is a test notification',
                priority: 'medium',
            };

            mockGateway.sendNotificationToUsers.mockResolvedValue();
            mockNotificationsService.sendNotification.mockResolvedValue();

            await service.sendInstantNotification(userIds, notification);

            expect(mockGateway.sendNotificationToUsers).toHaveBeenCalledWith(userIds, notification);
            expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(notification);
        });

        it('should handle errors gracefully', async () => {
            const userIds = ['user1'];
            const notification: NotificationRequest = {
                type: 'realtime',
                recipients: userIds,
                subject: 'Test Notification',
                content: 'This is a test notification',
                priority: 'medium',
            };

            mockGateway.sendNotificationToUsers.mockRejectedValue(new Error('Gateway error'));

            await expect(service.sendInstantNotification(userIds, notification)).rejects.toThrow('Gateway error');
        });
    });

    describe('handleInquiryCreated', () => {
        it('should handle inquiry created event', async () => {
            const payload = {
                inquiry: {
                    id: 'inquiry1',
                    title: 'Test Inquiry',
                    priority: 'high',
                    appId: 'app1',
                },
                assignedTo: 'user1',
                createdBy: 'user2',
            };

            mockGateway.sendNotificationToUsers.mockResolvedValue();
            mockNotificationsService.sendNotification.mockResolvedValue();

            await service.handleInquiryCreated(payload);

            expect(mockGateway.sendNotificationToUsers).toHaveBeenCalledWith(
                ['user1'],
                expect.objectContaining({
                    type: 'realtime',
                    subject: '新しい問い合わせが作成されました',
                    priority: 'high',
                }),
            );
        });

        it('should not send notification if no recipients', async () => {
            const payload = {
                inquiry: {
                    id: 'inquiry1',
                    title: 'Test Inquiry',
                    priority: 'medium',
                    appId: 'app1',
                },
                createdBy: 'user2',
            };

            await service.handleInquiryCreated(payload);

            expect(mockGateway.sendNotificationToUsers).not.toHaveBeenCalled();
        });
    });

    describe('handleInquiryStatusChanged', () => {
        it('should handle inquiry status changed event', async () => {
            const payload = {
                inquiry: {
                    id: 'inquiry1',
                    title: 'Test Inquiry',
                    assignedTo: 'user1',
                },
                oldStatus: 'new',
                newStatus: 'in_progress',
                changedBy: 'user2',
            };

            mockGateway.sendNotificationToUsers.mockResolvedValue();
            mockNotificationsService.sendNotification.mockResolvedValue();

            await service.handleInquiryStatusChanged(payload);

            expect(mockGateway.sendNotificationToUsers).toHaveBeenCalledWith(
                ['user1'],
                expect.objectContaining({
                    type: 'realtime',
                    subject: '問い合わせの状態が変更されました',
                    priority: 'medium',
                }),
            );
        });
    });

    describe('handleSLAViolation', () => {
        it('should handle SLA violation event', async () => {
            const payload = {
                inquiryId: 'inquiry1',
                violationType: 'response_time' as const,
                threshold: 24,
                actualTime: 48,
                severity: 'critical' as const,
            };

            mockGateway.sendNotificationToUsers.mockResolvedValue();
            mockGateway.sendSystemAlert.mockResolvedValue();
            mockNotificationsService.sendNotification.mockResolvedValue();

            await service.handleSLAViolation(payload);

            expect(mockGateway.sendSystemAlert).toHaveBeenCalledWith({
                type: 'outage',
                message: 'SLA違反が発生しました (問い合わせ: inquiry1)',
                severity: 'error',
            });
        });
    });

    describe('sendMaintenanceNotification', () => {
        it('should send maintenance notification', async () => {
            const message = 'System maintenance';
            const scheduledTime = new Date('2024-01-01T10:00:00Z');
            const duration = 60;

            mockGateway.sendSystemAlert.mockResolvedValue();

            await service.sendMaintenanceNotification(message, scheduledTime, duration);

            expect(mockGateway.sendSystemAlert).toHaveBeenCalledWith({
                type: 'maintenance',
                message: expect.stringContaining('System maintenance'),
                severity: 'info',
            });
        });
    });

    describe('getRealtimeStatus', () => {
        it('should return realtime status', () => {
            const connectedUsers = ['user1', 'user2'];
            mockGateway.getConnectedUsers.mockReturnValue(connectedUsers);
            mockGateway.getUserSocketCount.mockReturnValueOnce(2).mockReturnValueOnce(1);

            const status = service.getRealtimeStatus();

            expect(status).toEqual({
                connectedUsers,
                totalConnections: 3,
                userConnections: {
                    user1: 2,
                    user2: 1,
                },
            });
        });
    });

    describe('isUserOnline', () => {
        it('should check if user is online', () => {
            mockGateway.isUserConnected.mockReturnValue(true);

            const result = service.isUserOnline('user1');

            expect(result).toBe(true);
            expect(mockGateway.isUserConnected).toHaveBeenCalledWith('user1');
        });
    });
});