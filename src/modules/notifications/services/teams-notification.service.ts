import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { TeamsNotificationData } from '../types';

@Injectable()
export class TeamsNotificationService {
    private readonly logger = new Logger(TeamsNotificationService.name);

    constructor(private configService: ConfigService) { }

    // Teams通知送信
    async sendTeamsNotification(data: TeamsNotificationData): Promise<void> {
        try {
            const payload = this.buildTeamsPayload(data);

            const response: AxiosResponse = await axios.post(data.webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000, // 10秒タイムアウト
            });

            if (response.status === 200) {
                this.logger.log('Teams notification sent successfully');
            } else {
                throw new Error(`Teams API returned status: ${response.status}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send Teams notification: ${error.message}`, error.stack);
            throw error;
        }
    }

    // 問い合わせ作成通知用のTeamsメッセージ
    async sendInquiryCreatedNotification(
        webhookUrl: string,
        inquiry: any,
        assignedTo?: any,
    ): Promise<void> {
        const facts = [
            {
                name: '問い合わせID',
                value: inquiry.id,
            },
            {
                name: 'タイトル',
                value: inquiry.title,
            },
            {
                name: 'アプリケーション',
                value: inquiry.application?.name || 'N/A',
            },
            {
                name: '優先度',
                value: `${this.getPriorityEmoji(inquiry.priority)} ${inquiry.priority}`,
            },
            {
                name: '作成日時',
                value: new Date(inquiry.createdAt).toLocaleString('ja-JP'),
            },
        ];

        if (assignedTo) {
            facts.push({
                name: '担当者',
                value: assignedTo.name,
            });
        }

        const sections = [
            {
                activityTitle: '🆕 新しい問い合わせが作成されました',
                activitySubtitle: inquiry.title,
                activityImage: 'https://via.placeholder.com/64x64/0078d4/ffffff?text=📋',
                facts,
                text: inquiry.content.substring(0, 300) + (inquiry.content.length > 300 ? '...' : ''),
            },
        ];

        const potentialAction = [
            {
                '@type': 'OpenUri',
                name: '問い合わせを確認',
                targets: [
                    {
                        os: 'default',
                        uri: `${this.configService.get('FRONTEND_URL')}/inquiries/${inquiry.id}`,
                    },
                ],
            },
        ];

        await this.sendTeamsNotification({
            webhookUrl,
            title: '新しい問い合わせ',
            text: `問い合わせ「${inquiry.title}」が作成されました。`,
            themeColor: '0078D4',
            sections,
        });
    }

    // SLA違反通知用のTeamsメッセージ
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
        const themeColor = violation.severity === 'critical' ? 'FF0000' : 'FF9900';
        const emoji = violation.severity === 'critical' ? '🚨' : '⚠️';

        const facts = [
            {
                name: '問い合わせID',
                value: violation.inquiryId,
            },
            {
                name: '違反タイプ',
                value: violation.violationType,
            },
            {
                name: '閾値',
                value: `${violation.threshold}時間`,
            },
            {
                name: '実際の時間',
                value: `${violation.actualTime}時間`,
            },
            {
                name: '重要度',
                value: violation.severity.toUpperCase(),
            },
            {
                name: '検知時刻',
                value: new Date().toLocaleString('ja-JP'),
            },
        ];

        const sections = [
            {
                activityTitle: `${emoji} SLA違反が発生しました`,
                activitySubtitle: `問い合わせ ${violation.inquiryId}`,
                activityImage: 'https://via.placeholder.com/64x64/ff0000/ffffff?text=⚠️',
                facts,
                text: `SLA違反が検知されました。至急対応が必要です。`,
            },
        ];

        const potentialAction = [
            {
                '@type': 'OpenUri',
                name: '問い合わせを確認',
                targets: [
                    {
                        os: 'default',
                        uri: `${this.configService.get('FRONTEND_URL')}/inquiries/${violation.inquiryId}`,
                    },
                ],
            },
        ];

