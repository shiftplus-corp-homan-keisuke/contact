/**
 * 通知モジュール
 * 要件: 1.5, 2.2, 2.3 (通知・アラートシステムの実装)
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// サービス
import { NotificationService } from './services/notification.service';

// ゲートウェイ
import { NotificationGateway } from './gateways/notification.gateway';

// 他モジュールからの依存関係
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule, // JwtAuthGuardを使用するため
  ],
  providers: [
    NotificationService,
    NotificationGateway,
  ],
  exports: [
    NotificationService,
    NotificationGateway,
  ],
})
export class NotificationsModule {}