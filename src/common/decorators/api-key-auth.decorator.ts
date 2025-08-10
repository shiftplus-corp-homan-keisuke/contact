/**
 * APIキー認証デコレーター
 * 要件: 7.1 (API認証)
 */

import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';

/**
 * APIキー認証とレート制限を適用するデコレーター
 */
export function ApiKeyAuth() {
  return applyDecorators(
    UseGuards(ApiKeyAuthGuard, RateLimitGuard),
    ApiSecurity('api-key'),
    ApiUnauthorizedResponse({
      description: 'API認証が必要です',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'API認証が必要です' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiTooManyRequestsResponse({
      description: 'レート制限を超過しました',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 429 },
          message: { type: 'string', example: 'レート制限を超過しました' },
          error: { type: 'string', example: 'Too Many Requests' },
          rateLimitInfo: {
            type: 'object',
            properties: {
              limit: { type: 'number', example: 1000 },
              remaining: { type: 'number', example: 0 },
              resetTime: { type: 'string', example: '2024-01-01T01:00:00.000Z' },
            },
          },
        },
      },
    }),
  );
}

/**
 * APIキー認証のみ適用するデコレーター（レート制限なし）
 */
export function ApiKeyAuthOnly() {
  return applyDecorators(
    UseGuards(ApiKeyAuthGuard),
    ApiSecurity('api-key'),
    ApiUnauthorizedResponse({
      description: 'API認証が必要です',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'API認証が必要です' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );
}