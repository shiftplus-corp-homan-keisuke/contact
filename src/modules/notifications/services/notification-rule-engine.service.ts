import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationRule, NotificationTrigger } from '../entities';
import { NotificationContext, NotificationRequest } from '../types';
import { NotificationsService } from './notifications.service';
import { RealtimeNotificationService } from './realtime-notification.service';
import { SlackNotificationService } from './slack-notification.service';
import { TeamsNotificationService } from './teams-notification.service';

import { NotificationCondition, NotificationAction } from '../entities';

@Injectable()
export class NotificationRuleEngineService {
    private readonly logger = new Logger(NotificationRuleEngineService.name);
    private readonly delayedNotifications = new Map<string, NodeJS.Timeout>();

    constructor(
        @InjectRepository(NotificationRule)
        private notificationRuleRepository: Repository<NotificationRule>,
        private notificationsService: NotificationsService,
        private realtimeService: RealtimeNotificationService,
        private slackService: SlackNotificationService,
        private teamsService: TeamsNotificationService,
    ) { }

    // ルールエンジンの実行
    async executeRules(
        trigger: NotificationTrigger,
        context: NotificationContext,
        triggeredBy?: string,
    ): Promise<void> {
        try {
            // アクティブなルールを取得
            const rules = await this.getActiveRules(trigger);

            this.logger.log(`Executing ${rules.length} rules for trigger: ${trigger}`);

            for (const rule of rules) {
                try {
                    await this.executeRule(rule, context, triggeredBy);
                } catch (error) {
                    this.logger.error(`Failed to execute rule ${rule.id}: ${error.message}`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to execute rules for trigger ${trigger}: ${error.message}`);
        }
    }

    // 個別ルールの実行
    private async executeRule(
        rule: NotificationRule,
        context: NotificationContext,
        triggeredBy?: string,
    ): Promise<void> {
        // 条件評価
        if (!this.evaluateConditions(rule.conditions, context)) {
            this.logger.debug(`Rule ${rule.id} conditions not met, skipping`);
            return;
        }

        this.logger.log(`Executing rule: ${rule.name} (${rule.id})`);

        // アクションの実行
        for (const action of rule.actions) {
            try {
                if (action.delay && action.delay > 0) {
                    await this.scheduleDelayedAction(rule, action, context, triggeredBy);
                } else {
                    await this.executeAction(rule, action, context, triggeredBy);
                }
            } catch (error) {
                this.logger.error(`Failed to execute action for rule ${rule.id}: ${error.message}`);
            }
        }
    }

    // アクションの実行
    private async executeAction(
        rule: NotificationRule,
        action: NotificationAction,
        context: NotificationContext,
        triggeredBy?: string,
    ): Promise<void> {
        const notification = await this.buildNotificationRequest(rule, action, context, triggeredBy);

        switch (action.type) {
            case 'email':
                await this.notificationsService.sendNotification(notification);
                break;

            case 'realtime':
                await this.realtimeService.sendInstantNotification(
                    action.recipients,
                    notification,
                );
                break;

            case 'slack':
                if (action.webhookUrl) {
                    await this.executeSlackAction(action.webhookUrl, context, rule);
                }
                break;

            case 'teams':
                if (action.webhookUrl) {
                    await this.executeTeamsAction(action.webhookUrl, context, rule);
                }
                break;

            case 'webhook':
                if (action.webhookUrl) {
                    await this.executeWebhookAction(action.webhookUrl, context, rule);
                }
                break;

            default:
                this.logger.warn(`Unknown action type: ${action.type}`);
        }
    }

    // 遅延アクションのスケジュール
    private async scheduleDelayedAction(
        rule: NotificationRule,
        action: NotificationAction,
        context: NotificationContext,
        triggeredBy?: string,
    ): Promise<void> {
        const delayMs = action.delay! * 60 * 1000; // 分をミリ秒に変換
        const delayId = `${rule.id}_${action.type}_${Date.now()}`;

        this.logger.log(`Scheduling delayed action for rule ${rule.id}, delay: ${action.delay} minutes`);

        const timeout = setTimeout(async () => {
            try {
                await this.executeAction(rule, action, context, triggeredBy);
                this.delayedNotifications.delete(delayId);
            } catch (error) {
                this.logger.error(`Failed to execute delayed action: ${error.message}`);
            }
        }, delayMs);

        this.delayedNotifications.set(delayId, timeout);
    }

    // Slackアクションの実行
    private async executeSlackAction(
        webhookUrl: string,
        context: NotificationContext,
        rule: NotificationRule,
    ): Promise<void> {
        if (context.inquiry) {
            switch (rule.trigger) {
                case 'inquiry_created':
                    await this.slackService.sendInquiryCreatedNotification(
                        webhookUrl,
                        context.inquiry,
                        context.assignedTo,
                    );
                    break;

                case 'status_changed':
                    await this.slackService.sendStatusChangeNotification(
                        webhookUrl,
                        context.inquiry,
                        context.oldStatus,
                        context.newStatus,
                        context.changedBy,
                    );
                    break;

                case 'sla_violation':
                    await this.slackService.sendSLAViolationNotification(
                        webhookUrl,
                        context.violation,
                    );
                    break;

                default:
                    await this.slackService.sendCustomMessage(
                        webhookUrl,
                        rule.name,
                        `ルール「${rule.name}」がトリガーされました`,
                    );
            }
        }
    }

    // Teamsアクションの実行
    private async executeTeamsAction(
        webhookUrl: string,
        context: NotificationContext,
        rule: NotificationRule,
    ): Promise<void> {
        if (context.inquiry) {
            switch (rule.trigger) {
                case 'inquiry_created':
                    await this.teamsService.sendInquiryCreatedNotification(
                        webhookUrl,
                        context.inquiry,
                        context.assignedTo,
                    );
                    break;

                case 'status_changed':
                    await this.teamsService.sendStatusChangeNotification(
                        webhookUrl,
                        context.inquiry,
                        context.oldStatus,
                        context.newStatus,
                        context.changedBy,
                    );
                    break;

                case 'sla_violation':
                    await this.teamsService.sendSLAViolationNotification(
                        webhookUrl,
                        context.violation,
                    );
                    break;

                case 'response_added':
                    await this.teamsService.sendResponseAddedNotification(
                        webhookUrl,
                        context.inquiry,
                        context.response,
                        context.addedBy,
                    );
                    break;

                default:
                    await this.teamsService.sendCustomMessage(
                        webhookUrl,
                        rule.name,
                        `ルール「${rule.name}」がトリガーされました`,
                    );
            }
        }
    }

    // Webhookアクションの実行
    private async executeWebhookAction(
        webhookUrl: string,
        context: NotificationContext,
        rule: NotificationRule,
    ): Promise<void> {
        // カスタムWebhook実装
        this.logger.log(`Executing webhook action for rule ${rule.id}`);
        // TODO: 実際のWebhook送信実装
    }

    // 条件評価
    private evaluateConditions(conditions: NotificationCondition[], context: NotificationContext): boolean {
        if (!conditions || conditions.length === 0) {
            return true; // 条件がない場合は常に実行
        }

        return conditions.every(condition => this.evaluateCondition(condition, context));
    }

    // 個別条件の評価
    private evaluateCondition(condition: NotificationCondition, context: NotificationContext): boolean {
        const value = this.getNestedValue(context, condition.field);

        switch (condition.operator) {
            case 'equals':
                return value === condition.value;

            case 'contains':
                return String(value).toLowerCase().includes(String(condition.value).toLowerCase());

            case 'greater_than':
                return Number(value) > Number(condition.value);

            case 'less_than':
                return Number(value) < Number(condition.value);

            case 'in':
                return Array.isArray(condition.value) && condition.value.includes(value);

            case 'not_in':
                return Array.isArray(condition.value) && !condition.value.includes(value);

            default:
                this.logger.warn(`Unknown condition operator: ${condition.operator}`);
                return false;
        }
    }

    // 通知リクエストの構築
    private async buildNotificationRequest(
        rule: NotificationRule,
        action: NotificationAction,
        context: NotificationContext,
        triggeredBy?: string,
    ): Promise<NotificationRequest> {
        let subject = rule.name;
        let content = `ルール「${rule.name}」がトリガーされました`;

        // コンテキストに基づく内容の生成
        if (context.inquiry) {
            subject = `${rule.name}: ${context.inquiry.title}`;
            content = this.generateContentFromContext(rule.trigger, context);
        }

        return {
            type: action.type as any,
            recipients: action.recipients,
            subject,
            content,
            priority: this.determinePriority(rule.trigger, context),
            ruleId: rule.id,
            triggeredBy,
            metadata: {
                ruleId: rule.id,
                trigger: rule.trigger,
                context: this.sanitizeContext(context),
            },
        };
    }

    // コンテキストからの内容生成
    private generateContentFromContext(trigger: NotificationTrigger, context: NotificationContext): string {
        switch (trigger) {
            case 'inquiry_created':
                return `新しい問い合わせが作成されました。\n\n` +
                    `タイトル: ${context.inquiry?.title}\n` +
                    `内容: ${context.inquiry?.content?.substring(0, 200)}...`;

            case 'status_changed':
                return `問い合わせの状態が変更されました。\n\n` +
                    `タイトル: ${context.inquiry?.title}\n` +
                    `変更前: ${context.oldStatus}\n` +
                    `変更後: ${context.newStatus}`;

            case 'response_added':
                return `問い合わせに回答が追加されました。\n\n` +
                    `タイトル: ${context.inquiry?.title}\n` +
                    `回答者: ${context.addedBy?.name}`;

            case 'sla_violation':
                return `SLA違反が発生しました。\n\n` +
                    `問い合わせID: ${context.violation?.inquiryId}\n` +
                    `違反タイプ: ${context.violation?.violationType}\n` +
                    `重要度: ${context.violation?.severity}`;

            default:
                return `通知がトリガーされました: ${trigger}`;
        }
    }

    // 優先度の決定
    private determinePriority(trigger: NotificationTrigger, context: NotificationContext): 'low' | 'medium' | 'high' | 'urgent' {
        switch (trigger) {
            case 'sla_violation':
                return context.violation?.severity === 'critical' ? 'urgent' : 'high';

            case 'inquiry_created':
                return context.inquiry?.priority === 'high' ? 'high' : 'medium';

            case 'escalation':
                return 'high';

            default:
                return 'medium';
        }
    }

    // アクティブなルールの取得
    private async getActiveRules(trigger: NotificationTrigger): Promise<NotificationRule[]> {
        return this.notificationRuleRepository.find({
            where: {
                trigger,
                isActive: true,
            },
            order: {
                createdAt: 'ASC',
            },
        });
    }

    // ネストした値の取得
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    // コンテキストのサニタイズ（ログ用）
    private sanitizeContext(context: NotificationContext): any {
        const sanitized = { ...context };

        // 機密情報を除去
        if (sanitized.user) {
            delete sanitized.user.password;
            delete sanitized.user.passwordHash;
        }

        return sanitized;
    }

    // 定期的なルール実行（スケジュールベース）
    @Cron(CronExpression.EVERY_5_MINUTES)
    async executeScheduledRules(): Promise<void> {
        try {
            // SLA違反チェック等の定期実行ルール
            await this.checkSLAViolations();
        } catch (error) {
            this.logger.error(`Failed to execute scheduled rules: ${error.message}`);
        }
    }

    // SLA違反チェック
    private async checkSLAViolations(): Promise<void> {
        // TODO: 実際のSLA違反チェックロジックを実装
        this.logger.debug('Checking SLA violations...');
    }

    // 遅延通知のキャンセル
    cancelDelayedNotification(delayId: string): boolean {
        const timeout = this.delayedNotifications.get(delayId);
        if (timeout) {
            clearTimeout(timeout);
            this.delayedNotifications.delete(delayId);
            return true;
        }
        return false;
    }

    // 統計情報の取得
    getEngineStats(): {
        activeRules: number;
        delayedNotifications: number;
        lastExecution?: Date;
    } {
        return {
            activeRules: 0, // TODO: 実装
            delayedNotifications: this.delayedNotifications.size,
            lastExecution: new Date(),
        };
    }
}