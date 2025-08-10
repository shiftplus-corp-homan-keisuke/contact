import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SlaConfig } from '../entities/sla-config.entity';
import { SlaViolation } from '../entities/sla-violation.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { User } from '../entities/user.entity';
import { SlaController } from '../controllers/sla.controller';
import { SlaMonitoringService } from '../services/sla-monitoring.service';
import { EscalationService } from '../services/escalation.service';
import { RealtimeNotificationService } from '../services/realtime-notification.service';
import { SlackNotificationService } from '../services/slack-notification.service';
import { TeamsNotificationService } from '../services/teams-notification.service';

/**
 * SLAモジュール
 * SLA監視、エスカレーション、アラート機能を提供
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SlaConfig,
      SlaViolation,
      Inquiry,
      User,
    ]),
    ScheduleModule.forRoot(), // Cronジョブのために必要
  ],
  controllers: [SlaController],
  providers: [
    SlaMonitoringService,
    EscalationService,
    RealtimeNotificationService,
    SlackNotificationService,
    TeamsNotificationService,
  ],
  exports: [
    SlaMonitoringService,
    EscalationService,
  ],
})
export class SlaModule {}