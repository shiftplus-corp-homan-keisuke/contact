import { ApiProperty } from '@nestjs/swagger';

/**
 * 認証結果
 */
export class AuthResult {
    @ApiProperty({
        description: 'ユーザー情報',
    })
    user: UserContext;

    @ApiProperty({
        description: 'アクセストークン',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    accessToken: string;

    @ApiProperty({
        description: 'リフレッシュトークン',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    refreshToken: string;

    @ApiProperty({
        description: 'トークン有効期限（秒）',
        example: 86400,
    })
    expiresIn: number;
}

/**
 * ユーザーコンテキスト
 */
export interface UserContext {
    id: string;
    email: string;
    name: string;
    roleId: string;
    permissions: string[];
}

/**
 * APIキーコンテキスト
 */
export interface ApiKeyContext {
    appId: string;
    permissions: string[];
    rateLimit: RateLimitConfig;
    isActive: boolean;
}

/**
 * レート制限設定
 */
export interface RateLimitConfig {
    requestsPerHour: number;
    burstLimit?: number;
}

/**
 * レート制限状態
 */
export interface RateLimitStatus {
    remaining: number;
    resetTime: Date;
    isExceeded: boolean;
}

/**
 * ログインコンテキスト
 */
export interface LoginContext {
    ip: string;
    userAgent: string;
}

/**
 * 認証試行情報
 */
export interface AuthAttempt {
    email: string;
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
    attemptedAt: Date;
}

/**
 * セキュリティアラート
 */
export interface SecurityAlert {
    type: 'suspicious_login' | 'multiple_failures' | 'unusual_location';
    userId: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: Date;
    metadata?: Record<string, any>;
}