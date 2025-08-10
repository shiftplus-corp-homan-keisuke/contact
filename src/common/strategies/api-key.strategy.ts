/**
 * APIキー認証ストラテジー
 * 要件: 7.1 (API認証)
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ApiKeyService, ApiKeyContext } from '../services/api-key.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  async validate(req: Request): Promise<ApiKeyContext> {
    // ヘッダーからAPIキーを取得
    const apiKey = this.extractApiKeyFromRequest(req);
    
    if (!apiKey) {
      throw new UnauthorizedException('APIキーが提供されていません');
    }

    try {
      // APIキーの検証
      const apiKeyContext = await this.apiKeyService.validateApiKey(apiKey);
      
      // リクエストオブジェクトにAPIキー情報を追加
      req['apiKeyContext'] = apiKeyContext;
      
      return apiKeyContext;
    } catch (error) {
      throw new UnauthorizedException('無効なAPIキーです');
    }
  }

  /**
   * リクエストからAPIキーを抽出
   */
  private extractApiKeyFromRequest(req: Request): string | null {
    // X-API-Key ヘッダーから取得
    const headerApiKey = req.headers['x-api-key'] as string;
    if (headerApiKey) {
      return headerApiKey;
    }

    // Authorization ヘッダーから取得 (Bearer形式)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // APIキーの形式チェック（ims_で始まる）
      if (token.startsWith('ims_')) {
        return token;
      }
    }

    // クエリパラメータから取得（非推奨だが互換性のため）
    const queryApiKey = req.query.api_key as string;
    if (queryApiKey) {
      return queryApiKey;
    }

    return null;
  }
}