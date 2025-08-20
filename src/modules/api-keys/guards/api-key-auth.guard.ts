/**
 * APIキー認証ガード
 * 要件7.1, 7.3: APIキー認証機能の実装
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeysService } from '../services/api-keys.service';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitExceededException } from '../../../common/filters/api-exception.filter';
import { API_ERROR_CODES } from '../../../common/dto/api-response.dto';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
    private readonly logger = new Logger(ApiKeyAuthGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly apiKeysService: ApiKeysService,
        private readonly rateLimitService: RateLimitService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        // パブリックエンドポイントの場合はスキップ
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        // APIキーを取得
        const apiKey = this.extractApiKey(request);
        if (!apiKey) {
            this.logger.warn(`APIキーが提供されていません: ${request.ip} ${request.url}`);
            throw new UnauthorizedException({
                code: API_ERROR_CODES.INVALID_API_KEY,
                message: 'APIキーが必要です',
            });
        }

        try {
            // APIキーの検証
            const apiKeyContext = await this.apiKeysService.validateApiKey(apiKey);
            if (!apiKeyContext) {
                this.logger.warn(`無効なAPIキー: ${apiKey.substring(0, 8)}... from ${request.ip}`);
                throw new UnauthorizedException({
                    code: API_ERROR_CODES.INVALID_API_KEY,
                    message: '無効なAPIキーです',
                });
            }

            // レート制限チェック
            const rateLimitStatus = await this.rateLimitService.checkRateLimit(apiKey);
            if (rateLimitStatus.isExceeded) {
                this.logger.warn(`レート制限超過: ${apiKey.substring(0, 8)}... from ${request.ip}`);
                throw new RateLimitExceededException(rateLimitStatus.resetTime);
            }

            // リクエストにAPIキーコンテキストを追加
            (request as any).apiKeyContext = apiKeyContext;

            // 使用統計を記録
            await this.apiKeysService.recordApiKeyUsage(apiKey, {
                endpoint: request.url,
                method: request.method,
                ip: request.ip,
                userAgent: request.get('User-Agent'),
            });

            this.logger.debug(`APIキー認証成功: ${apiKeyContext.appId} from ${request.ip}`);
            return true;

        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof RateLimitExceededException) {
                throw error;
            }

            this.logger.error(`APIキー認証エラー: ${error.message}`, error.stack);
            throw new UnauthorizedException({
                code: API_ERROR_CODES.UNAUTHORIZED,
                message: '認証に失敗しました',
            });
        }
    }

    /**
     * リクエストからAPIキーを抽出
     */
    private extractApiKey(request: Request): string | null {
        // X-API-Keyヘッダーから取得
        const headerApiKey = request.get('X-API-Key');
        if (headerApiKey) {
            return headerApiKey;
        }

        // Authorizationヘッダーから取得（Bearer形式）
        const authHeader = request.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // クエリパラメータから取得（非推奨だが互換性のため）
        const queryApiKey = request.query.api_key as string;
        if (queryApiKey) {
            this.logger.warn('クエリパラメータでのAPIキー送信は非推奨です。ヘッダーを使用してください。');
            return queryApiKey;
        }

        return null;
    }
}