/**
 * APIキー認証デコレーター
 * 要件7.1: APIキー認証機能の実装
 */

import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { RateLimitGuard, RateLimit, RateLimitConfig } from '../guards/rate-limit.guard';

/**
 * APIキー認証を適用するデコレーター
 * 
 * @param rateLimitConfig レート制限設定（オプション）
 * 
 * @example
 * ```typescript
 * @ApiKeyAuth()
 * @Post()
 * async createInquiry(@Body() createDto: CreateInquiryDto) {
 *   // APIキー認証が必要
 * }
 * 
 * @ApiKeyAuth({ windowMs: 60000, max: 100 }) // 1分間に100リクエスト
 * @Post()
 * async createInquiry(@Body() createDto: CreateInquiryDto) {
 *   // APIキー認証 + レート制限
 * }
 * ```
 */
export function ApiKeyAuth(rateLimitConfig?: RateLimitConfig) {
    const decorators = [
        UseGuards(ApiKeyAuthGuard),
        ApiSecurity('api_key'),
        ApiBearerAuth(),
    ];

    if (rateLimitConfig) {
        decorators.push(
            RateLimit(rateLimitConfig),
            UseGuards(RateLimitGuard)
        );
    }

    return applyDecorators(...decorators);
}