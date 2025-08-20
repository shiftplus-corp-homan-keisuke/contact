/**
 * APIキーコンテキスト取得デコレーター
 * 要件7.1: APIキー認証機能の実装
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiKeyContext } from '../types/api-key.types';

/**
 * APIキーコンテキストを取得するデコレーター
 * 
 * @example
 * ```typescript
 * @Post()
 * async createInquiry(
 *   @ApiKeyContext() apiKeyContext: ApiKeyContext,
 *   @Body() createDto: CreateInquiryDto
 * ) {
 *   // apiKeyContext.appId でアプリケーションIDを取得
 *   // apiKeyContext.permissions で権限を確認
 * }
 * ```
 */
export const ApiKeyContext = createParamDecorator(
    (data: keyof ApiKeyContext | undefined, ctx: ExecutionContext): ApiKeyContext | any => {
        const request = ctx.switchToHttp().getRequest();
        const apiKeyContext = request.apiKeyContext;

        if (!apiKeyContext) {
            return null;
        }

        return data ? apiKeyContext[data] : apiKeyContext;
    },
);