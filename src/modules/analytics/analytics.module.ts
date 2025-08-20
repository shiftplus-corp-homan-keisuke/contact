import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './controllers/analytics.controller';
import { PerformanceController } from './controllers/performance.controller';
import { PredictionController } from './controllers/prediction.controller';
import { AnalyticsService } from './services/analytics.service';
import { PerformanceService } from './services/performance.service';
import { PredictionService } from './services/prediction.service';
import { AnalyticsGateway } from './gateways/analytics.gateway';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { Response } from '../responses/entities/response.entity';
import { Application } from '../inquiries/entities/application.entity';
import { User } from '../users/entities/user.entity';

/**
 * 分析機能モジュール
 * ダッシュボード、統計情報、リアルタイム更新機能を提供
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Inquiry,
            Response,
            Application,
            User,
        ]),
    ],
    controllers: [
        AnalyticsController,
        PerformanceController,
        PredictionController,
    ],
    providers: [
        AnalyticsService,
        PerformanceService,
        PredictionService,
        AnalyticsGateway,
    ],
    exports: [
        AnalyticsService,
        PerformanceService,
        PredictionService,
        AnalyticsGateway,
    ],
})
export class AnalyticsModule { }