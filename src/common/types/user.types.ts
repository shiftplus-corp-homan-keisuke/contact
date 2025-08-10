/**
 * ユーザー関連の型定義
 * 要件: 4.1, 4.2 (ユーザー管理機能)
 */

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  roleId: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface UserHistory {
  id: string;
  userId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string;
  changedBy: string;
  changedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserContext {
  userId: string;
  email: string;
  name: string;
  roleId: string;
  permissions: string[];
}

export interface AuthAttempt {
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  attemptedAt: Date;
}