        await this.sendTeamsNotification({
            webhookUrl,
            title: 'SLA違反アラート',
            text: `SLA違反が発生しました: ${violation.inquiryId}`,
            themeColor,
            sections,
        });
    }

    // 状態変更通知用のTeamsメッセージ
    async sendStatusChangeNotification(
        webhookUrl: string,
        inquiry: any,
        oldStatus: string,
        newStatus: string,
        changedBy: any,
    ): Promise<void> {
        const statusEmoji = this.getStatusEmoji(newStatus);
        const themeColor = this.getStatusColor(newStatus);

        const facts = [
            {
                name: '問い合わせ',
                value: inquiry.title,
            },
            {
                name: '変更者',
                value: changedBy.name,
            },
            {
                name: '変更前',
                value: oldStatus,
            },
            {
                name: '変更後',
                value: newStatus,
            },
            {
                name: '変更日時',
                value: new Date().toLocaleString('ja-JP'),
            },
        ];

        const sections = [
            {
                activityTitle: `${statusEmoji} 問い合わせの状態が変更されました`,
                activitySubtitle: inquiry.title,
                activityImage: 'https://via.placeholder.com/64x64/0078d4/ffffff?text=🔄',
                facts,
                text: `状態が「${oldStatus}」から「${newStatus}」に変更されました。`,
            },
        ];

        const potentialAction = [
            {
                '@type': 'OpenUri',
                name: '詳細を確認',
                targets: [
                    {
                        os: 'default',
                        uri: `${this.configService.get('FRONTEND_URL')}/inquiries/${inquiry.id}`,
                    },
                ],
            },
        ];

        await this.sendTeamsNotification({
            webhookUrl,
            title: '状態変更通知',
            text: `問い合わせの状態が変更されました: ${inquiry.title}`,
            themeColor,
            sections,
        });
    }

    // 回答追加通知用のTeamsメッセージ
    async sendResponseAddedNotification(
        webhookUrl: string,
        inquiry: any,
        response: any,
        addedBy: any,
    ): Promise<void> {
        const facts = [
            {
                name: '問い合わせ',
                value: inquiry.title,
            },
            {
                name: '回答者',
                value: addedBy.name,
            },
            {
                name: '回答日時',
                value: new Date(response.createdAt).toLocaleString('ja-JP'),
            },
            {
                name: '公開設定',
                value: response.isPublic ? '公開' : '内部のみ',
            },
        ];

        const sections = [
            {
                activityTitle: '💬 新しい回答が追加されました',
                activitySubtitle: inquiry.title,
                activityImage: 'https://via.placeholder.com/64x64/00b294/ffffff?text=💬',
                facts,
                text: response.content.substring(0, 300) + (response.content.length > 300 ? '...' : ''),
            },
        ];

        const potentialAction = [
            {
                '@type': 'OpenUri',
                name: '回答を確認',
                targets: [
                    {
                        os: 'default',
                        uri: `${this.configService.get('FRONTEND_URL')}/inquiries/${inquiry.id}`,
                    },
                ],
            },
        ];

        await this.sendTeamsNotification({
            webhookUrl,
            title: '新しい回答',
            text: `問い合わせ「${inquiry.title}」に回答が追加されました。`,
            themeColor: '00B294',
            sections,
        });
    }

    // カスタムTeamsメッセージ送信
    async sendCustomMessage(
        webhookUrl: string,
        title: string,
        message: string,
        facts?: Array<{ name: string; value: string }>,
        themeColor?: string,
    ): Promise<void> {
        const sections = [
            {
                activityTitle: title,
                facts: facts || [],
                text: message,
            },
        ];

        await this.sendTeamsNotification({
            webhookUrl,
            title,
            text: message,
            themeColor: themeColor || '0078D4',
            sections,
        });
    }

    private buildTeamsPayload(data: TeamsNotificationData): any {
        const payload: any = {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: data.title || data.text,
            themeColor: data.themeColor || '0078D4',
            sections: data.sections || [
                {
                    activityTitle: data.title || 'Notification',
                    text: data.text,
                },
            ],
        };

        if (data.title) {
            payload.title = data.title;
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

    private getStatusColor(status: string): string {
        switch (status) {
            case 'new':
                return '0078D4';
            case 'in_progress':
                return 'FF9900';
            case 'pending':
                return 'FFD700';
            case 'resolved':
                return '00B294';
            case 'closed':
                return '6B7280';
            default:
                return '0078D4';
        }
    }

    // Webhook URLの検証
    validateWebhookUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname.includes('office.com') ||
                parsedUrl.hostname.includes('outlook.com');
        } catch {
            return false;
        }
    }

    // Teamsチャンネル情報の取得（Webhook URLから推測）
    getChannelInfoFromWebhook(webhookUrl: string): { isValid: boolean; info?: string } {
        if (!this.validateWebhookUrl(webhookUrl)) {
            return { isValid: false };
        }

        try {
            const url = new URL(webhookUrl);
            return {
                isValid: true,
                info: `Teams Webhook: ${url.hostname}`,
            };
        } catch {
            return { isValid: false };
        }
    }
}