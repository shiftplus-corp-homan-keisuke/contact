/**
 * パブリックエンドポイント用デコレーター
 * 要件7.3: API認証とエラーハンドリングの実装
 */

import { SetMetadata } from '@nestjs/common';

/**
 * パブリックエンドポイントマーカー
 * このデコレーターが付いたエンドポイントは認証をスキップします
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);