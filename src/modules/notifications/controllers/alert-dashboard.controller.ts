import {
    Controller,
    Get,
    Query,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../users/guards/roles.guard';
import { Roles } from '../../users/decorators/roles.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { AlertDashboardService } from '../services/alert-dashboard.service';
import { DashboardQueryDto } from '../dto/alert-dashboard.dto';

/**
 * アラートダッシュボードコントローラー
 * SLA監視とエスカレーションの統合ダッシュボードAPI
 */
@ApiTags('アラートダッシュボード')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alert-dashboard')
export class AlertDashboardController {
    constructor(private readonly alertDashboardService: AlertDashboardService) { }

    /**
     * ダッシュボード概要データを取得
     */
    @Get('overview')
    @Roles('admin', 'supervisor', 'support')
    @ApiOperation({ summary: 'ダッシュボード概要データを取得' })
    @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'ダッシュボード概要データを正常に取得しました',
    })
    async getDashboardOverview(@Query() query: DashboardQueryDto): Promise<ApiResponseDto> {
        const overview = await this.alertDashboardService.getDashboardOverview(query.appId);

        return {
            success: true,
            data: overview,
        };
    }

    /**
     * SLA違反トレンドデータを取得
     */
    @Get('sla-trends')
    @Roles('admin', 'supervisor', 'support')
    @ApiOperation({ summary: 'SLA違反トレンドデータを取得' })
    @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
    @ApiQuery({ name: 'days', required: false, description: '取得日数', type: Number })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'SLA違反トレンドデータを正常に取得しました',
    })
    async getSlaViolationTrends(@Query() query: DashboardQueryDto): Promise<ApiResponseDto> {
        const trends = await this.alertDashboardService.getSlaViolationTrends(
            query.days || 30,
            query.appId,
        );

        return {
            success: true,
            data: trends,
        };
    }

    /**
     * エスカレーション分析データを取得
     */
    @Get('escalation-analysis')
    @Roles('admin', 'supervisor')
    @ApiOperation({ summary: 'エスカレーション分析データを取得' })
    @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
    @ApiQuery({ name: 'days', required: false, description: '取得日数', type: Number })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'エスカレーション分析データを正常に取得しました',
    })
    async getEscalationAnalysis(@Query() query: DashboardQueryDto): Promise<ApiResponseDto> {
        const analysis = await this.alertDashboardService.getEscalationAnalysis(
            query.days || 30,
            query.appId,
        );

        return {
            success: true,
            data: analysis,
        };
    }

    /**
     * 通知効果分析を取得
     */
    @Get('notification-effectiveness')
    @Roles('admin', 'supervisor')
    @ApiOperation({ summary: '通知効果分析を取得' })
    @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
    @ApiQuery({ name: 'days', required: false, description: '取得日数', type: Number })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '通知効果分析を正常に取得しました',
    })
    async getNotificationEffectiveness(@Query() query: DashboardQueryDto): Promise<ApiResponseDto> {
        const effectiveness = await this.alertDashboardService.getNotificationEffectiveness(
            query.days || 30,
            query.appId,
        );

        return {
            success: true,
            data: effectiveness,
        };
    }

    /**
     * リアルタイムアラートを取得
     */
    @Get('real-time-alerts')
    @Roles('admin', 'supervisor', 'support')
    @ApiOperation({ summary: 'リアルタイムアラートを取得' })
    @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'リアルタイムアラートを正常に取得しました',
    })
    async getRealTimeAlerts(@Query() query: DashboardQueryDto): Promise<ApiResponseDto> {
        const alerts = await this.alertDashboardService.getRealTimeAlerts(query.appId);

        return {
            success: true,
            data: alerts,
        };
    }
}