/**
 * 分析モジュール
 * 要件: 9.1 (基本統計ダッシュボードの実装)
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsController } from '../controllers/analytics.controller';
import { AnalyticsGateway } from '../gateways/analytics.gateway';
import { Inquiry } from '../entities/inquiry.entity';
import { Response } from '../entities/response.entity';
import { Application } from '../entities/application.entity';
import { User } from '../entities/user.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inquiry,
      Response,
      Application,
      User,
      InquiryStatusHistory
    ])
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsGateway
  ],
  exports: [
    AnalyticsService,
    AnalyticsGateway
  ]
})
export class AnalyticsModule {}