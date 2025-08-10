/**
 * ワークフローコントローラー
 * 要件: 2.2, 2.3 (状態管理とワークフロー機能)
 */

import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkflowService } from '../services/workflow.service';
import { 
  UpdateStatusDto, 
  StatusHistoryDto, 
  StatusTransitionDto, 
  StatusStatsDto,
  StaleInquiryDto 
} from '../dto/workflow.dto';
import { BaseResponseDto } from '../dto/base-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { InquiryStatus } from '../types/inquiry.types';

@ApiTags('ワークフロー管理')
@Controller('api/v1/workflow')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);

  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * 問い合わせの状態を更新する
   * 要件: 2.2 (問い合わせ状態の管理)
   */
  @Put('inquiries/:id/status')
  @RequirePermission('inquiry', 'update')
  @ApiOperation({ 
    summary: '問い合わせ状態更新',
    description: '指定された問い合わせの状態を更新し、履歴を記録します。'
  })
  @ApiParam({
    name: 'id',
    description: '問い合わせID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '状態が正常に更新されました',
    type: BaseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '無効な状態遷移です',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された問い合わせが見つかりません',
  })
  async updateInquiryStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser() user: any,
  ): Promise<BaseResponseDto<any>> {
    try {
      this.logger.log(`状態更新リクエスト: 問い合わせID=${id}, 新状態=${updateStatusDto.status}`);
      
      const inquiry = await this.workflowService.updateInquiryStatus(
        id,
        updateStatusDto.status,
        user.id,
        updateStatusDto.comment
      );
      
      const response = new BaseResponseDto({
        id: inquiry.id,
        title: inquiry.title,
        status: inquiry.status,
        updatedAt: inquiry.updatedAt,
      }, true, '状態が正常に更新されました');
      
      return response;
    } catch (error) {
      this.logger.error(`状態更新エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 問い合わせの状態履歴を取得する
   * 要件: 2.3 (状態変更履歴の記録機能)
   */
  @Get('inquiries/:id/status-history')
  @RequirePermission('inquiry', 'read')
  @ApiOperation({ 
    summary: '問い合わせ状態履歴取得',
    description: '指定された問い合わせの状態変更履歴を取得します。'
  })
  @ApiParam({
    name: 'id',
    description: '問い合わせID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '状態履歴を正常に取得しました',
    type: BaseResponseDto<StatusHistoryDto[]>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された問い合わせが見つかりません',
  })
  async getInquiryStatusHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<StatusHistoryDto[]>> {
    try {
      this.logger.log(`状態履歴取得: 問い合わせID=${id}`);
      
      const history = await this.workflowService.getInquiryStatusHistory(id);
      
      const response = new BaseResponseDto(
        history.map(h => ({
          id: h.id,
          inquiryId: h.inquiryId,
          oldStatus: h.oldStatus,
          newStatus: h.newStatus,
          changedBy: h.changedBy,
          comment: h.comment,
          changedAt: h.changedAt,
          changedByUser: h.changedByUser ? {
            id: h.changedByUser.id,
            name: h.changedByUser.name,
            email: h.changedByUser.email,
          } : undefined,
        })),
        true,
        '状態履歴を正常に取得しました'
      );
      
      return response;
    } catch (error) {
      this.logger.error(`状態履歴取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 利用可能な状態遷移を取得する
   * 要件: 2.2 (状態管理ルール)
   */
  @Get('status-transitions/:currentStatus')
  @RequirePermission('inquiry', 'read')
  @ApiOperation({ 
    summary: '利用可能な状態遷移取得',
    description: '現在の状態から遷移可能な状態一覧を取得します。'
  })
  @ApiParam({
    name: 'currentStatus',
    description: '現在の状態',
    enum: InquiryStatus,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '利用可能な状態遷移を正常に取得しました',
    type: BaseResponseDto<StatusTransitionDto>,
  })
  async getAvailableStatusTransitions(
    @Param('currentStatus') currentStatus: InquiryStatus,
  ): Promise<BaseResponseDto<StatusTransitionDto>> {
    try {
      this.logger.log(`状態遷移取得: 現在状態=${currentStatus}`);
      
      const availableTransitions = this.workflowService.getAvailableStatusTransitions(currentStatus);
      
      const response = new BaseResponseDto({
        currentStatus,
        availableTransitions,
      }, true, '利用可能な状態遷移を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`状態遷移取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 状態別統計を取得する
   */
  @Get('status-stats')
  @RequirePermission('inquiry', 'read')
  @ApiOperation({ 
    summary: '状態別統計取得',
    description: '問い合わせの状態別件数統計を取得します。'
  })
  @ApiQuery({
    name: 'appId',
    required: false,
    type: String,
    description: 'アプリケーションID（指定時はそのアプリのみ）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '状態別統計を正常に取得しました',
    type: BaseResponseDto<StatusStatsDto>,
  })
  async getInquiryStatusStats(
    @Query('appId') appId?: string,
  ): Promise<BaseResponseDto<StatusStatsDto>> {
    try {
      this.logger.log(`状態別統計取得: アプリID=${appId || 'all'}`);
      
      const stats = await this.workflowService.getInquiryStatusStats(appId);
      
      const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
      
      const response = new BaseResponseDto({
        new: stats[InquiryStatus.NEW],
        inProgress: stats[InquiryStatus.IN_PROGRESS],
        pending: stats[InquiryStatus.PENDING],
        resolved: stats[InquiryStatus.RESOLVED],
        closed: stats[InquiryStatus.CLOSED],
        total,
      }, true, '状態別統計を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`状態別統計取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 放置されている問い合わせを取得する
   */
  @Get('stale-inquiries')
  @RequirePermission('inquiry', 'read')
  @ApiOperation({ 
    summary: '放置問い合わせ取得',
    description: '指定日数以上更新されていない問い合わせを取得します。'
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: '放置日数の閾値（デフォルト: 7日）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '放置問い合わせを正常に取得しました',
    type: BaseResponseDto<StaleInquiryDto[]>,
  })
  async getStaleInquiries(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ): Promise<BaseResponseDto<StaleInquiryDto[]>> {
    try {
      this.logger.log(`放置問い合わせ取得: ${days}日以上`);
      
      const staleInquiries = await this.workflowService.getStaleInquiries(days);
      
      const now = new Date();
      const response = new BaseResponseDto(
        staleInquiries.map(inquiry => {
          const staleDays = Math.floor((now.getTime() - inquiry.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            id: inquiry.id,
            title: inquiry.title,
            status: inquiry.status,
            updatedAt: inquiry.updatedAt,
            staleDays,
            application: inquiry.application ? {
              id: inquiry.application.id,
              name: inquiry.application.name,
            } : undefined,
            assignedUser: inquiry.assignedUser ? {
              id: inquiry.assignedUser.id,
              name: inquiry.assignedUser.name,
              email: inquiry.assignedUser.email,
            } : undefined,
          };
        }),
        true,
        '放置問い合わせを正常に取得しました'
      );
      
      return response;
    } catch (error) {
      this.logger.error(`放置問い合わせ取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 自動状態遷移を実行する（管理者用）
   */
  @Put('auto-transitions')
  @RequirePermission('system', 'admin')
  @ApiOperation({ 
    summary: '自動状態遷移実行',
    description: '自動状態遷移ルールを実行します。管理者のみ実行可能。'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '自動状態遷移を正常に実行しました',
    type: BaseResponseDto<null>,
  })
  async executeAutoStatusTransitions(): Promise<BaseResponseDto<null>> {
    try {
      this.logger.log('自動状態遷移実行リクエスト');
      
      await this.workflowService.executeAutoStatusTransitions();
      
      const response = new BaseResponseDto(null, true, '自動状態遷移を正常に実行しました');
      
      return response;
    } catch (error) {
      this.logger.error(`自動状態遷移実行エラー: ${error.message}`, error.stack);
      throw error;
    }
  }
}