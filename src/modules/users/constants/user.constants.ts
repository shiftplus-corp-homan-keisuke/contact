/**
 * ユーザーモジュール固有の定数
 */

// ユーザー役割
export const USER_ROLE = {
  ADMIN: 'admin',
  SUPPORT: 'support',
  VIEWER: 'viewer',
  API_USER: 'api_user',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

// 権限アクション
export const PERMISSION_ACTION = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const;

export type PermissionAction = typeof PERMISSION_ACTION[keyof typeof PERMISSION_ACTION];

// 権限リソース
export const PERMISSION_RESOURCE = {
  INQUIRY: 'inquiry',
  RESPONSE: 'response',
  FAQ: 'faq',
  USER: 'user',
  ANALYTICS: 'analytics',
  TEMPLATE: 'template',
  FILE: 'file',
} as const;

export type PermissionResource = typeof PERMISSION_RESOURCE[keyof typeof PERMISSION_RESOURCE];

// パスワード設定
export const PASSWORD_SETTINGS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SYMBOLS: false,
} as const;