import { Injectable, Logger } from '@nestjs/common';
import { NotificationTemplate, NotificationContext } from '../types';
import { NotificationTrigger, NotificationChannel } from '../entities';

@Injectable()
export class NotificationTemplateService {
    private readonly logger = new Logger(NotificationTemplateService.name);
    private templates: Map<string, NotificationTemplate> = new Map();

    constructor() {
        this.initializeDefaultTemplates();
    }

    private initializeDefaultTemplates() {
        // 新規問い合わせ作成時のメールテンプレート
        this.addTemplate({
            id: 'inquiry_created_email',
            name: '新規問い合わせ通知（メール）',
            trigger: 'inquiry_created',
            channel: 'email',
            subject: '新規問い合わせが登録されました - {{inquiry.title}}',
            content: `
新規問い合わせが登録されました。

問い合わせID: {{inquiry.id}}
タイトル: {{inquiry.title}}
アプリケーション: {{application.name}}
優先度: {{inquiry.priority}}
顧客: {{inquiry.customerName}} ({{inquiry.customerEmail}})

内容:
{{inquiry.content}}

対応をお願いします。

管理画面: {{baseUrl}}/inquiries/{{inquiry.id}}
      `.trim(),
            variables: ['inquiry.id', 'inquiry.title', 'inquiry.content', 'inquiry.priority', 'inquiry.customerName', 'inquiry.customerEmail', 'application.name', 'baseUrl'],
        });

        // 状態変更時のメールテンプレート
        this.addTemplate({
            id: 'status_changed_email',
            name: '問い合わせ状態変更通知（メール）',
            trigger: 'status_changed',
            channel: 'email',
            subject: '問い合わせ状態が変更されました - {{inquiry.title}}',
            content: `
問い合わせの状態が変更されました。

問い合わせID: {{inquiry.id}}
タイトル: {{inquiry.title}}
変更前: {{oldStatus}}
変更後: {{newStatus}}
変更者: {{user.name}}

{{#if comment}}
コメント: {{comment}}
{{/if}}

管理画面: {{baseUrl}}/inquiries/{{inquiry.id}}
      `.trim(),
            variables: ['inquiry.id', 'inquiry.title', 'oldStatus', 'newStatus', 'user.name', 'comment', 'baseUrl'],
        });

        // SLA違反アラートのメールテンプレート
        this.addTemplate({
            id: 'sla_violation_email',
            name: 'SLA違反アラート（メール）',
            trigger: 'sla_violation',
            channel: 'email',
            subject: 'SLA違反アラート - {{inquiry.title}}',
            content: `
SLA違反が発生しました。

問い合わせID: {{inquiry.id}}
タイトル: {{inquiry.title}}
違反タイプ: {{violation.type}}
閾値: {{violation.threshold}}時間
実際の時間: {{violation.actualTime}}時間
重要度: {{violation.severity}}

早急な対応をお願いします。

管理画面: {{baseUrl}}/inquiries/{{inquiry.id}}
      `.trim(),
            variables: ['inquiry.id', 'inquiry.title', 'violation.type', 'violation.threshold', 'violation.actualTime', 'violation.severity', 'baseUrl'],
        });

        // Slack通知テンプレート
        this.addTemplate({
            id: 'inquiry_created_slack',
            name: '新規問い合わせ通知（Slack）',
            trigger: 'inquiry_created',
            channel: 'slack',
            subject: '新規問い合わせ',
            content: `
🆕 新規問い合わせが登録されました

*{{inquiry.title}}*
アプリ: {{application.name}}
優先度: {{inquiry.priority}}
顧客: {{inquiry.customerName}}

<{{baseUrl}}/inquiries/{{inquiry.id}}|詳細を見る>
      `.trim(),
            variables: ['inquiry.title', 'application.name', 'inquiry.priority', 'inquiry.customerName', 'inquiry.id', 'baseUrl'],
        });

        this.logger.log(`Initialized ${this.templates.size} default templates`);
    }

    addTemplate(template: NotificationTemplate): void {
        this.templates.set(template.id, template);
    }

    getTemplate(id: string): NotificationTemplate | undefined {
        return this.templates.get(id);
    }

    getTemplatesByTrigger(trigger: NotificationTrigger): NotificationTemplate[] {
        return Array.from(this.templates.values()).filter(t => t.trigger === trigger);
    }

    getTemplatesByChannel(channel: NotificationChannel): NotificationTemplate[] {
        return Array.from(this.templates.values()).filter(t => t.channel === channel);
    }

    renderTemplate(templateId: string, context: NotificationContext): { subject: string; content: string } {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const subject = this.renderString(template.subject, context);
        const content = this.renderString(template.content, context);

        return { subject, content };
    }

    private renderString(template: string, context: NotificationContext): string {
        let result = template;

        // 単純な変数置換 {{variable.path}}
        result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(context, path.trim());
            return value !== undefined ? String(value) : match;
        });

        // 条件分岐 {{#if condition}}...{{/if}}
        result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            const value = this.getNestedValue(context, condition.trim());
            return value ? content : '';
        });

        return result;
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    getAllTemplates(): NotificationTemplate[] {
        return Array.from(this.templates.values());
    }

    removeTemplate(id: string): boolean {
        return this.templates.delete(id);
    }
}