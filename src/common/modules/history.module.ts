/**
 * 履歴管理モジュール
 * 要件: 2.2, 2.4, 4.3 (履歴管理機能の統合)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryService } from '../services/history.service';
import { HistoryTrackingInterceptor } from '../interceptors/history-tracking.interceptor';
import { UserHistory } from '../entities/user-history.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';
import { ResponseHistory } from '../entities/response-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserHistory,
      InquiryStatusHistory,
      ResponseHistory,
    ]),
  ],
  providers: [
    HistoryService,
    HistoryTrackingInterceptor,
  ],
  exports: [
    HistoryService,
    HistoryTrackingInterceptor,
  ],
})
export class HistoryModule {}