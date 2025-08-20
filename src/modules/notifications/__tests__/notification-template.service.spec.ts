import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateService } from '../services/notification-template.service';
import { NotificationTemplate, NotificationContext } from '../types';

describe('NotificationTemplateService', () => {
    let service: NotificationTemplateService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NotificationTemplateService],
        }).compile();

        service = module.get<NotificationTemplateService>(NotificationTemplateService);
    });

    describe('初期化', () => {
        it('デフォルトテンプレートが初期化されること', () => {
            const templates = service.getAllTemplates();
            expect(templates.length).toBeGreaterThan(0);

            // 新規問い合わせ作成のメールテンプレートが存在することを確認
            const inquiryCreatedTemplate = service.getTemplate('inquiry_created_email');
            expect(inquiryCreatedTemplate).toBeDefined();
            expect(inquiryCreatedTemplate?.trigger).toBe('inquiry_created');
            expect(inquiryCreatedTemplate?.channel).toBe('email');
        });
    });

    describe('addTemplate', () => {
        it('新しいテンプレートを追加できること', () => {
            const template: NotificationTemplate = {
                id: 'custom_template',
                name: 'カスタムテンプレート',
                trigger: 'inquiry_created',
                channel: 'email',
                subject: 'カスタム件名',
                content: 'カスタム内容',
                variables: ['test.variable'],
            };

            service.addTemplate(template);
            const retrieved = service.getTemplate('custom_template');

            expect(retrieved).toEqual(template);
        });
    });

    describe('getTemplate', () => {
        it('存在するテンプレートを取得できること', () => {
            const template = service.getTemplate('inquiry_created_email');
            expect(template).toBeDefined();
            expect(template?.id).toBe('inquiry_created_email');
        });

        it('存在しないテンプレートの場合はundefinedを返すこと', () => {
            const template = service.getTemplate('non_existent_template');
            expect(template).toBeUndefined();
        });
    });

    describe('getTemplatesByTrigger', () => {
        it('指定されたトリガーのテンプレートを取得できること', () => {
            const templates = service.getTemplatesByTrigger('inquiry_created');
            expect(templates.length).toBeGreaterThan(0);
            expect(templates.every(t => t.trigger === 'inquiry_created')).toBe(true);
        });

        it('存在しないトリガーの場合は空配列を返すこと', () => {
            const templates = service.getTemplatesByTrigger('non_existent_trigger' as any);
            expect(templates).toEqual([]);
        });
    });

    describe('getTemplatesByChannel', () => {
        it('指定されたチャネルのテンプレートを取得できること', () => {
            const templates = service.getTemplatesByChannel('email');
            expect(templates.length).toBeGreaterThan(0);
            expect(templates.every(t => t.channel === 'email')).toBe(true);
        });

        it('存在しないチャネルの場合は空配列を返すこと', () => {
            const templates = service.getTemplatesByChannel('non_existent_channel' as any);
            expect(templates).toEqual([]);
        });
    });

    describe('renderTemplate', () => {
        it('テンプレートを正常にレンダリングできること', () => {
            const context: NotificationContext = {
                inquiry: {
                    id: 'inquiry-123',
                    title: 'テスト問い合わせ',
                    content: 'テスト内容',
                    priority: 'high',
                    customerName: '田中太郎',
                    customerEmail: 'tanaka@example.com',
                },
                application: {
                    name: 'テストアプリ',
                },
                baseUrl: 'https://example.com',
            };

            const result = service.renderTemplate('inquiry_created_email', context);

            expect(result.subject).toContain('テスト問い合わせ');
            expect(result.content).toContain('inquiry-123');
            expect(result.content).toContain('テストアプリ');
            expect(result.content).toContain('田中太郎');
            expect(result.content).toContain('tanaka@example.com');
            expect(result.content).toContain('https://example.com');
        });

        it('存在しないテンプレートの場合はエラーを投げること', () => {
            const context: NotificationContext = {};

            expect(() => {
                service.renderTemplate('non_existent_template', context);
            }).toThrow('Template not found: non_existent_template');
        });

        it('条件分岐を正しく処理できること', () => {
            // 条件分岐を含むテンプレートを追加
            const template: NotificationTemplate = {
                id: 'conditional_template',
                name: '条件分岐テンプレート',
                trigger: 'status_changed',
                channel: 'email',
                subject: '状態変更通知',
                content: `
状態が変更されました。
{{#if comment}}
コメント: {{comment}}
{{/if}}
変更者: {{user.name}}
        `.trim(),
                variables: ['comment', 'user.name'],
            };

            service.addTemplate(template);

            // コメントありの場合
            const contextWithComment: NotificationContext = {
                comment: 'テストコメント',
                user: { name: '管理者' },
            };

            const resultWithComment = service.renderTemplate('conditional_template', contextWithComment);
            expect(resultWithComment.content).toContain('コメント: テストコメント');
            expect(resultWithComment.content).toContain('変更者: 管理者');

            // コメントなしの場合
            const contextWithoutComment: NotificationContext = {
                user: { name: '管理者' },
            };

            const resultWithoutComment = service.renderTemplate('conditional_template', contextWithoutComment);
            expect(resultWithoutComment.content).not.toContain('コメント:');
            expect(resultWithoutComment.content).toContain('変更者: 管理者');
        });

        it('ネストしたオブジェクトの値を正しく取得できること', () => {
            const template: NotificationTemplate = {
                id: 'nested_template',
                name: 'ネストテンプレート',
                trigger: 'inquiry_created',
                channel: 'email',
                subject: '{{inquiry.customer.name}}さんからの問い合わせ',
                content: '{{inquiry.customer.company.name}}の{{inquiry.customer.name}}さんから問い合わせがありました。',
                variables: ['inquiry.customer.name', 'inquiry.customer.company.name'],
            };

            service.addTemplate(template);

            const context: NotificationContext = {
                inquiry: {
                    customer: {
                        name: '田中太郎',
                        company: {
                            name: 'テスト株式会社',
                        },
                    },
                },
            };

            const result = service.renderTemplate('nested_template', context);
            expect(result.subject).toBe('田中太郎さんからの問い合わせ');
            expect(result.content).toBe('テスト株式会社の田中太郎さんから問い合わせがありました。');
        });

        it('存在しない変数の場合は元の文字列を保持すること', () => {
            const template: NotificationTemplate = {
                id: 'missing_var_template',
                name: '変数なしテンプレート',
                trigger: 'inquiry_created',
                channel: 'email',
                subject: '{{nonexistent.variable}}',
                content: '{{another.missing.variable}}',
                variables: [],
            };

            service.addTemplate(template);

            const context: NotificationContext = {};
            const result = service.renderTemplate('missing_var_template', context);

            expect(result.subject).toBe('{{nonexistent.variable}}');
            expect(result.content).toBe('{{another.missing.variable}}');
        });
    });

    describe('removeTemplate', () => {
        it('テンプレートを削除できること', () => {
            const template: NotificationTemplate = {
                id: 'temp_template',
                name: '一時テンプレート',
                trigger: 'inquiry_created',
                channel: 'email',
                subject: '一時件名',
                content: '一時内容',
                variables: [],
            };

            service.addTemplate(template);
            expect(service.getTemplate('temp_template')).toBeDefined();

            const removed = service.removeTemplate('temp_template');
            expect(removed).toBe(true);
            expect(service.getTemplate('temp_template')).toBeUndefined();
        });

        it('存在しないテンプレートの削除はfalseを返すこと', () => {
            const removed = service.removeTemplate('non_existent_template');
            expect(removed).toBe(false);
        });
    });
});