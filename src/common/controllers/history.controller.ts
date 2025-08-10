/**
 * 履歴管理コントローラー
 * 要件: 2.2, 2.4, 4.3 (履歴データの取得・表示機能)
 */

import { Controller, Get, Query, Param, UseInterceptors } from '@nestjs/common';
import { HistoryService, HistoryFilters } from '../services/history.service';
import { HistoryTrackingInterceptor } from '../interceptors/history-tracking.interceptor';
import { TrackHistory } from '../decorators/track-history.decorator';
import { PaginationOptions, DateRange } from '../types';

@Controller('history')
@UseInterceptors(HistoryTrackingInterceptor)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /**
   * ユーザー履歴を取得
   */
  @Get('users/:userId')
  @TrackHistory()
  async getUserHistory(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const pagination: PaginationOptions = { page, limit };
    return await this.historyService.getUserHistory(userId, pagination);
  }

  /**
   * 問い合わせ状態履歴を取得
   */
  @Get('inquiries/:inquiryId')
  @TrackHistory()
  async getInquiryStatusHistory(
    @Param('inquiryId') inquiryId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const pagination: PaginationOptions = { page, limit };
    return await this.historyService.getInquiryStatusHistory(inquiryId, pagination);
  }

  /**
   * 回答履歴を取得
   */
  @Get('responses/:responseId')
  @TrackHistory()
  async getResponseHistory(
    @Param('responseId') responseId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const pagination: PaginationOptions = { page, limit };
    return await this.historyService.getResponseHistory(responseId, pagination);
  }

  /**
   * 統合アクティビティログを取得
   */
  @Get('activity')
  @TrackHistory()
  async getActivityLog(
    @Query('entityType') entityType?: 'user' | 'inquiry' | 'response',
    @Query('entityId') entityId?: string,
    @Query('changedBy') changedBy?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const filters: HistoryFilters = {
      entityType,
      entityId,
      changedBy,
    };

    if (startDate && endDate) {
      filters.dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      } as DateRange;
    }

    const pagination: PaginationOptions = { page, limit };
    return await this.historyService.getActivityLog(filters, pagination);
  }

  /**
   * 履歴統計を取得
   */
  @Get('statistics')
  @TrackHistory()
  async getHistoryStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    let dateRange: DateRange | undefined;
    
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    }

    return await this.historyService.getHistoryStatistics(dateRange);
  }
}