import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SlackNotificationService } from '../services/slack-notification.service';
import { SlackNotificationData } from '../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SlackNotificationService', () => {
    let service: SlackNotificationService;
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
                SlackNotificationService,
                mockConfigServiceProvider,
            ],
        }).compile();

        service = module.get<SlackNotificationService>(SlackNotificationService);
        mockConfigService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendSlackNotification', () => {
        it('should send slack notification successfully', async () => {
            const data: SlackNotificationData = {
                webhookUrl: 'https://hooks.slack.com/services/test',
                text: 'Test message',
            };

            mockedAxios.post.mockResolvedValue({ status: 200 });

            await service.sendSlackNotification(data);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                data.webhookUrl,
                { text: data.text },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000,
                }
            );
        });

        it('should handle API errors', async () => {
            const data: SlackNotificationData = {
                webhookUrl: 'https://hooks.slack.com/services/test',
                text: 'Test message',
            };

            mockedAxios.post.mockRejectedValue(new Error('Network error'));

            await expect(service.sendSlackNotification(data)).rejects.toThrow('Network error');
        });

        it('should handle non-200 status codes', async () => {
            const data: SlackNotificationData = {
                webhookUrl: 'https://hooks.slack.com/services/test',
                text: 'Test message',
            };

            mockedAxios.post.mockResolvedValue({ status: 400 });

            await expect(service.sendSlackNotification(data)).rejects.toThrow('Slack API returned status: 400');
        });
    });

    describe('sendInquiryCreatedNotification', () => {
        it('should send inquiry created notification', async () => {
            const webhookUrl = 'https://hooks.slack.com/services/test';
            const inquiry = {
                id: 'inquiry1',
                title: 'Test Inquiry',
                content: 'This is a test inquiry',
                priority: 'high',
                application: { name: 'Test App' },
            };
            const assignedTo = { name: 'John Doe' };

            mockedAxios.post.mockResolvedValue({ status: 200 });

            await service.sendInquiryCreatedNotification(webhookUrl, inquiry, assignedTo);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                webhookUrl,
                expect.objectContaining({
                    text: `新しい問い合わせ: ${inquiry.title}`,
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: '🆕 新しい問い合わせが作成されました',
                            },
                        }),
                    ]),
                }),
                expect.any(Object)
            );
        });
    });

    describe('sendSLAViolationNotification', () => {
        it('should send SLA violation notification', async () => {
            const webhookUrl = 'https://hooks.slack.com/services/test';
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
                    text: `SLA違反: ${violation.inquiryId}`,
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: '🚨 SLA違反が発生しました',
                            },
                        }),
                    ]),
                }),
                expect.any(Object)
            );
        });
    });

    describe('sendStatusChangeNotification', () => {
        it('should send status change notification', async () => {
            const webhookUrl = 'https://hooks.slack.com/services/test';
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
                    text: `状態変更: ${inquiry.title} (${oldStatus} → ${newStatus})`,
                    blocks: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: '🔄 *問い合わせの状態が変更されました*',
                            },
                        }),
                    ]),
                }),
                expect.any(Object)
            );
        });
    });

    describe('validateWebhookUrl', () => {
        it('should validate correct Slack webhook URL', () => {
            const validUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
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
            const webhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
            const result = service.getChannelInfoFromWebhook(webhookUrl);

            expect(result.isValid).toBe(true);
            expect(result.info).toContain('Slack Channel ID');
        });

        it('should return invalid for malformed URL', () => {
            const webhookUrl = 'invalid-url';
            const result = service.getChannelInfoFromWebhook(webhookUrl);

            expect(result.isValid).toBe(false);
            expect(result.info).toBeUndefined();
        });
    });
});