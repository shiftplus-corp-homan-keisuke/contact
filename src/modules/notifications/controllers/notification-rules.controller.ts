import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser } from '../../../common/decorators';
import { User } from '../../users/entities';
import { NotificationRuleEngineService } from '../services';
import { NotificationTrigger, NotificationContext } from '../types';
import { ApiResponseDto } from '../../../common/dto';

@ApiTags('notification-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification-rules')
export class NotificationRulesController {
    constructor(
        private ruleEngineService: NotificationRuleEngineService,
    ) { }

    @Post('execute')
    @ApiOperation({ summary: '通知ルールの手動実行' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '通知ルールが正常に実行されました',
        type: ApiResponseDto,
    })
    async executeRules(
        @Body() request: {
            trigger: NotificationTrigger;
            context: NotificationContext;
        },
        @CurrentUser() user: User,
    ): Promise<ApiResponseDto<void>> {
        await this.ruleEngineService.executeRules(
            request.trigger,
            request.context,
            user.id,
        );

        return {
            success: true,
            message: '通知ルールを実行しました',
        };
    }

    @Post('test')
    @ApiOperation({ summary: '通知ルールのテスト実行' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '通知ルールのテストが正常に実行されました',
        type: ApiResponseDto,
    })
    async testRule(
        @Body() request: {
            ruleId: string;
            context: NotificationContext;
        },
        @CurrentUser() user: User,
    ): Promise<ApiResponseDto<void>> {
        // テスト実行のロジック（実際の通知は送信しない）
        // TODO: テスト専用のメソッドを実装

        return {
            success: true,
            message: '通知ルールのテストを実行しました',
        };
    }

    @Delete('delayed/:delayId')
    @ApiOperation({ summary: '遅延通知のキャンセル' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '遅延通知が正常にキャンセルされました',
        type: ApiResponseDto,
    })
    async cancelDelayedNotification(
        @Param('delayId') delayId: string,
    ): Promise<ApiResponseDto<{ cancelled: boolean }>> {
        const cancelled = this.ruleEngineService.cancelDelayedNotification(delayId);

        return {
            success: true,
            data: { cancelled },
            message: cancelled ? '遅延通知をキャンセルしました' : '指定された遅延通知が見つかりませんでした',
        };
    }

    @Get('stats')
    @ApiOperation({ summary: 'ルールエンジンの統計情報取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'ルールエンジンの統計情報を取得しました',
        type: ApiResponseDto,
    })
    async getEngineStats(): Promise<ApiResponseDto<{
        activeRules: number;
        delayedNotifications: number;
        lastExecution?: Date;
    }>> {
        const stats = this.ruleEngineService.getEngineStats();

        return {
            success: true,
            data: stats,
            message: 'ルールエンジンの統計情報を取得しました',
        };
    }
}