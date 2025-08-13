/**
 * 認証モジュール固有の定数
 */

// レート制限設定
export const RATE_LIMIT = {
  DEFAULT_PER_HOUR: 1000,
  API_KEY_PER_HOUR: 5000,
  LOGIN_ATTEMPTS_PER_HOUR: 10,
  PASSWORD_RESET_PER_HOUR: 5,
} as const;

// JWT設定
export const JWT_SETTINGS = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  ALGORITHM: 'HS256',
} as const;

// セッション設定
export const SESSION_SETTINGS = {
  MAX_AGE: 24 * 60 * 60 * 1000, // 24時間（ミリ秒）
  SECURE: process.env.NODE_ENV === 'production',
  HTTP_ONLY: true,
  SAME_SITE: 'strict' as const,
} as const;

// APIキー設定
export const API_KEY_SETTINGS = {
  LENGTH: 64, // 文字数
  EXPIRES_IN_DAYS: 365, // 有効期限（日数）
  PREFIX: 'ims_', // プレフィックス
} as const;

// 認証試行制限
export const AUTH_ATTEMPT_LIMITS = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30分（ミリ秒）
  RESET_AFTER: 24 * 60 * 60 * 1000, // 24時間（ミリ秒）
} as const;