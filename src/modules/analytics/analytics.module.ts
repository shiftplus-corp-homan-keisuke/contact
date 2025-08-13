import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './services/analytics.service';
import { PredictionService } from './services/prediction.service';
import { Inquiry } from '../../common/entities/inquiry.entity';
import { Response } from '../../common/entities/response.entity';
import { Application } from '../../common/entities/application.entity';
import { User } from '../users/entities/user.entity';

/**
 * 分析モジュール
 * 要件: 9.1, 9.2, 9.3 (ダッシュボード・分析機能の実装)
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
  providers: [
    AnalyticsService,
    PredictionService,
  ],
  exports: [
    AnalyticsService,
    PredictionService,
  ],
})
export class AnalyticsModule {}