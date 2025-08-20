import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { SlackNotificationData } from '../types';

@Injectable()
export class SlackNotificationService {
    private readonly logger = new Logger(SlackNotificationService.name);

    constructor(private configService: ConfigService) { }

    // Slack通知送信
    async sendSlackNotification(data: SlackNotificationData): Promise<void> {
        try {
            const payload = this.buildSlackPayload(data);

            const response: AxiosResponse = await axios.post(data.webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000, // 10秒タイムアウト
            });

            if (response.status === 200) {
                this.logger.log('Slack notification sent successfully');
            } else {
                throw new Error(`Slack API returned status: ${response.status}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send Slack notification: ${error.message}`, error.stack);
            throw error;
        }
    }

    // 問い合わせ作成通知用のSlackメッセージ
    async sendInquiryCreatedNotification(
        webhookUrl: string,
        inquiry: any,
        assignedTo?: any,
    ): Promise<void> {
        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🆕 新しい問い合わせが作成されました',
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*問い合わせID:*\n${inquiry.id}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*タイトル:*\n${inquiry.title}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*アプリ:*\n${inquiry.application?.name || 'N/A'}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*優先度:*\n${this.getPriorityEmoji(inquiry.priority)} ${inquiry.priority}`,
                    },
                ],
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*内容:*\n${inquiry.content.substring(0, 200)}${inquiry.content.length > 200 ? '...' : ''}`,
                },
            },
        ];

        if (assignedTo) {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*担当者:* ${assignedTo.name}`,
                },
            });
        }

        blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '問い合わせを確認',
                    },
                    url: `${this.configService.get('FRONTEND_URL')}/inquiries/${inquiry.id}`,
                    style: 'primary',
                },
            ],
        } as any);

        await this.sendSlackNotification({
            webhookUrl,
            text: `新しい問い合わせ: ${inquiry.title}`,
            blocks,
        });
    }

    // SLA違反通知用のSlackメッセージ
    async sendSLAViolationNotification(
        webhookUrl: string,
        violation: {
            inquiryId: string;
            violationType: string;
            threshold: number;
            actualTime: number;
            severity: string;
        },
    ): Promise<void> {
        const color = violation.severity === 'critical' ? '#ff0000' : '#ff9900';
        const emoji = violation.severity === 'critical' ? '🚨' : '⚠️';

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `${emoji} SLA違反が発生しました`,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*問い合わせID:*\n${violation.inquiryId}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*違反タイプ:*\n${violation.violationType}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*閾値:*\n${violation.threshold}時間`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*実際の時間:*\n${violation.actualTime}時間`,
                    },
                ],
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*重要度:* ${violation.severity.toUpperCase()}`,
                },
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '問い合わせを確認',
                        },
                        url: `${this.configService.get('FRONTEND_URL')}/inquiries/${violation.inquiryId}`,
                        style: 'danger',
                    },
                ],
            } as any,
        ];

        await this.sendSlackNotification({
            webhookUrl,
            text: `SLA違反: ${violation.inquiryId}`,
            blocks,
            attachments: [
                {
                    color,
                    fallback: `SLA違反が発生しました: ${violation.inquiryId}`,
                },
            ],
        });
    }

    // 状態変更通知用のSlackメッセージ
    async sendStatusChangeNotification(
        webhookUrl: string,
        inquiry: any,
        oldStatus: string,
        newStatus: string,
        changedBy: any,
    ): Promise<void> {
        const statusEmoji = this.getStatusEmoji(newStatus);

        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `${statusEmoji} *問い合わせの状態が変更されました*`,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*問い合わせ:*\n${inquiry.title}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*変更者:*\n${changedBy.name}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*変更前:*\n${oldStatus}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*変更後:*\n${newStatus}`,
                    },
                ],
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '詳細を確認',
                        },
                        url: `${this.configService.get('FRONTEND_URL')}/inquiries/${inquiry.id}`,
                    },
                ],
            } as any,
        ];

        await this.sendSlackNotification({
            webhookUrl,
            text: `状態変更: ${inquiry.title} (${oldStatus} → ${newStatus})`,
            blocks,
        });
    }

    // カスタムSlackメッセージ送信
    async sendCustomMessage(
        webhookUrl: string,
        title: string,
        message: string,
        fields?: Array<{ title: string; value: string; short?: boolean }>,
        color?: string,
    ): Promise<void> {
        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${title}*\n${message}`,
                },
            },
        ];

        if (fields && fields.length > 0) {
            const fieldBlocks = fields.map(field => ({
                type: 'mrkdwn',
                text: `*${field.title}:*\n${field.value}`,
            }));

            blocks.push({
                type: 'section',
                fields: fieldBlocks,
            } as any);
        }

        const attachments = color ? [{ color, fallback: title }] : undefined;

        await this.sendSlackNotification({
            webhookUrl,
            text: title,
            blocks,
            attachments,
        });
    }

    private buildSlackPayload(data: SlackNotificationData): any {
        const payload: any = {
            text: data.text,
        };

        if (data.blocks) {
            payload.blocks = data.blocks;
        }

        if (data.attachments) {
            payload.attachments = data.attachments;
        }

        return payload;
    }

    private getPriorityEmoji(priority: string): string {
        switch (priority) {
            case 'high':
                return '🔴';
            case 'medium':
                return '🟡';
            case 'low':
                return '🟢';
            default:
                return '⚪';
        }
    }

    private getStatusEmoji(status: string): string {
        switch (status) {
            case 'new':
                return '🆕';
            case 'in_progress':
                return '🔄';
            case 'pending':
                return '⏸️';
            case 'resolved':
                return '✅';
            case 'closed':
                return '🔒';
            default:
                return '📋';
        }
    }

    // Webhook URLの検証
    validateWebhookUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname === 'hooks.slack.com' &&
                parsedUrl.pathname.startsWith('/services/');
        } catch {
            return false;
        }
    }

    // Slackチャンネル情報の取得（Webhook URLから推測）
    getChannelInfoFromWebhook(webhookUrl: string): { isValid: boolean; info?: string } {
        if (!this.validateWebhookUrl(webhookUrl)) {
            return { isValid: false };
        }

        try {
            const url = new URL(webhookUrl);
            const pathParts = url.pathname.split('/');
            const channelId = pathParts[pathParts.length - 1];

            return {
                isValid: true,
                info: `Slack Channel ID: ${channelId}`,
            };
        } catch {
            return { isValid: false };
        }
    }
}