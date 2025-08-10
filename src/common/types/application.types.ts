/**
 * アプリケーション関連の型定義
 * 要件: 1.1, 1.2, 1.3 (問い合わせ登録機能)
 */

export interface Application {
  id: string;
  name: string;
  description?: string;
  apiKey?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApplicationRequest {
  name: string;
  description?: string;
}

export interface UpdateApplicationRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface ApiKeyContext {
  appId: string;
  permissions: string[];
  rateLimit: RateLimitConfig;
  isActive: boolean;
}

export interface RateLimitConfig {
  requestsPerHour: number;
  burstLimit?: number;
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: Date;
  isExceeded: boolean;
}

export interface ApiKey {
  id: string;
  appId: string;
  keyHash: string;
  name?: string;
  permissions: string[];
  rateLimitPerHour: number;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}