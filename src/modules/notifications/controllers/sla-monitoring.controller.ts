import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../users/guards/roles.guard';
import { Roles } from '../../users/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { SlaMonitoringService } from '../services/sla-monitoring.service';
import { CreateSlaConfigDto, UpdateSlaConfigDto, SlaViolationStatsDto } from '../dto/sla-monitoring.dto';
import { User } from '../../users/entities/user.entity';

/**
 * SLA監視コントローラー
 * SLA設定と違反監視のAPI
 */
@ApiTags('SLA監視')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sla-monitoring')
export class SlaMonitoringController {
    constructor(private readonly slaMonitoringService: SlaMonitoringService) { }

    /**
     * SLA設定を作成
     */
    @Post('configs')
    @Roles('admin', 'supervisor')
    @ApiOperation({ summary: 'SLA設定を作成' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'SLA設定が正常に作成されました',
    })
    async createSlaConfig(@Body() createDto: CreateSlaConfigDto): Promise<ApiResponseDto> {
        const config = await this.slaMonitoringService.createSlaConfig(createDto);

        return {
            success: true,
            message: 'SLA設定を作成しました',
            data: config,
        };
    }

    /**
     * SLA設定を更新
     */
    @Put('configs/:id')
    @Roles('admin', 'supervisor')
    @ApiOperation({ summary: 'SLA設定を更新' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'SLA設定が正常に更新されました',
    })
    async updateSlaConfig(
        @Param('id') id: string,
        @Body() updateDto: UpdateSlaConfigDto,
    ): Promise<ApiResponseDto> {
        const config = await this.slaMonitoringService.updateSlaConfig(id, updateDto);

        return {
            success: true,
            message: 'SLA設定を更新しました',
            data: config,
        };
    }

    /**
     * アプリケーション別SLA設定を取得
     */
    @Get('configs/app/:appId')
    @Roles('admin', 'supervisor', 'support')
    @ApiOperation({ summary: 'アプリケーション別SLA設定を取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'SLA設定を正常に取得しました',
    })
    async getSlaConfigsByApp(@Param('appId') appId: string): Promise<ApiResponseDto> {
        const configs = await this.slaMonitoringService.getSlaConfigsByApp(appId);

        return {
            success: true,
            data: configs,
        };
    }

    /**
     * SLA違反統計を取得
     */
    @Get('violations/stats')
    @Roles('admin', 'supervisor', 'support')
    @ApiOperation({ summary: 'SLA違反統計を取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'SLA違反統計を正常に取得しました',
    })
    async getSlaViolationStats(@Query() query: SlaViolationStatsDto): Promise<ApiResponseDto> {
        const stats = await this.slaMonitoringService.getSlaViolationStats(
            query.appId,
            query.startDate ? new Date(query.startDate) : undefined,
            query.endDate ? new Date(query.endDate) : undefined,
        );

        return {
            success: true,
            data: stats,
        };
    }

    /**
     * SLA違反を手動チェック
     */
    @Post('violations/check')
    @Roles('admin', 'supervisor')
    @ApiOperation({ summary: 'SLA違反を手動チェック' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'SLA違反チェックが完了しました',
    })
    async checkSlaViolations(): Promise<ApiResponseDto> {
        const violations = await this.slaMonitoringService.checkSlaViolations();

        return {
            success: true,
            message: `${violations.length}件のSLA違反を検出しました`,
            data: violations,
        };
    }

    /**
     * SLA違反を解決
     */
    @Put('violations/:id/resolve')
    @Roles('admin', 'supervisor', 'support')
    @ApiOperation({ summary: 'SLA違反を解決' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'SLA違反が正常に解決されました',
    })
    async resolveSlaViolation(
        @Param('id') violationId: string,
        @Body('comment') comment: string,
        @CurrentUser() user: User,
    ): Promise<ApiResponseDto> {
        const violation = await this.slaMonitoringService.resolveSlaViolation(
            violationId,
            user.id,
            comment,
        );

        return {
            success: true,
            message: 'SLA違反を解決しました',
            data: violation,
        };
    }
}