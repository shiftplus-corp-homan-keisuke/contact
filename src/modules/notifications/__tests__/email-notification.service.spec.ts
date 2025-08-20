import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailNotificationService } from '../services/email-notification.service';
import { EmailNotificationData } from '../types';
import * as nodemailer from 'nodemailer';

// nodemailerをモック
jest.mock('nodemailer');
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe('EmailNotificationService', () => {
    let service: EmailNotificationService;
    let configService: ConfigService;
    let mockTransporter: any;

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        mockTransporter = {
            sendMail: jest.fn(),
            verify: jest.fn(),
        };

        mockNodemailer.createTransport.mockReturnValue(mockTransporter);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmailNotificationService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<EmailNotificationService>(EmailNotificationService);
        configService = module.get<ConfigService>(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('sendEmail', () => {
        it('メールを正常に送信できること', async () => {
            const emailData: EmailNotificationData = {
                to: ['test@example.com'],
                subject: 'テストメール',
                content: 'テスト内容',
            };

            const mockResult = { messageId: 'test-message-id' };
            mockTransporter.sendMail.mockResolvedValue(mockResult);
            mockConfigService.get.mockReturnValue('noreply@example.com');

            await service.sendEmail(emailData);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'noreply@example.com',
                to: 'test@example.com',
                subject: 'テストメール',
                text: 'テスト内容',
                html: 'テスト内容',
                attachments: undefined,
            });
        });

        it('HTMLメールを送信できること', async () => {
            const emailData: EmailNotificationData = {
                to: ['test@example.com'],
                subject: 'テストメール',
                content: 'テスト内容',
                html: '<h1>テスト内容</h1>',
            };

            const mockResult = { messageId: 'test-message-id' };
            mockTransporter.sendMail.mockResolvedValue(mockResult);
            mockConfigService.get.mockReturnValue('noreply@example.com');

            await service.sendEmail(emailData);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'noreply@example.com',
                to: 'test@example.com',
                subject: 'テストメール',
                text: 'テスト内容',
                html: '<h1>テスト内容</h1>',
                attachments: undefined,
            });
        });

        it('添付ファイル付きメールを送信できること', async () => {
            const emailData: EmailNotificationData = {
                to: ['test@example.com'],
                subject: 'テストメール',
                content: 'テスト内容',
                attachments: [
                    {
                        filename: 'test.txt',
                        content: Buffer.from('test content'),
                        contentType: 'text/plain',
                    },
                ],
            };

            const mockResult = { messageId: 'test-message-id' };
            mockTransporter.sendMail.mockResolvedValue(mockResult);
            mockConfigService.get.mockReturnValue('noreply@example.com');

            await service.sendEmail(emailData);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'noreply@example.com',
                to: 'test@example.com',
                subject: 'テストメール',
                text: 'テスト内容',
                html: 'テスト内容',
                attachments: [
                    {
                        filename: 'test.txt',
                        content: Buffer.from('test content'),
                        contentType: 'text/plain',
                    },
                ],
            });
        });

        it('複数の受信者にメールを送信できること', async () => {
            const emailData: EmailNotificationData = {
                to: ['test1@example.com', 'test2@example.com'],
                subject: 'テストメール',
                content: 'テスト内容',
            };

            const mockResult = { messageId: 'test-message-id' };
            mockTransporter.sendMail.mockResolvedValue(mockResult);
            mockConfigService.get.mockReturnValue('noreply@example.com');

            await service.sendEmail(emailData);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'noreply@example.com',
                to: 'test1@example.com, test2@example.com',
                subject: 'テストメール',
                text: 'テスト内容',
                html: 'テスト内容',
                attachments: undefined,
            });
        });

        it('メール送信エラーを適切に処理すること', async () => {
            const emailData: EmailNotificationData = {
                to: ['test@example.com'],
                subject: 'テストメール',
                content: 'テスト内容',
            };

            const error = new Error('SMTP connection failed');
            mockTransporter.sendMail.mockRejectedValue(error);

            await expect(service.sendEmail(emailData)).rejects.toThrow('SMTP connection failed');
        });
    });

    describe('sendBulkEmails', () => {
        it('複数のメールを一括送信できること', async () => {
            const emails: EmailNotificationData[] = [
                {
                    to: ['test1@example.com'],
                    subject: 'テストメール1',
                    content: 'テスト内容1',
                },
                {
                    to: ['test2@example.com'],
                    subject: 'テストメール2',
                    content: 'テスト内容2',
                },
            ];

            const mockResult = { messageId: 'test-message-id' };
            mockTransporter.sendMail.mockResolvedValue(mockResult);
            mockConfigService.get.mockReturnValue('noreply@example.com');

            await service.sendBulkEmails(emails);

            expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
        });

        it('一部のメール送信が失敗しても他のメールは送信されること', async () => {
            const emails: EmailNotificationData[] = [
                {
                    to: ['test1@example.com'],
                    subject: 'テストメール1',
                    content: 'テスト内容1',
                },
                {
                    to: ['test2@example.com'],
                    subject: 'テストメール2',
                    content: 'テスト内容2',
                },
            ];

            const mockResult = { messageId: 'test-message-id' };
            mockTransporter.sendMail
                .mockResolvedValueOnce(mockResult)
                .mockRejectedValueOnce(new Error('Failed to send'));
            mockConfigService.get.mockReturnValue('noreply@example.com');

            await service.sendBulkEmails(emails);

            expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
        });
    });

    describe('verifyConnection', () => {
        it('SMTP接続を正常に検証できること', async () => {
            mockTransporter.verify.mockResolvedValue(true);

            const result = await service.verifyConnection();

            expect(result).toBe(true);
            expect(mockTransporter.verify).toHaveBeenCalled();
        });

        it('SMTP接続検証の失敗を適切に処理すること', async () => {
            mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

            const result = await service.verifyConnection();

            expect(result).toBe(false);
            expect(mockTransporter.verify).toHaveBeenCalled();
        });
    });

    describe('convertTextToHtml', () => {
        it('テキストをHTMLに変換できること', () => {
            const service = new EmailNotificationService(configService);

            // privateメソッドにアクセスするためのハック
            const convertTextToHtml = (service as any).convertTextToHtml.bind(service);

            const text = 'Hello\n**bold text**\n*italic text*';
            const html = convertTextToHtml(text);

            expect(html).toBe('Hello<br><strong>bold text</strong><br><em>italic text</em>');
        });
    });
});