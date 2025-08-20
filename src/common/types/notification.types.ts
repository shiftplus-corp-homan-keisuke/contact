/**
 * 通知関連の型定義
 * 要件9: 通知・アラート機能
 */

export type NotificationType = 'email' | 'slack' | 'teams' | 'webhook' | 'websocket';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationTrigger =
    | 'inquiry_created'
    | 'status_changed'
    | 'sla_violation'
    | 'escalation'
    | 'response_added'
    | 'assignment_changed';

export interface NotificationRequest {
    type: NotificationType;
    recipients: string[];
    subject: string;
    content: string;
    priority: NotificationPriority;
    metadata?: Record<string, any>;
}

export interface NotificationRule {
    id: string;
    name: string;
    trigger: NotificationTrigger;
    conditions: NotificationCondition[];
    actions: NotificationAction[];
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
}

export interface NotificationAction {
    type: NotificationType;
    recipients: string[];
    template: string;
    delay?: number; // 遅延時間（秒）
}

export interface NotificationRuleUpdate {
    name?: string;
    conditions?: NotificationCondition[];
    actions?: NotificationAction[];
    isActive?: boolean;
}

export interface NotificationSettings {
    userId: string;
    emailEnabled: boolean;
    slackEnabled: boolean;
    teamsEnabled: boolean;
    websocketEnabled: boolean;
    quietHours?: QuietHours;
    preferences: NotificationPreferences;
}

export interface QuietHours {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
    timezone: string;
}

export interface NotificationPreferences {
    inquiryCreated: boolean;
    statusChanged: boolean;
    responseAdded: boolean;
    assignmentChanged: boolean;
    slaViolation: boolean;
    escalation: boolean;
}

// アラート関連
export interface Alert {
    id: string;
    type: AlertType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    source: string;
    metadata: Record<string, any>;
    isResolved: boolean;
    createdAt: Date;
    resolvedAt?: Date;
}

export type AlertType =
    | 'sla_violation'
    | 'high_volume'
    | 'system_error'
    | 'security_incident'
    | 'performance_degradation';

export interface AlertRequest {
    type: AlertType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    source: string;
    metadata?: Record<string, any>;
}

export interface SLAViolation {
    id: string;
    inquiryId: string;
    slaType: 'first_response' | 'resolution';
    targetTime: number; // 目標時間（分）
    actualTime: number; // 実際の時間（分）
    violationTime: number; // 違反時間（分）
    severity: 'minor' | 'major' | 'critical';
    isEscalated: boolean;
    createdAt: Date;
}

// 通知ログ
export interface NotificationLog {
    id: string;
    type: NotificationType;
    recipient: string;
    subject: string;
    status: 'pending' | 'sent' | 'failed' | 'delivered';
    errorMessage?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    createdAt: Date;
}

// リアルタイム通知
export interface RealtimeNotification {
    id: string;
    userId: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    createdAt: Date;
}

// 外部サービス連携
export interface SlackConfig {
    webhookUrl: string;
    channel: string;
    username?: string;
    iconEmoji?: string;
}

export interface TeamsConfig {
    webhookUrl: string;
    title?: string;
    themeColor?: string;
}