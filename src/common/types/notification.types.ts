/**
 * 通知関連の型定義
 */

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'webhook';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationEventType = 'inquiry_created' | 'status_changed' | 'response_added' | 'sla_violation' | 'escalation';

/**
 * 通知リクエスト
 */
export interface NotificationRequest {
  type: NotificationChannel;
  recipients: string[];
  subject: string;
  content: string;
  priority: NotificationPriority;
  metadata?: Record<string, any>;
}

/**
 * 通知ルール
 */
export interface NotificationRule {
  id: string;
  name: string;
  trigger: NotificationEventType;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 通知条件
 */
export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
}

/**
 * 通知アクション
 */
export interface NotificationAction {
  type: NotificationChannel;
  recipients: string[];
  template: string;
  priority: NotificationPriority;
  delay?: number; // 遅延時間（秒）
}

/**
 * 通知設定
 */
export interface NotificationSettings {
  userId: string;
  emailEnabled: boolean;
  slackEnabled: boolean;
  teamsEnabled: boolean;
  webhookEnabled: boolean;
  emailAddress?: string;
  slackUserId?: string;
  teamsUserId?: string;
  webhookUrl?: string;
  eventTypes: NotificationEventType[];
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    timezone: string;
  };
}

/**
 * メール通知データ
 */
export interface EmailNotificationData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: EmailAttachment[];
}

/**
 * メール添付ファイル
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

/**
 * アラート
 */
export interface Alert {
  id: string;
  type: 'sla_violation' | 'system_error' | 'high_volume' | 'escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  metadata: Record<string, any>;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * SLA違反
 */
export interface SLAViolation {
  id: string;
  inquiryId: string;
  slaType: 'response_time' | 'resolution_time';
  expectedTime: number; // 分
  actualTime: number; // 分
  violationTime: number; // 分
  severity: 'minor' | 'major' | 'critical';
  isNotified: boolean;
  createdAt: Date;
}

/**
 * 通知テンプレート
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationChannel;
  eventType: NotificationEventType;
  subject: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 通知履歴
 */
export interface NotificationHistory {
  id: string;
  type: NotificationChannel;
  eventType: NotificationEventType;
  recipients: string[];
  subject: string;
  content: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
  metadata: Record<string, any>;
}

/**
 * 通知統計
 */
export interface NotificationStatistics {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  byChannel: Record<NotificationChannel, {
    sent: number;
    failed: number;
    successRate: number;
  }>;
  byEventType: Record<NotificationEventType, {
    sent: number;
    failed: number;
    successRate: number;
  }>;
  recentActivity: NotificationHistory[];
}