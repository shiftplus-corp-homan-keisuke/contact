/**
 * APIキー関連の型定義
 * 要件7.1: APIキー認証機能の実装
 */

/**
 * APIキーコンテキスト
 */
export interface ApiKeyContext {
    /** APIキーID */
    id: string;
    /** アプリケーションID */
    appId: string;
    /** APIキー名 */
    name: string;
    /** 権限リスト */
    permissions: string[];
    /** レート制限設定 */
    rateLimit: {
        /** 制限期間（秒） */
        windowMs: number;
        /** 制限期間内の最大リクエスト数 */
        maxRequests: number;
    };
    /** 有効期限 */
    expiresAt?: Date;
    /** 最終使用日時 */
    lastUsedAt?: Date;
}

/**
 * APIキー使用統計
 */
export interface ApiKeyUsageStats {
    /** エンドポイント */
    endpoint: string;
    /** HTTPメソッド */
    method: string;
    /** IPアドレス */
    ip: string;
    /** ユーザーエージェント */
    userAgent?: string;
    /** タイムスタンプ */
    timestamp?: Date;
}

/**
 * レート制限状態
 */
export interface RateLimitStatus {
    /** 制限を超過しているか */
    isExceeded: boolean;
    /** 現在のリクエスト数 */
    current: number;
    /** 制限数 */
    limit: number;
    /** リセット時刻 */
    resetTime: Date;
    /** 残りリクエスト数 */
    remaining: number;
}

/**
 * レート制限結果
 */
export interface RateLimitResult {
    /** 制限を超過しているか */
    isExceeded: boolean;
    /** 現在のリクエスト数 */
    current: number;
    /** リセット時刻（Unix timestamp） */
    resetTime: number;
}