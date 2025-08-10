/**
 * パブリックエンドポイント用デコレーター
 * 認証を不要にするためのデコレーター
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);