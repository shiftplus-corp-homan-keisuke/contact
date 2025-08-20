/**
 * API関連の型定義
 * 要件7: API機能
 */

// APIキー管理
export interface ApiKey {
    id: string;
    appId: string;
    keyHash: string;
    name: string;
    permissions: string[];
    rateLimitPerHour: number;
    isActive: boolean;
    lastUsedAt?: Date;
    createdAt: Date;
    expiresAt?: Date;
}

export interface CreateApiKeyRequest {
    appId: string;
    name: string;
    permissions?: string[];
    rateLimitPerHour?: number;
    expiresAt?: Date;
}

export interface UpdateApiKeyRequest {
    name?: string;
    permissions?: string[];
    rateLimitPerHour?: number;
    isActive?: boolean;
    expiresAt?: Date;
}

export interface ApiKeyContext {
    appId: string;
    permissions: string[];
    rateLimit: RateLimitConfig;
    isActive: boolean;
}

export interface RateLimitConfig {
    maxRequests: number;
    windowSizeInHours: number;
    burstLimit?: number;
}

export interface RateLimitStatus {
    remaining: number;
    resetTime: Date;
    isExceeded: boolean;
    currentUsage: number;
    limit: number;
}

export interface RateLimitTracking {
    id: string;
    apiKeyId: string;
    requestCount: number;
    windowStart: Date;
    windowEnd: Date;
    createdAt: Date;
}

// API使用統計
export interface ApiUsageStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    rateLimitViolations: number;
    topEndpoints: EndpointUsage[];
    usageByHour: HourlyUsage[];
}

export interface EndpointUsage {
    endpoint: string;
    method: string;
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
}

export interface HourlyUsage {
    hour: Date;
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
}

// API認証関連
export interface ApiAuthRequest {
    apiKey: string;
    endpoint: string;
    method: string;
    ipAddress: string;
    userAgent: string;
}

export interface ApiAuthResult {
    isValid: boolean;
    context?: ApiKeyContext;
    rateLimitStatus: RateLimitStatus;
    errorMessage?: string;
}

// Webhook関連
export interface WebhookConfig {
    id: string;
    appId: string;
    url: string;
    events: WebhookEvent[];
    secret: string;
    isActive: boolean;
    retryPolicy: WebhookRetryPolicy;
    createdAt: Date;
}

export type WebhookEvent =
    | 'inquiry.created'
    | 'inquiry.updated'
    | 'inquiry.status_changed'
    | 'response.added'
    | 'faq.published';

export interface WebhookRetryPolicy {
    maxRetries: number;
    retryDelaySeconds: number;
    backoffMultiplier: number;
}

export interface WebhookPayload {
    event: WebhookEvent;
    timestamp: Date;
    data: any;
    appId: string;
    signature: string;
}