/**
 * ファイルモジュール固有の定数
 */

// 許可されるファイルタイプ
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

export type AllowedFileType = typeof ALLOWED_FILE_TYPES[number];

// ファイルサイズ制限（バイト）
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  SPREADSHEET: 20 * 1024 * 1024, // 20MB
  DEFAULT: 10 * 1024 * 1024, // 10MB
} as const;

// ファイルカテゴリ
export const FILE_CATEGORY = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  SPREADSHEET: 'spreadsheet',
  OTHER: 'other',
} as const;

export type FileCategory = typeof FILE_CATEGORY[keyof typeof FILE_CATEGORY];

// ウイルススキャン結果
export const SCAN_RESULT = {
  CLEAN: 'clean',
  INFECTED: 'infected',
  SUSPICIOUS: 'suspicious',
  PENDING: 'pending',
  ERROR: 'error',
} as const;

export type ScanResult = typeof SCAN_RESULT[keyof typeof SCAN_RESULT];

// ファイル保存期間（日数）
export const FILE_RETENTION = {
  TEMPORARY: 7, // 一時ファイル: 7日
  INQUIRY_ATTACHMENT: 365, // 問い合わせ添付: 1年
  SYSTEM_BACKUP: 2555, // システムバックアップ: 7年
} as const;