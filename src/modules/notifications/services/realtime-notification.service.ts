import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../gateways';
import { NotificationRequest, NotificationContext } from '../types';
import { NotificationsService } from './notifications.service';

@Injectable()
export class RealtimeNotificationService {
    private readonly logger = new Logger(RealtimeNotificationService.name);

    constructor(
        private notificationsGateway: NotificationsGateway,
        private notificationsService: NotificationsService,
        private eventEmitter: EventEmitter2,
    ) { }

    // 即座通知送信
    async sendInstantNotification(
        userIds: string[],
        notification: NotificationRequest,
    ): Promise<void> {
        try {
            // WebSocket経由でリアルタイム通知
            await this.notificationsGateway.sendNotificationToUsers(userIds, notification);

            // 通常の通知も並行して送信（メール等）
            await this.notificationsService.sendNotification(notification);

            this.logger.log(`Sent instant notification to ${userIds.length} users`);
        } catch (error) {
            this.logger.error(`Failed to send instant notification: ${error.message}`, error.stack);
            throw error;
        }
    }

    // 問い合わせ作成時の即座通知
    @OnEvent('inquiry.created')
    async handleInquiryCreated(payload: {
        inquiry: any;
        assignedTo?: string;
        createdBy: string;
    }) {
        try {
            const { inquiry, assignedTo, createdBy } = payload;
            const recipients = [];

            // 担当者が指定されている場合は担当者に通知
            if (assignedTo) {
                recipients.push(assignedTo);
            }

            // 管理者にも通知（設定に基づく）
            // TODO: 管理者ユーザーの取得ロジックを実装

            if (recipients.length > 0) {
                const notification: NotificationRequest = {
                    type: 'realtime',
                    recipients,
                    subject: `新しい問い合わせが作成されました`,
                    content: `問い合わせ「${inquiry.title}」が作成されました。`,
                    priority: inquiry.priority === 'high' ? 'high' : 'medium',
                    metadata: {
                        inquiryId: inquiry.id,
                        appId: inquiry.appId,
                        type: 'inquiry_created',
                    },
                };

                await this.sendInstantNotification(recipients, notification);
            }
        } catch (error) {
            this.logger.error(`Failed to handle inquiry created event: ${error.message}`);
        }
    }

    // 問い合わせ状態変更時の即座通知
    @OnEvent('inquiry.status_changed')
    async handleInquiryStatusChanged(payload: {
        inquiry: any;
        oldStatus: string;
        newStatus: string;
        changedBy: string;
    }) {
        try {
            const { inquiry, oldStatus, newStatus, changedBy } = payload;
            const recipients = [];

            // 担当者に通知
            if (inquiry.assignedTo && inquiry.assignedTo !== changedBy) {
                recipients.push(inquiry.assignedTo);
            }

            // 問い合わせ作成者に通知（外部からの場合）
            if (inquiry.customerEmail) {
                // 顧客への通知は別途メール等で処理
            }

            if (recipients.length > 0) {
                const notification: NotificationRequest = {
                    type: 'realtime',
                    recipients,
                    subject: `問い合わせの状態が変更されました`,
                    content: `問い合わせ「${inquiry.title}」の状態が「${oldStatus}」から「${newStatus}」に変更されました。`,
                    priority: 'medium',
                    metadata: {
                        inquiryId: inquiry.id,
                        oldStatus,
                        newStatus,
                        type: 'status_changed',
                    },
                };

                await this.sendInstantNotification(recipients, notification);
            }
        } catch (error) {
            this.logger.error(`Failed to handle inquiry status changed event: ${error.message}`);
        }
    }

