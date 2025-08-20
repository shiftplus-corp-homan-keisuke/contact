/**
 * ユーザー関連の型定義
 * 要件4: ユーザー管理機能に対応
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

export interface UserContext {
    id: string;
    email: string;
    name: string;
    role: Role;
    permissions: string[];
}

export interface Role {
    id: string;
    name: string;
    permissions: Permission[];
    createdAt: Date;
}

export interface Permission {
    id: string;
    name: string;
    resource: string;
    action: string;
}

export interface CreateRoleRequest {
    name: string;
    permissions: string[];
}

export interface UpdateRoleRequest {
    name?: string;
    permissions?: string[];
}

// 認証関連の型定義
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

export interface AuthAttempt {
    email: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    failureReason?: string;
    attemptedAt: Date;
}

export interface SecurityAlert {
    id: string;
    userId: string;
    alertType: 'suspicious_login' | 'multiple_failures' | 'unusual_activity';
    description: string;
    severity: 'low' | 'medium' | 'high';
    createdAt: Date;
}