import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TeamsNotificationService } from '../services/teams-notification.service';
import { TeamsNotificationData } from '../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TeamsNotificationService', () => {
    let service: TeamsNotificationService;
    let mockConfigService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const mockConfigServiceProvider = {
            provide: ConfigService,
            useValue: {
                get: jest.fn().mockReturnValue('http://localhost:3000'),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TeamsNotificationService,
                mockConfigServiceProvider,
            ],
        }).compile();

        service = module.get<TeamsNotificationService>(TeamsNotificationService);
        mockConfigService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendTeamsNotification', () => {
        it('should send teams notification successfully', async () => {
            const data: TeamsNotificationData = {
                webhookUrl: 'https://outlook.office.com/webhook/test',
                text: 'Test message',
                title: 'Test Title',
            };

            mockedAxios.post.mockResolvedValue({ status: 200 });

            await service.sendTeamsNotification(data);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                data.webhookUrl,
                expect.objectContaining({
                    '@type': 'MessageCard',
                    '@context': 'https://schema.org/extensions',
                    summary: data.title,
                    themeColor: '0078D4',
                    title: data.title,
                }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000,
                }
            );
        });

        it('should handle API errors', async () => {
            const data: TeamsNotificationData = {
                webhookUrl: 'https://outlook.office.com/webhook/test',
                text: 'Test message',
            };

            mockedAxios.post.mockRejectedValue(new Error('Network error'));

            await expect(service.sendTeamsNotification(data)).rejects.toThrow('Network error');
        });

        it('should handle non-200 status codes', async () => {
            const data: TeamsNotificationData = {
                webhookUrl: 'https://outlook.office.com/webhook/test',
                text: 'Test message',
            };

            mockedAxios.post.mockResolvedValue({ status: 400 });

            await expect(service.sendTeamsNotification(data)).rejects.toThrow('Teams API returned status: 400');
        });
    });

    describe('sendInquiryCreatedNotification', () => {
        it('should send inquiry created notification', async () => {
            const webhookUrl = 'https://outlook.office.com/webhook/test';
            const inquiry = {
                id: 'inquiry1',
                title: 'Test Inquiry',
                content: 'This is a test inquiry',
                priority: 'high',
                createdAt: '2024-01-01T10:00:00Z',
                application: { name: 'Test App' },
            };
            const assignedTo = { name: 'John Doe' };

            mockedAxios.post.mockResolvedValue({ status: 200 });

            await service.sendInquiryCreatedNotification(webhookUrl, inquiry, assignedTo);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                webhookUrl,
                expect.objectContaining({
                    '@type': 'MessageCard',
                    title: '新しい問い合わせ',
                    themeColor: '0078D4',
                    sections: expect.arrayContaining([
                        expect.objectContaining({
                            activityTitle: '🆕 新しい問い合わせが作成されました',
                            activitySubtitle: inquiry.title,
                            facts: expect.arrayContaining([
                                { name: '問い合わせID', value: inquiry.id },
                                { name: 'タイトル', value: inquiry.title },
                                { name: '担当者', value: assignedTo.name },
                            ]),
                        }),
                    ]),
                }),
                expect.any(Object)
            );
        });
    });

    describe('sendSLAViolationNotification', () => {
        it('should send SLA violation notification', async () => {
            const webhookUrl = 'https://outlook.office.com/webhook/test';
            const violation = {
                inquiryId: 'inquiry1',
                violationType: 'response_time',
                threshold: 24,
                actualTime: 48,
                severity: 'critical',
            };

            mockedAxios.post.mockResolvedValue({ status: 200 });

            await service.sendSLAViolationNotification(webhookUrl, violation);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                webhookUrl,
                expect.objectContaining({
                    '@type': 'MessageCard',
                    title: 'SLA違反アラート',
                    themeColor: 'FF0000',
                    sections: expect.arrayContaining([
                        expect.objectContaining({
                            activityTitle: '🚨 SLA違反が発生しました',
                            activitySubtitle: `問い合わせ ${violation.inquiryId}`,
                            facts: expect.arrayContaining([
                                { name: '問い合わせID', value: violation.inquiryId },
                                { name: '違反タイプ', value: violation.violationType },
                                { name: '重要度', value: violation.severity.toUpperCase() },
                            ]),
                        }),
                    ]),
                }),
                expect.any(Object)
            );
        });
    });

    describe('sendStatusChangeNotification', () => {
        it('should send status change notification', async () => {
            const webhookUrl = 'https://outlook.office.com/webhook/test';
            const inquiry = {
                id: 'inquiry1',
                title: 'Test Inquiry',
            };
            const oldStatus = 'new';
            const newStatus = 'in_progress';
            const changedBy = { name: 'Jane Doe' };

            mockedAxios.post.mockResolvedValue({ status: 200 });

            await service.sendStatusChangeNotification(
                webhookUrl,
                inquiry,
                oldStatus,
                newStatus,
                changedBy
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                webhookUrl,
                expect.objectContaining({
                    '@type': 'MessageCard',
                    title: '状態変更通知',
                    themeColor: 'FF9900',
                    sections: expect.arrayContaining([
                        expect.objectContaining({
                            activityTitle: '🔄 問い合わせの状態が変更されました',
                            activitySubtitle: inquiry.title,
                            facts: expect.arrayContaining([
                                { name: '問い合わせ', value: inquiry.title },
                                { name: '変更者', value: changedBy.name },
                                { name: '変更前', value: oldStatus },
                                { name: '変更後', value: newStatus },
                            ]),
                        }),
                    ]),
                }),
                expect.any(Object)
            );
        });
    });

    describe('sendResponseAddedNotification', () => {
        it('should send response added notification', async () => {
            const webhookUrl = 'https://outlook.office.com/webhook/test';
            const inquiry = {
                id: 'inquiry1',
                title: 'Test Inquiry',
            };
            const response = {
                id: 'response1',
                content: 'This is a test response',
                isPublic: true,
                createdAt: '2024-01-01T10:00:00Z',
            };
            const addedBy = { name: 'Support Agent' };

            mockedAxios.post.mockResolvedValue({ status: 200 });

            await service.sendResponseAddedNotification(webhookUrl, inquiry, response, addedBy);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                webhookUrl,
                expect.objectContaining({
                    '@type': 'MessageCard',
                    title: '新しい回答',
                    themeColor: '00B294',
                    sections: expect.arrayContaining([
                        expect.objectContaining({
                            activityTitle: '💬 新しい回答が追加されました',
                            activitySubtitle: inquiry.title,
                            facts: expect.arrayContaining([
                                { name: '問い合わせ', value: inquiry.title },
                                { name: '回答者', value: addedBy.name },
                                { name: '公開設定', value: '公開' },
                            ]),
                        }),
                    ]),
                }),
                expect.any(Object)
            );
        });
    });

    describe('validateWebhookUrl', () => {
        it('should validate correct Teams webhook URL', () => {
            const validUrl = 'https://outlook.office.com/webhook/test';
            expect(service.validateWebhookUrl(validUrl)).toBe(true);
        });

        it('should validate office.com webhook URL', () => {
            const validUrl = 'https://company.office.com/webhook/test';
            expect(service.validateWebhookUrl(validUrl)).toBe(true);
        });

        it('should reject invalid webhook URL', () => {
            const invalidUrl = 'https://example.com/webhook';
            expect(service.validateWebhookUrl(invalidUrl)).toBe(false);
        });

        it('should reject malformed URL', () => {
            const malformedUrl = 'not-a-url';
            expect(service.validateWebhookUrl(malformedUrl)).toBe(false);
        });
    });

    describe('getChannelInfoFromWebhook', () => {
        it('should extract channel info from valid webhook URL', () => {
            const webhookUrl = 'https://outlook.office.com/webhook/test';
            const result = service.getChannelInfoFromWebhook(webhookUrl);

            expect(result.isValid).toBe(true);
            expect(result.info).toContain('Teams Webhook');
        });

        it('should return invalid for malformed URL', () => {
            const webhookUrl = 'invalid-url';
            const result = service.getChannelInfoFromWebhook(webhookUrl);

            expect(result.isValid).toBe(false);
            expect(result.info).toBeUndefined();
        });
    });
});