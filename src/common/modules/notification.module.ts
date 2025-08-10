import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationController } from '../controllers/notification.controller';
import { RealtimeNotificationService } from '../services/realtime-notification.service';
import { SlackNotificationService } from '../services/slack-notification.service';
import { TeamsNotificationService } from '../services/teams-notification.service';
import { NotificationRuleEngineService } from '../services/notification-rule-engine.service';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationRule } from '../entities/notification-rule.entity';
import { NotificationLog } from '../entities/notification-log.entity';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';

/**
 * 通知モジュール
 * リアルタイム通知、Slack/Teams連携、通知ルールエンジンを提供
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      NotificationRule,
      NotificationLog,
      UserNotificationSettings,
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationGateway,
    RealtimeNotificationService,
    SlackNotificationService,
    TeamsNotificationService,
    NotificationRuleEngineService,
  ],
  exports: [
    RealtimeNotificationService,
    SlackNotificationService,
    TeamsNotificationService,
    NotificationRuleEngineService,
    NotificationGateway,
  ],
})
export class NotificationModule {}