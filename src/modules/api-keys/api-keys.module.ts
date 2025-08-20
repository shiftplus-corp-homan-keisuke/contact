/**
 * APIキーモジュール
 * 要件7.1: APIキー認証機能の実装
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey, RateLimitTracking } from './entities';
import { ApiKeysService, RateLimitService } from './services';
import { ApiKeyAuthGuard, RateLimitGuard } from './guards';

@Module({
    imports: [
        TypeOrmModule.forFeature([ApiKey, RateLimitTracking]),
    ],
    providers: [
        ApiKeysService,
        RateLimitService,
        ApiKeyAuthGuard,
        RateLimitGuard,
    ],
    exports: [
        ApiKeysService,
        RateLimitService,
        ApiKeyAuthGuard,
        RateLimitGuard,
    ],
})
export class ApiKeysModule { }