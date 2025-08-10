/**
 * 役割・権限関連の型定義
 * 要件: 5.1, 5.2, 5.3, 5.4 (権限管理機能)
 */

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: Permission[];
}

// 権限チェック用の型
export interface PermissionCheck {
  resource: string;
  action: string;
}

// 事前定義された権限リソース
export enum ResourceType {
  INQUIRY = 'inquiry',
  RESPONSE = 'response',
  FAQ = 'faq',
  USER = 'user',
  ROLE = 'role',
  APPLICATION = 'application',
  ANALYTICS = 'analytics',
  TEMPLATE = 'template',
  FILE = 'file'
}

// 事前定義されたアクション
export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  PUBLISH = 'publish',
  EXPORT = 'export'
}

// 事前定義された役割
export enum RoleType {
  ADMIN = 'admin',
  SUPPORT_STAFF = 'support_staff',
  VIEWER = 'viewer',
  API_USER = 'api_user'
}