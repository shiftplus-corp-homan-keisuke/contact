/**
 * アプリケーション全体で使用する定数
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

// ユーザー役割
export const USER_ROLE = {
  ADMIN: 'admin',
  SUPPORT: 'support',
  VIEWER: 'viewer',
  API_USER: 'api_user',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

// ファイルタイプ
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

// ファイルサイズ制限（バイト）
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ページネーション設定
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// レート制限設定
export const RATE_LIMIT = {
  DEFAULT_PER_HOUR: 1000,
  API_KEY_PER_HOUR: 5000,
  LOGIN_ATTEMPTS_PER_HOUR: 10,
} as const;

// キャッシュ設定
export const CACHE_TTL = {
  SHORT: 300, // 5分
  MEDIUM: 1800, // 30分
  LONG: 3600, // 1時間
  VERY_LONG: 86400, // 24時間
} as const;