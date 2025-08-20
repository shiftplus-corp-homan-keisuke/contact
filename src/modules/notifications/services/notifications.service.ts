import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    NotificationRule,
    NotificationLog,
    UserNotificationSettings,
    NotificationTrigger,
    NotificationChannel
} from '../entities';
import {
    NotificationRequest,
    NotificationSettings,
    NotificationChannelSettings,
    NotificationContext
} from '../types';
import {
    CreateNotificationRuleDto,
    UpdateNotificationRuleDto,
    UpdateUserNotificationSettingsDto
} from '../dto';
import { EmailNotificationService } from './email-notification.service';
import { NotificationTemplateService } from './notification-template.service';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @InjectRepository(NotificationRule)
        private notificationRuleRepository: Repository<NotificationRule>,
        @InjectRepository(NotificationLog)
        private notificationLogRepository: Repository<NotificationLog>,
        @InjectRepository(UserNotificationSettings)
        private userNotificationSettingsRepository: Repository<UserNotificationSettings>,
        private emailService: EmailNotificationService,
        private templateService: NotificationTemplateService,
        private eventEmitter: EventEmitter2,
    ) { }

    // 通知ルール管理
    async createNotificationRule(
        dto: CreateNotificationRuleDto,
        createdBy: string,
    ): Promise<NotificationRule> {
        const rule = this.notificationRuleRepository.create({
            ...dto,
            createdBy,
        });

        const savedRule = await this.notificationRuleRepository.save(rule);
        this.logger.log(`Created notification rule: ${savedRule.id}`);

        return savedRule;
    }

    async updateNotificationRule(
        id: string,
        dto: UpdateNotificationRuleDto,
    ): Promise<NotificationRule> {
        await this.notificationRuleRepository.update(id, dto);
        const updatedRule = await this.notificationRuleRepository.findOne({
            where: { id },
        });

        if (!updatedRule) {
            throw new Error(`Notification rule not found: ${id}`);
        }

        this.logger.log(`Updated notification rule: ${id}`);
        return updatedRule;
    }

    async getNotificationRules(createdBy?: string): Promise<NotificationRule[]> {
        const where = createdBy ? { createdBy } : {};
        return this.notificationRuleRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async getNotificationRule(id: string): Promise<NotificationRule> {
        const rule = await this.notificationRuleRepository.findOne({
            where: { id },
        });

        if (!rule) {
            throw new Error(`Notification rule not found: ${id}`);
        }

        return rule;
    }

    async deleteNotificationRule(id: string): Promise<void> {
        const result = await this.notificationRuleRepository.delete(id);
        if (result.affected === 0) {
            throw new Error(`Notification rule not found: ${id}`);
        }

        this.logger.log(`Deleted notification rule: ${id}`);
    }

    // ユーザー通知設定管理
    async getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
        const settings = await this.userNotificationSettingsRepository.find({
            where: { userId },
        });

        return {
            userId,
            settings: settings.map(s => ({
                trigger: s.trigger,
                channel: s.channel,
                isEnabled: s.isEnabled,
                emailAddress: s.emailAddress,
                slackWebhookUrl: s.slackWebhookUrl,
                teamsWebhookUrl: s.teamsWebhookUrl,
                webhookUrl: s.webhookUrl,
            })),
        };
    }

    async updateUserNotificationSettings(
        userId: string,
        dto: UpdateUserNotificationSettingsDto,
    ): Promise<void> {
        // 既存設定を削除
        await this.userNotificationSettingsRepository.delete({ userId });

        // 新しい設定を保存
        const entities = dto.settings.map(setting =>
            this.userNotificationSettingsRepository.create({
                userId,
                ...setting,
            })
        );

        await this.userNotificationSettingsRepository.save(entities);
        this.logger.log(`Updated notification settings for user: ${userId}`);
    }

    // 通知送信
    async sendNotification(request: NotificationRequest): Promise<void> {
        try {
            const log = await this.createNotificationLog(request);

            switch (request.type) {
                case 'email':
                    await this.sendEmailNotification(request);
                    break;
                case 'slack':
                    await this.sendSlackNotification(request);
                    break;
                case 'teams':
                    await this.sendTeamsNotification(request);
                    break;
                case 'webhook':
                    await this.sendWebhookNotification(request);
                    break;
                default:
                    throw new Error(`Unsupported notification type: ${request.type}`);
            }

            await this.updateNotificationLogStatus(log.id, 'sent');
            this.logger.log(`Notification sent successfully: ${log.id}`);
        } catch (error) {
            this.logger.error(`Failed to send notification: ${error.message}`, error.stack);
            throw error;
        }
    }

    async sendBulkNotifications(requests: NotificationRequest[]): Promise<void> {
        const promises = requests.map(request =>
            this.sendNotification(request).catch(error => {
                this.logger.error(`Failed to send bulk notification: ${error.message}`);
                return error;
            })
        );

        await Promise.allSettled(promises);
    }

    // 通知トリガー処理
    async triggerNotification(
        trigger: NotificationTrigger,
        context: NotificationContext,
        triggeredBy?: string,
    ): Promise<void> {
        try {
            // アクティブなルールを取得
            const rules = await this.notificationRuleRepository.find({
                where: { trigger, isActive: true },
            });

            for (const rule of rules) {
                if (this.evaluateConditions(rule.conditions, context)) {
                    await this.executeNotificationActions(rule, context, triggeredBy);
                }
            }

            this.logger.log(`Processed ${rules.length} notification rules for trigger: ${trigger}`);
        } catch (error) {
            this.logger.error(`Failed to trigger notifications: ${error.message}`, error.stack);
        }
    }

    private async sendEmailNotification(request: NotificationRequest): Promise<void> {
        await this.emailService.sendEmail({
            to: request.recipients,
            subject: request.subject,
            content: request.content,
        });
    }

    private async sendSlackNotification(request: NotificationRequest): Promise<void> {
        // Slack通知の実装（後のタスクで詳細実装）
        this.logger.log('Slack notification would be sent here');
    }

    private async sendTeamsNotification(request: NotificationRequest): Promise<void> {
        // Teams通知の実装（後のタスクで詳細実装）
        this.logger.log('Teams notification would be sent here');
    }

    private async sendWebhookNotification(request: NotificationRequest): Promise<void> {
        // Webhook通知の実装（後のタスクで詳細実装）
        this.logger.log('Webhook notification would be sent here');
    }

    private async createNotificationLog(request: NotificationRequest): Promise<NotificationLog> {
        const logs = request.recipients.map(recipient =>
            this.notificationLogRepository.create({
                ruleId: request.ruleId,
                channel: request.type,
                recipient,
                subject: request.subject,
                content: request.content,
                status: 'pending',
                triggeredBy: request.triggeredBy,
                metadata: request.metadata,
            })
        );

        const savedLogs = await this.notificationLogRepository.save(logs);
        return savedLogs[0]; // 最初のログを返す
    }

    private async updateNotificationLogStatus(
        logId: string,
        status: 'sent' | 'failed',
        errorMessage?: string,
    ): Promise<void> {
        const updateData: any = { status };

        if (status === 'sent') {
            updateData.sentAt = new Date();
        } else if (status === 'failed') {
            updateData.errorMessage = errorMessage;
        }

        await this.notificationLogRepository.update(logId, updateData);
    }

    private evaluateConditions(conditions: any[], context: NotificationContext): boolean {
        if (!conditions || conditions.length === 0) {
            return true; // 条件がない場合は常に実行
        }

        return conditions.every(condition => {
            const value = this.getNestedValue(context, condition.field);

            switch (condition.operator) {
                case 'equals':
                    return value === condition.value;
                case 'contains':
                    return String(value).includes(condition.value);
                case 'greater_than':
                    return Number(value) > Number(condition.value);
                case 'less_than':
                    return Number(value) < Number(condition.value);
                default:
                    return false;
            }
        });
    }

    private async executeNotificationActions(
        rule: NotificationRule,
        context: NotificationContext,
        triggeredBy?: string,
    ): Promise<void> {
        for (const action of rule.actions) {
            try {
                // テンプレートを使用して内容を生成
                const templateId = `${rule.trigger}_${action.type}`;
                const template = this.templateService.getTemplate(templateId);

                let subject = `通知: ${rule.name}`;
                let content = JSON.stringify(context, null, 2);

                if (template) {
                    const rendered = this.templateService.renderTemplate(templateId, context);
                    subject = rendered.subject;
                    content = rendered.content;
                }

                const request: NotificationRequest = {
                    type: action.type,
                    recipients: action.recipients,
                    subject,
                    content,
                    priority: 'medium',
                    ruleId: rule.id,
                    triggeredBy,
                    metadata: { ruleId: rule.id, trigger: rule.trigger },
                };

                await this.sendNotification(request);
            } catch (error) {
                this.logger.error(`Failed to execute notification action: ${error.message}`);
            }
        }
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    // 通知ログ取得
    async getNotificationLogs(
        filters?: {
            channel?: NotificationChannel;
            status?: string;
            dateFrom?: Date;
            dateTo?: Date;
        },
        page = 1,
        limit = 20,
    ): Promise<{ logs: NotificationLog[]; total: number }> {
        const queryBuilder = this.notificationLogRepository.createQueryBuilder('log');

        if (filters?.channel) {
            queryBuilder.andWhere('log.channel = :channel', { channel: filters.channel });
        }

        if (filters?.status) {
            queryBuilder.andWhere('log.status = :status', { status: filters.status });
        }

        if (filters?.dateFrom) {
            queryBuilder.andWhere('log.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
        }

        if (filters?.dateTo) {
            queryBuilder.andWhere('log.createdAt <= :dateTo', { dateTo: filters.dateTo });
        }

        const [logs, total] = await queryBuilder
            .orderBy('log.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return { logs, total };
    }

    /**
     * SLA違反通知を送信
     */
    async sendSlaViolationNotification(violation: any): Promise<void> {
        try {
            const inquiry = violation.inquiry || await this.getInquiryById(violation.inquiryId);
            const config = violation.slaConfig || await this.getSlaConfigById(violation.slaConfigId);

            const notification: NotificationRequest = {
                type: 'email',
                recipients: await this.getSlaViolationRecipients(inquiry, violation),
                subject: `SLA違反が発生しました - ${violation.violationType}`,
                content: this.buildSlaViolationMessage(violation, inquiry, config),
                priority: this.mapSeverityToPriority(violation.severity),
                metadata: {
                    violationId: violation.id,
                    inquiryId: violation.inquiryId,
                    violationType: violation.violationType,
                    severity: violation.severity,
                    delayHours: violation.delayHours,
                },
            };

            await this.sendNotification(notification);

            this.logger.log(`SLA違反通知を送信しました: ${violation.id}`);
        } catch (error) {
            this.logger.error(`SLA違反通知の送信に失敗しました: ${violation.id}`, error);
        }
    }

    /**
     * エスカレーション通知を送信
     */
    async sendEscalationNotification(escalation: any): Promise<void> {
        try {
            const inquiry = escalation.inquiry || await this.getInquiryById(escalation.inquiryId);
            const toUser = escalation.toUser || await this.getUserById(escalation.escalatedTo);
            const fromUser = escalation.fromUser || (escalation.escalatedFrom ? await this.getUserById(escalation.escalatedFrom) : null);

            const notification: NotificationRequest = {
                type: 'email',
                recipients: await this.getEscalationRecipients(escalation, toUser),
                subject: `問い合わせがエスカレーションされました`,
                content: this.buildEscalationMessage(escalation, inquiry, fromUser, toUser),
                priority: escalation.isAutomatic ? 'high' : 'medium',
                metadata: {
                    escalationId: escalation.id,
                    inquiryId: escalation.inquiryId,
                    escalationReason: escalation.escalationReason,
                    escalationLevel: escalation.escalationLevel,
                    isAutomatic: escalation.isAutomatic,
                },
            };

            await this.sendNotification(notification);

            this.logger.log(`エスカレーション通知を送信しました: ${escalation.id}`);
        } catch (error) {
            this.logger.error(`エスカレーション通知の送信に失敗しました: ${escalation.id}`, error);
        }
    }

    /**
     * SLA違反メッセージを構築
     */
    private buildSlaViolationMessage(violation: any, inquiry: any, config: any): string {
        const violationTypeMap = {
            response_time: '応答時間',
            resolution_time: '解決時間',
            escalation_time: 'エスカレーション時間',
        };

        const severityMap = {
            minor: '軽微',
            major: '重要',
            critical: '緊急',
        };

        return `
問い合わせ「${inquiry.title}」でSLA違反が発生しました。

違反タイプ: ${violationTypeMap[violation.violationType] || violation.violationType}
重要度: ${severityMap[violation.severity] || violation.severity}
遅延時間: ${violation.delayHours}時間
期待時間: ${violation.expectedTime}

問い合わせID: ${inquiry.id}
アプリケーション: ${inquiry.application?.name || 'N/A'}
優先度: ${inquiry.priority}

早急な対応をお願いします。
        `.trim();
    }

    /**
     * エスカレーションメッセージを構築
     */
    private buildEscalationMessage(escalation: any, inquiry: any, fromUser: any, toUser: any): string {
        const reasonMap = {
            sla_violation: 'SLA違反',
            complexity: '複雑性',
            manual: '手動',
            priority_change: '優先度変更',
        };

        const escalationType = escalation.isAutomatic ? '自動エスカレーション' : '手動エスカレーション';

        return `
問い合わせ「${inquiry.title}」が${escalationType}されました。

エスカレーション先: ${toUser.name}
${fromUser ? `エスカレーション元: ${fromUser.name}` : ''}
理由: ${reasonMap[escalation.escalationReason] || escalation.escalationReason}
レベル: ${escalation.escalationLevel}
${escalation.comment ? `コメント: ${escalation.comment}` : ''}

問い合わせID: ${inquiry.id}
アプリケーション: ${inquiry.application?.name || 'N/A'}
優先度: ${inquiry.priority}

対応をお願いします。
        `.trim();
    }

    /**
     * 重要度を優先度にマッピング
     */
    private mapSeverityToPriority(severity: string): 'low' | 'medium' | 'high' | 'urgent' {
        switch (severity) {
            case 'critical':
                return 'urgent';
            case 'major':
                return 'high';
            case 'minor':
                return 'medium';
            default:
                return 'medium';
        }
    }

    /**
     * SLA違反通知の受信者を取得
     */
    private async getSlaViolationRecipients(inquiry: any, violation: any): Promise<string[]> {
        const recipients = [];

        // 担当者
        if (inquiry.assignedTo) {
            recipients.push(inquiry.assignedTo);
        }

        // 重要度が高い場合は管理者にも通知
        if (violation.severity === 'critical' || violation.severity === 'major') {
            const supervisors = await this.getUsersByRole('supervisor');
            recipients.push(...supervisors.map(u => u.id));
        }

        // 緊急の場合は管理者にも通知
        if (violation.severity === 'critical') {
            const admins = await this.getUsersByRole('admin');
            recipients.push(...admins.map(u => u.id));
        }

        return [...new Set(recipients)]; // 重複を除去
    }

    /**
     * エスカレーション通知の受信者を取得
     */
    private async getEscalationRecipients(escalation: any, toUser: any): Promise<string[]> {
        const recipients = [escalation.escalatedTo];

        // 自動エスカレーションの場合は管理者にも通知
        if (escalation.isAutomatic) {
            const supervisors = await this.getUsersByRole('supervisor');
            recipients.push(...supervisors.map(u => u.id));
        }

        return [...new Set(recipients)]; // 重複を除去
    }

    /**
     * 問い合わせを取得（ヘルパーメソッド）
     */
    private async getInquiryById(inquiryId: string): Promise<any> {
        // 実際の実装では InquiriesService を注入して使用
        return { id: inquiryId, title: 'Sample Inquiry' };
    }

    /**
     * SLA設定を取得（ヘルパーメソッド）
     */
    private async getSlaConfigById(configId: string): Promise<any> {
        // 実際の実装では SlaMonitoringService を注入して使用
        return { id: configId };
    }

    /**
     * ユーザーを取得（ヘルパーメソッド）
     */
    private async getUserById(userId: string): Promise<any> {
        // 実際の実装では UsersService を注入して使用
        return { id: userId, name: 'Sample User' };
    }

    /**
     * 役割別ユーザーを取得（ヘルパーメソッド）
     */
    private async getUsersByRole(roleName: string): Promise<any[]> {
        // 実際の実装では UsersService を注入して使用
        return [];
    }
}