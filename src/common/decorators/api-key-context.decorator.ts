/**
 * APIキーコンテキスト取得デコレーター
 * 要件: 7.1 (API認証)
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiKeyContext } from '../services/api-key.service';

/**
 * リクエストからAPIキーコンテキストを取得するデコレーター
 */
export const GetApiKeyContext = createParamDecorator(
  (data: keyof ApiKeyContext | undefined, ctx: ExecutionContext): ApiKeyContext | any => {
    const request = ctx.switchToHttp().getRequest();
    const apiKeyContext = request.apiKeyContext as ApiKeyContext;

    if (!apiKeyContext) {
      return null;
    }

    return data ? apiKeyContext[data] : apiKeyContext;
  },
);