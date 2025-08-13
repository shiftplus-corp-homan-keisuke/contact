/**
 * アプリケーション全体で使用する共通定数
 * 機能固有の定数は各モジュールに配置
 */

// ページネーション設定（全モジュール共通）
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// キャッシュ設定（全モジュール共通）
export const CACHE_TTL = {
  SHORT: 300, // 5分
  MEDIUM: 1800, // 30分
  LONG: 3600, // 1時間
  VERY_LONG: 86400, // 24時間
} as const;

// HTTPステータスコード関連（全モジュール共通）
export const HTTP_STATUS_MESSAGES = {
  400: 'リクエストが不正です',
  401: '認証が必要です',
  403: 'アクセス権限がありません',
  404: 'リソースが見つかりません',
  409: 'リソースが競合しています',
  429: 'レート制限を超過しました',
  500: '内部サーバーエラーが発生しました',
} as const;

// 日付フォーマット（全モジュール共通）
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  JAPANESE: 'YYYY年MM月DD日 HH:mm:ss',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
} as const;

// 環境設定（全モジュール共通）
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

export type Environment = typeof ENVIRONMENT[keyof typeof ENVIRONMENT];