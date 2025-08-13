/**
 * 問い合わせモジュール固有の定数
 */

// 問い合わせ状態
export const INQUIRY_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export type InquiryStatus = typeof INQUIRY_STATUS[keyof typeof INQUIRY_STATUS];

// 優先度
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type Priority = typeof PRIORITY[keyof typeof PRIORITY];

// 問い合わせカテゴリ
export const INQUIRY_CATEGORY = {
  TECHNICAL: 'technical',
  BILLING: 'billing',
  FEATURE_REQUEST: 'feature_request',
  BUG_REPORT: 'bug_report',
  GENERAL: 'general',
} as const;

export type InquiryCategory = typeof INQUIRY_CATEGORY[keyof typeof INQUIRY_CATEGORY];

// SLA設定（問い合わせ固有）
export const SLA_SETTINGS = {
  RESPONSE_TIME: {
    LOW: 24 * 60 * 60 * 1000, // 24時間（ミリ秒）
    MEDIUM: 8 * 60 * 60 * 1000, // 8時間
    HIGH: 4 * 60 * 60 * 1000, // 4時間
    URGENT: 1 * 60 * 60 * 1000, // 1時間
  },
  RESOLUTION_TIME: {
    LOW: 7 * 24 * 60 * 60 * 1000, // 7日
    MEDIUM: 3 * 24 * 60 * 60 * 1000, // 3日
    HIGH: 1 * 24 * 60 * 60 * 1000, // 1日
    URGENT: 4 * 60 * 60 * 1000, // 4時間
  },
} as const;