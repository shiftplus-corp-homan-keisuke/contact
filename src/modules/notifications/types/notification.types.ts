import { NotificationChannel, NotificationTrigger } from '../entities';

// エンティティから型をエクスポート
export { NotificationChannel, NotificationTrigger } from '../entities';

export interface NotificationRequest {
    type: NotificationChannel;
    recipients: string[];
    subject: string;
    content: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    metadata?: Record<string, any>;
    triggeredBy?: string;
    ruleId?: string;
}

export interface NotificationSettings {
    userId: string;
    settings: NotificationChannelSettings[];
}

export interface NotificationChannelSettings {
    trigger: NotificationTrigger;
    channel: NotificationChannel;
    isEnabled: boolean;
    emailAddress?: string;
    slackWebhookUrl?: string;
    teamsWebhookUrl?: string;
    webhookUrl?: string;
}

export interface EmailNotificationData {
    to: string[];
    subject: string;
    content: string;
    html?: string;
    attachments?: EmailAttachment[];
}

export interface EmailAttachment {
    filename: string;
    content: Buffer;
    contentType: string;
}

export interface SlackNotificationData {
    webhookUrl: string;
    text: string;
    blocks?: any[];
    attachments?: any[];
}

export interface TeamsNotificationData {
    webhookUrl: string;
    text: string;
    title?: string;
    themeColor?: string;
    sections?: any[];
}

export interface WebhookNotificationData {
    url: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    payload: Record<string, any>;
}

export interface NotificationTemplate {
    id: string;
    name: string;
    trigger: NotificationTrigger;
    channel: NotificationChannel;
    subject: string;
    content: string;
    variables: string[];
}

export interface NotificationContext {
    inquiry?: any;
    response?: any;
    user?: any;
    application?: any;
    [key: string]: any;
}

export interface SLAViolation {
    inquiryId: string;
    violationType: 'response_time' | 'resolution_time';
    threshold: number;
    actualTime: number;
    severity: 'warning' | 'critical';
}

export interface Alert {
    id: string;
    type: 'sla_violation' | 'system_error' | 'security_alert';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    resolvedAt?: Date;
}