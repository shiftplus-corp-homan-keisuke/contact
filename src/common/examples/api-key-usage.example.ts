/**
 * APIキー認証の使用例
 * 要件: 7.1, 7.4 (API認証とレート制限)
 */

import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiKeyAuth, ApiKeyAuthOnly } from '../decorators/api-key-auth.decorator';
import { GetApiKeyContext } from '../decorators/api-key-context.decorator';
import { ApiKeyContext } from '../services/api-key.service';

@ApiTags('API Example')
@Controller('api/v1/example')
export class ApiExampleController {
  
  /**
   * APIキー認証とレート制限の両方を適用する例
   * 要件: 7.1, 7.4 - API認証とレート制限
   */
  @Post('inquiries')
  @ApiKeyAuth() // APIキー認証 + レート制限
  @ApiOperation({ summary: '問い合わせ登録（APIキー認証 + レート制限）' })
  @ApiResponse({ status: 201, description: '問い合わせが正常に登録されました' })
  async createInquiry(
    @Body() inquiryData: any,
    @GetApiKeyContext() apiKeyContext: ApiKeyContext,
  ) {
    // APIキーコンテキストから情報を取得
    console.log('App ID:', apiKeyContext.appId);
    console.log('Permissions:', apiKeyContext.permissions);
    console.log('Rate Limit:', apiKeyContext.rateLimit);
    
    // 問い合わせ作成ロジック
    return {
      message: '問い合わせが正常に登録されました',
      appId: apiKeyContext.appId,
      inquiryId: 'generated-inquiry-id',
    };
  }

  /**
   * APIキー認証のみを適用する例（レート制限なし）
   * 要件: 7.1 - API認証
   */
  @Get('status')
  @ApiKeyAuthOnly() // APIキー認証のみ
  @ApiOperation({ summary: 'ステータス確認（APIキー認証のみ）' })
  @ApiResponse({ status: 200, description: 'ステータス情報を正常に取得しました' })
  async getStatus(
    @GetApiKeyContext() apiKeyContext: ApiKeyContext,
  ) {
    return {
      status: 'active',
      appId: apiKeyContext.appId,
      permissions: apiKeyContext.permissions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 特定の権限をチェックする例
   */
  @Get('protected-resource')
  @ApiKeyAuth()
  @ApiOperation({ summary: '保護されたリソースへのアクセス' })
  async getProtectedResource(
    @GetApiKeyContext() apiKeyContext: ApiKeyContext,
  ) {
    // 特定の権限をチェック
    if (!apiKeyContext.permissions.includes('inquiry:read')) {
      throw new Error('このリソースにアクセスする権限がありません');
    }

    return {
      message: '保護されたリソースにアクセスしました',
      data: 'sensitive-data',
    };
  }

  /**
   * アプリIDに基づく処理の例
   */
  @Get('app-specific-data')
  @ApiKeyAuth()
  @ApiOperation({ summary: 'アプリ固有データの取得' })
  async getAppSpecificData(
    @GetApiKeyContext('appId') appId: string, // 特定のプロパティのみ取得
  ) {
    return {
      appId,
      data: `${appId}専用のデータ`,
      features: ['feature1', 'feature2'],
    };
  }
}

/**
 * 使用方法の説明:
 * 
 * 1. APIキー認証 + レート制限:
 *    @ApiKeyAuth() を使用
 *    - APIキーの検証
 *    - レート制限のチェック
 *    - レスポンスヘッダーにレート制限情報を追加
 * 
 * 2. APIキー認証のみ:
 *    @ApiKeyAuthOnly() を使用
 *    - APIキーの検証のみ
 *    - レート制限は適用されない
 * 
 * 3. APIキーコンテキストの取得:
 *    @GetApiKeyContext() を使用
 *    - 全体のコンテキストを取得: @GetApiKeyContext()
 *    - 特定のプロパティのみ取得: @GetApiKeyContext('appId')
 * 
 * 4. APIキーの送信方法:
 *    - ヘッダー: X-API-Key: ims_your-api-key
 *    - Authorization: Bearer ims_your-api-key
 *    - クエリパラメータ: ?api_key=ims_your-api-key (非推奨)
 * 
 * 5. レート制限情報の確認:
 *    レスポンスヘッダーで確認可能:
 *    - X-RateLimit-Limit: 制限値
 *    - X-RateLimit-Remaining: 残り回数
 *    - X-RateLimit-Reset: リセット時刻（Unix timestamp）
 */