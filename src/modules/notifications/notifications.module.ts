import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import {
    NotificationRule,
    NotificationLog,
    UserNotificationSettings
} from './entities';
import { SlaConfig } from './entities/sla-config.entity';
import { SlaViolation } from './entities/sla-violation.entity';
import { Escalation } from './entities/escalation.entity';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { User } from '../users/entities/user.entity';
import {
    NotificationsService,
    EmailNotificationService,
    NotificationTemplateService,
    RealtimeNotificationService,
    SlackNotificationService,
    TeamsNotificationService,
    NotificationRuleEngineService
} from './services';
import { SlaMonitoringService } from './services/sla-monitoring.service';
import { EscalationService } from './services/escalation.service';
import { AlertDashboardService } from './services/alert-dashboard.service';
import {
    NotificationsController,
    RealtimeNotificationsController,
    NotificationRulesController
} from './controllers';
import { SlaMonitoringController } from './controllers/sla-monitoring.controller';
import { EscalationController } from './controllers/escalation.controller';
import { AlertDashboardController } from './controllers/alert-dashboard.controller';
import { NotificationsGateway } from './gateways';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            NotificationRule,
            NotificationLog,
            UserNotificationSettings,
            SlaConfig,
            SlaViolation,
            Escalation,
            Inquiry,
            User,
        ]),
        ConfigModule,
        EventEmitterModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [
        NotificationsController,
        RealtimeNotificationsController,
        NotificationRulesController,
        SlaMonitoringController,
        EscalationController,
        AlertDashboardController,
    ],
    providers: [
        NotificationsService,
        EmailNotificationService,
        NotificationTemplateService,
        RealtimeNotificationService,
        SlackNotificationService,
        TeamsNotificationService,
        NotificationRuleEngineService,
        SlaMonitoringService,
        EscalationService,
        AlertDashboardService,
        NotificationsGateway,
    ],
    exports: [
        NotificationsService,
        EmailNotificationService,
        NotificationTemplateService,
        RealtimeNotificationService,
        SlackNotificationService,
        TeamsNotificationService,
        NotificationRuleEngineService,
        SlaMonitoringService,
        EscalationService,
        AlertDashboardService,
        NotificationsGateway,
    ],
})
export class NotificationsModule { }