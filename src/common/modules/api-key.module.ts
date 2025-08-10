/**
 * APIキー管理モジュール
 * 要件: 7.1, 7.4 (API認証とレート制限)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

// エンティティ
import { ApiKey } from '../entities/api-key.entity';
import { RateLimitTracking } from '../entities/rate-limit-tracking.entity';
import { Application } from '../entities/application.entity';

// サービス
import { ApiKeyService } from '../services/api-key.service';
import { RateLimitService } from '../services/rate-limit.service';

// ストラテジー
import { ApiKeyStrategy } from '../strategies/api-key.strategy';

// ガード
import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';

// コントローラー
import { ApiKeyController } from '../controllers/api-key.controller';

// モジュール
import { RedisModule } from './redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApiKey,
      RateLimitTracking,
      Application,
    ]),
    PassportModule,
    RedisModule,
  ],
  providers: [
    // サービス
    ApiKeyService,
    RateLimitService,
    
    // ストラテジー
    ApiKeyStrategy,
    
    // ガード
    ApiKeyAuthGuard,
    RateLimitGuard,
  ],
  controllers: [
    ApiKeyController,
  ],
  exports: [
    // サービス
    ApiKeyService,
    RateLimitService,
    
    // ガード
    ApiKeyAuthGuard,
    RateLimitGuard,
    
    // ストラテジー
    ApiKeyStrategy,
  ],
})
export class ApiKeyModule {}