/**
 * レート制限ガード
 * 要件: 7.4 (API利用制限の管理)
 */

import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { ApiKeyContext } from '../services/api-key.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // APIキー認証情報を取得
    const apiKeyContext = request['apiKeyContext'] as ApiKeyContext;
    
    if (!apiKeyContext) {
      // APIキー認証が必要
      throw new HttpException('API認証が必要です', HttpStatus.UNAUTHORIZED);
    }

    try {
      // レート制限チェック
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        apiKeyContext.apiKeyId,
        apiKeyContext.rateLimit.limitPerHour
      );

      // レスポンスヘッダーにレート制限情報を追加
      response.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
      response.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      response.setHeader('X-RateLimit-Reset', Math.floor(rateLimitResult.resetTime.getTime() / 1000));

      if (!rateLimitResult.allowed) {
        // レート制限超過
        response.setHeader('Retry-After', Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000));
        
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'レート制限を超過しました',
            error: 'Too Many Requests',
            rateLimitInfo: {
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime,
            },
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      // レート制限チェックでエラーが発生した場合はログに記録してリクエストを通す
      console.error('Rate limit check failed:', error);
      return true;
    }
  }
}