    // 回答追加時の即座通知
    @OnEvent('response.added')
    async handleResponseAdded(payload: {
        response: any;
        inquiry: any;
        addedBy: string;
    }) {
        try {
            const { response, inquiry, addedBy } = payload;
            const recipients = [];

            // 問い合わせ作成者に通知
            if (inquiry.createdBy && inquiry.createdBy !== addedBy) {
                recipients.push(inquiry.createdBy);
            }

            // 担当者に通知（回答者以外）
            if (inquiry.assignedTo && inquiry.assignedTo !== addedBy) {
                recipients.push(inquiry.assignedTo);
            }

            if (recipients.length > 0) {
                const notification: NotificationRequest = {
                    type: 'realtime',
                    recipients,
                    subject: `問い合わせに回答が追加されました`,
                    content: `問い合わせ「${inquiry.title}」に新しい回答が追加されました。`,
                    priority: 'medium',
                    metadata: {
                        inquiryId: inquiry.id,
                        responseId: response.id,
                        type: 'response_added',
                    },
                };

                await this.sendInstantNotification(recipients, notification);
            }
        } catch (error) {
            this.logger.error(`Failed to handle response added event: ${error.message}`);
        }
    }

    // SLA違反時の緊急通知
    @OnEvent('sla.violation')
    async handleSLAViolation(payload: {
        inquiryId: string;
        violationType: 'response_time' | 'resolution_time';
        threshold: number;
        actualTime: number;
        severity: 'warning' | 'critical';
    }) {
        try {
            const { inquiryId, violationType, threshold, actualTime, severity } = payload;

            // 管理者と担当者に緊急通知
            // TODO: 管理者ユーザーの取得ロジックを実装
            const recipients: string[] = []; // 管理者のIDを追加

            const notification: NotificationRequest = {
                type: 'realtime',
                recipients,
                subject: `SLA違反が発生しました`,
                content: `問い合わせ ${inquiryId} でSLA違反が発生しました。\n` +
                    `違反タイプ: ${violationType}\n` +
                    `閾値: ${threshold}時間\n` +
                    `実際の時間: ${actualTime}時間`,
                priority: severity === 'critical' ? 'urgent' : 'high',
                metadata: {
                    inquiryId,
                    violationType,
                    threshold,
                    actualTime,
                    severity,
                    type: 'sla_violation',
                },
            };

            await this.sendInstantNotification(recipients, notification);

            // システムアラートも送信
            await this.notificationsGateway.sendSystemAlert({
                type: 'outage',
                message: `SLA違反が発生しました (問い合わせ: ${inquiryId})`,
                severity: severity === 'critical' ? 'error' : 'warning',
            });
        } catch (error) {
            this.logger.error(`Failed to handle SLA violation event: ${error.message}`);
        }
    }

    // システムメンテナンス通知
    async sendMaintenanceNotification(
        message: string,
        scheduledTime: Date,
        duration: number,
    ): Promise<void> {
        try {
            await this.notificationsGateway.sendSystemAlert({
                type: 'maintenance',
                message: `システムメンテナンス予定: ${message}\n` +
                    `開始時刻: ${scheduledTime.toLocaleString()}\n` +
                    `予定時間: ${duration}分`,
                severity: 'info',
            });

            this.logger.log('Sent maintenance notification to all users');
        } catch (error) {
            this.logger.error(`Failed to send maintenance notification: ${error.message}`);
        }
    }

    // 接続状態の監視
    getRealtimeStatus(): {
        connectedUsers: string[];
        totalConnections: number;
        userConnections: Record<string, number>;
    } {
        const connectedUsers = this.notificationsGateway.getConnectedUsers();
        const userConnections: Record<string, number> = {};

        connectedUsers.forEach(userId => {
            userConnections[userId] = this.notificationsGateway.getUserSocketCount(userId);
        });

        return {
            connectedUsers,
            totalConnections: Object.values(userConnections).reduce((sum, count) => sum + count, 0),
            userConnections,
        };
    }

    // 特定ユーザーの接続状態確認
    isUserOnline(userId: string): boolean {
        return this.notificationsGateway.isUserConnected(userId);
    }
}