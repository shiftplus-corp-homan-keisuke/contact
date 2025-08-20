/**
 * ワークフローコントローラー
 * 要件2.2: 問い合わせ状態の管理
 * 要件2.3: 状態変更履歴の記録機能
 */

import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpStatus,
    Logger,
    ParseUUIDPipe,
    ValidationPipe,
    UsePipes
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth
} from '@nestjs/swagger';

import { WorkflowService } from '../services/workflow.service';
import { InquiriesService } from '../services/inquiries.service';
import { InquiryStatus } from '../entities/inquiry.entity';
import { UpdateInquiryStatusDto, InquiryResponseDto } from '../dto';

/**
 * 状態統計レスポンスDTO
 */
export class StatusStatisticsDto {
    new: number;
    in_progress: number;
    pending: number;
    resolved: number;
    closed: number;
}

/**
 * 利用可能な状態遷移レスポンスDTO
 */
export class AvailableTransitionsDto {
    currentStatus: InquiryStatus;
    availableTransitions: InquiryStatus[];
    transitionRules: Record<InquiryStatus, {
        requireComment?: boolean;
        notificationRequired?: boolean;
    }>;
}

// 認証ガードは後で実装予定
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('workflow')
@Controller('api/v1/workflow')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkflowController {
    private readonly logger = new Logger(WorkflowController.name);

    constructor(
        private readonly workflowService: WorkflowService,
        private readonly inquiriesService: InquiriesService
    ) { }

    /**
     * 問い合わせの状態を変更する
     * 要件2.2, 2.3: 状態管理機能
     */
    @Post('inquiries/:id/status')
    @ApiOperation({
        summary: '問い合わせ状態を変更',
        description: 'ワークフロールールに従って問い合わせの状態を変更します。'
    })
    @ApiParam({
        name: 'id',
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '状態が正常に変更されました',
        type: InquiryResponseDto
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '無効な状態遷移または入力データに不備があります'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された問い合わせが見つかりません'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async changeInquiryStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateStatusDto: UpdateInquiryStatusDto,
        @Request() req?: any
    ): Promise<InquiryResponseDto> {
        this.logger.log(`ワークフロー状態変更リクエスト: ID=${id}, 新状態=${updateStatusDto.status}`);

        // 認証実装後にユーザーIDを取得
        const changedBy = req?.user?.id || 'system';
        const ipAddress = req?.ip;

        // ワークフローサービスを使用して状態変更を実行
        const updatedInquiry = await this.workflowService.executeStatusChange(
            id,
            updateStatusDto.status,
            changedBy,
            updateStatusDto.comment,
            ipAddress
        );

        // レスポンスDTOに変換
        const result = await this.inquiriesService.getInquiry(id);

        this.logger.log(`ワークフロー状態変更完了: ID=${id}`);
        return result;
    }

    /**
     * 利用可能な状態遷移を取得する
     */
    @Get('inquiries/:id/transitions')
    @ApiOperation({
        summary: '利用可能な状態遷移を取得',
        description: '指定された問い合わせの現在の状態から遷移可能な状態一覧を取得します。'
    })
    @ApiParam({
        name: 'id',
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '利用可能な状態遷移を正常に取得しました',
        type: AvailableTransitionsDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された問い合わせが見つかりません'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async getAvailableTransitions(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<AvailableTransitionsDto> {
        this.logger.log(`利用可能な状態遷移取得リクエスト: ID=${id}`);

        // 問い合わせの現在の状態を取得
        const inquiry = await this.inquiriesService.getInquiry(id);
        const currentStatus = inquiry.status;

        // 利用可能な遷移を取得
        const availableTransitions = this.workflowService.getAvailableTransitions(currentStatus);

        // 各遷移のルールを取得
        const transitionRules: Record<InquiryStatus, any> = {};
        availableTransitions.forEach(status => {
            const action = this.workflowService.getStatusChangeAction(status);
            transitionRules[status] = {
                requireComment: action.requireComment || false,
                notificationRequired: action.notificationRequired || false
            };
        });

        const result: AvailableTransitionsDto = {
            currentStatus,
            availableTransitions,
            transitionRules
        };

        this.logger.log(`利用可能な状態遷移取得完了: ID=${id}, 遷移数=${availableTransitions.length}`);
        return result;
    }

    /**
     * 状態統計を取得する
     */
    @Get('statistics')
    @ApiOperation({
        summary: '状態統計を取得',
        description: '問い合わせの状態別統計情報を取得します。'
    })
    @ApiQuery({
        name: 'appId',
        required: false,
        description: '対象アプリケーションID（指定しない場合は全体統計）'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '状態統計を正常に取得しました',
        type: StatusStatisticsDto
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async getStatusStatistics(
        @Query('appId') appId?: string
    ): Promise<StatusStatisticsDto> {
        this.logger.log(`状態統計取得リクエスト: appId=${appId}`);

        const statistics = await this.workflowService.getStatusStatistics(appId);

        this.logger.log(`状態統計取得完了: ${JSON.stringify(statistics)}`);
        return statistics;
    }

    /**
     * 自動状態遷移を実行する（管理者用）
     */
    @Post('auto-transitions')
    @ApiOperation({
        summary: '自動状態遷移を実行',
        description: '定義されたルールに基づいて自動状態遷移を実行します。（管理者専用）'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '自動状態遷移が正常に実行されました'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: '管理者権限が必要です'
    })
    // @UseGuards(JwtAuthGuard, AdminGuard) // 認証・認可実装後に有効化
    // @ApiBearerAuth()
    async executeAutoTransitions(): Promise<{ message: string }> {
        this.logger.log('自動状態遷移実行リクエスト');

        await this.workflowService.checkAutoTransitions();

        this.logger.log('自動状態遷移実行完了');
        return { message: '自動状態遷移が正常に実行されました' };
    }
}