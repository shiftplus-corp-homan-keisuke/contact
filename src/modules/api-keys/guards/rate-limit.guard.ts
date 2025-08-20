/**
 * レート制限ガード
 * 要件7.4: レート制限機能の実装
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitExceededException } from '../../../common/filters/api-exception.filter';

/**
 * レート制限設定のメタデータキー
 */
export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * レート制限設定
 */
export interface RateLimitConfig {
    /** 制限期間（秒） */
    windowMs: number;
    /** 制限期間内の最大リクエスト数 */
    max: number;
    /** カスタムキー生成関数 */
    keyGenerator?: (request: Request) => string;
    /** スキップ条件 */
    skip?: (request: Request) => boolean;
}

/**
 * レート制限デコレーター
 */
export const RateLimit = (config: RateLimitConfig) => {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
        const reflector = new Reflector();
        if (descriptor) {
            // メソッドレベル
            reflector.set(RATE_LIMIT_KEY, config, descriptor.value);
        } else {
            // クラスレベル
            reflector.set(RATE_LIMIT_KEY, config, target);
        }
    };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
    private readonly logger = new Logger(RateLimitGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly rateLimitService: RateLimitService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse();

        // レート制限設定を取得
        const rateLimitConfig = this.reflector.getAllAndOverride<RateLimitConfig>(
            RATE_LIMIT_KEY,
            [context.getHandler(), context.getClass()]
        );

        if (!rateLimitConfig) {
            return true; // レート制限設定がない場合は通す
        }

        // スキップ条件をチェック
        if (rateLimitConfig.skip && rateLimitConfig.skip(request)) {
            return true;
        }

        // キーを生成
        const key = rateLimitConfig.keyGenerator
            ? rateLimitConfig.keyGenerator(request)
            : this.generateDefaultKey(request);

        try {
            // レート制限をチェック
            const result = await this.rateLimitService.checkAndIncrementRateLimit(
                key,
                rateLimitConfig.windowMs,
                rateLimitConfig.max
            );

            // レスポンスヘッダーを設定
            response.set({
                'X-RateLimit-Limit': rateLimitConfig.max.toString(),
                'X-RateLimit-Remaining': Math.max(0, rateLimitConfig.max - result.current).toString(),
                'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            });

            if (result.isExceeded) {
                this.logger.warn(`レート制限超過: key=${key}, current=${result.current}, limit=${rateLimitConfig.max}`);
                throw new RateLimitExceededException(new Date(result.resetTime));
            }

            return true;

        } catch (error) {
            if (error instanceof RateLimitExceededException) {
                throw error;
            }

            this.logger.error(`レート制限チェックエラー: ${error.message}`, error.stack);
            return true; // エラーの場合は通す（フェイルオープン）
        }
    }

    /**
     * デフォルトキー生成
     */
    private generateDefaultKey(request: Request): string {
        const apiKeyContext = (request as any).apiKeyContext;
        if (apiKeyContext) {
            return `api_key:${apiKeyContext.appId}`;
        }

        const user = (request as any).user;
        if (user) {
            return `user:${user.id}`;
        }

        // フォールバック: IPアドレス
        return `ip:${request.ip}`;
    }
}