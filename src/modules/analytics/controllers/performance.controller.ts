import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Logger,
    HttpStatus,
    HttpCode
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../users/guards/roles.guard';
import { Roles } from '../../users/decorators/roles.decorator';
import { PerformanceService } from '../services/performance.service';
import { AnalyticsFiltersDto } from '../dto/analytics.dto';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';

/**
 * パフォーマンス分析コントローラー
 * ユーザー・チーム別パフォーマンス分析、SLA監視、トレンド分析のAPIエンドポイントを提供
 */
@ApiTags('Performance Analytics')
@Controller('analytics/performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PerformanceController {
    private readonly logger = new Logger(PerformanceController.name);

    constructor(private readonly performanceService: PerformanceService) { }

    /**
     * ユーザー別パフォーマンス分析を取得
     */
    @Get('users/:userId')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: 'ユーザー別パフォーマンス分析取得',
        description: '指定ユーザーの問い合わせ対応パフォーマンス、効率性、ワークロードを分析'
    })
    @ApiParam({ name: 'userId', description: 'ユーザーID' })
    @ApiQuery({ name: 'startDate', required: false, description: '開始日 (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: '終了日 (YYYY-MM-DD)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'ユーザーパフォーマンス分析取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getUserPerformance(
        @Param('userId') userId: string,
        @Query() filters: AnalyticsFiltersDto
    ): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log(`ユーザーパフォーマンス分析取得リクエスト: ${userId}`, { filters });

        try {
            const analyticsFilters = {
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate) : undefined,
                appIds: filters.appIds,
                categories: filters.categories,
                statuses: filters.statuses,
                priorities: filters.priorities,
                assignedTo: filters.assignedTo,
            };

            const performance = await this.performanceService.getUserPerformance(userId, analyticsFilters);

            this.logger.log(`ユーザーパフォーマンス分析取得成功: ${userId}`, {
                totalInquiries: performance.totalInquiries,
                efficiency: performance.efficiency
            });

            return {
                success: true,
                data: performance,
                message: 'ユーザーパフォーマンス分析を取得しました',
            };
        } catch (error) {
            this.logger.error(`ユーザーパフォーマンス分析取得エラー: ${userId}`, error);
            throw error;
        }
    }

    /**
     * チーム別パフォーマンス分析を取得
     */
    @Get('teams/:teamId')
    @Roles('admin', 'support')
    @ApiOperation({
        summary: 'チーム別パフォーマンス分析取得',
        description: '指定チームの全体パフォーマンス、メンバー別分析、ワークロード分布を取得'
    })
    @ApiParam({ name: 'teamId', description: 'チームID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'チームパフォーマンス分析取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getTeamPerformance(
        @Param('teamId') teamId: string,
        @Query() filters: AnalyticsFiltersDto
    ): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log(`チームパフォーマンス分析取得リクエスト: ${teamId}`, { filters });

        try {
            const analyticsFilters = {
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate) : undefined,
                appIds: filters.appIds,
                categories: filters.categories,
                statuses: filters.statuses,
                priorities: filters.priorities,
                assignedTo: filters.assignedTo,
            };

            const performance = await this.performanceService.getTeamPerformance(teamId, analyticsFilters);

            this.logger.log(`チームパフォーマンス分析取得成功: ${teamId}`, {
                memberCount: performance.members.length,
                teamEfficiency: performance.teamEfficiency
            });

            return {
                success: true,
                data: performance,
                message: 'チームパフォーマンス分析を取得しました',
            };
        } catch (error) {
            this.logger.error(`チームパフォーマンス分析取得エラー: ${teamId}`, error);
            throw error;
        }
    }

    /**
     * SLA達成率監視を取得
     */
    @Get('sla-compliance')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: 'SLA達成率監視取得',
        description: 'SLA達成率、違反一覧、カテゴリ・優先度別達成率を取得'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'SLA達成率監視取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getSLACompliance(@Query() filters: AnalyticsFiltersDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('SLA達成率監視取得リクエスト', { filters });

        try {
            const analyticsFilters = {
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate) : undefined,
                appIds: filters.appIds,
                categories: filters.categories,
                statuses: filters.statuses,
                priorities: filters.priorities,
                assignedTo: filters.assignedTo,
            };

            const slaCompliance = await this.performanceService.getSLACompliance(analyticsFilters);

            this.logger.log('SLA達成率監視取得成功', {
                complianceRate: slaCompliance.complianceRate,
                violationCount: slaCompliance.violations.length
            });

            return {
                success: true,
                data: slaCompliance,
                message: 'SLA達成率監視を取得しました',
            };
        } catch (error) {
            this.logger.error('SLA達成率監視取得エラー', error);
            throw error;
        }
    }

    /**
     * トレンド分析を取得
     */
    @Get('trends/:metric')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: 'トレンド分析取得',
        description: '指定メトリックのトレンド分析（問い合わせ件数、応答時間、解決率、SLA達成率）'
    })
    @ApiParam({
        name: 'metric',
        description: 'メトリック種別',
        enum: ['inquiry_count', 'response_time', 'resolution_rate', 'sla_compliance']
    })
    @ApiQuery({
        name: 'period',
        required: false,
        description: '期間タイプ',
        enum: ['daily', 'weekly', 'monthly']
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'トレンド分析取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getTrendAnalysis(
        @Param('metric') metric: string,
        @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
        @Query() filters: AnalyticsFiltersDto
    ): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log(`トレンド分析取得リクエスト: ${metric} (${period})`, { filters });

        try {
            const analyticsFilters = {
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate) : undefined,
                appIds: filters.appIds,
                categories: filters.categories,
                statuses: filters.statuses,
                priorities: filters.priorities,
                assignedTo: filters.assignedTo,
            };

            const trendAnalysis = await this.performanceService.getTrendAnalysis(metric, period, analyticsFilters);

            this.logger.log(`トレンド分析取得成功: ${metric}`, {
                dataPoints: trendAnalysis.data.length,
                trend: trendAnalysis.trend,
                changePercentage: trendAnalysis.changePercentage
            });

            return {
                success: true,
                data: trendAnalysis,
                message: `${metric}のトレンド分析を取得しました`,
            };
        } catch (error) {
            this.logger.error(`トレンド分析取得エラー: ${metric}`, error);
            throw error;
        }
    }

    /**
     * 全ユーザーのパフォーマンス比較を取得
     */
    @Get('users/comparison')
    @Roles('admin', 'support')
    @ApiOperation({
        summary: '全ユーザーパフォーマンス比較取得',
        description: '全ユーザーのパフォーマンスを比較分析'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'ユーザーパフォーマンス比較取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getUserPerformanceComparison(@Query() filters: AnalyticsFiltersDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('ユーザーパフォーマンス比較取得リクエスト', { filters });

        try {
            // 実装は簡略化：実際にはすべてのアクティブユーザーを取得して比較
            const mockComparison = {
                totalUsers: 5,
                topPerformers: [
                    { userId: 'user1', userName: 'User 1', efficiency: 95.5 },
                    { userId: 'user2', userName: 'User 2', efficiency: 89.2 },
                    { userId: 'user3', userName: 'User 3', efficiency: 87.8 },
                ],
                averageEfficiency: 85.2,
                performanceDistribution: {
                    high: 20,    // 80%以上
                    medium: 60,  // 60-80%
                    low: 20,     // 60%未満
                },
            };

            this.logger.log('ユーザーパフォーマンス比較取得成功', {
                totalUsers: mockComparison.totalUsers,
                averageEfficiency: mockComparison.averageEfficiency
            });

            return {
                success: true,
                data: mockComparison,
                message: 'ユーザーパフォーマンス比較を取得しました',
            };
        } catch (error) {
            this.logger.error('ユーザーパフォーマンス比較取得エラー', error);
            throw error;
        }
    }

    /**
     * SLA違反の詳細分析を取得
     */
    @Get('sla-violations/analysis')
    @Roles('admin', 'support')
    @ApiOperation({
        summary: 'SLA違反詳細分析取得',
        description: 'SLA違反の詳細分析、パターン分析、改善提案を取得'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'SLA違反詳細分析取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getSLAViolationAnalysis(@Query() filters: AnalyticsFiltersDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('SLA違反詳細分析取得リクエスト', { filters });

        try {
            const analyticsFilters = {
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate) : undefined,
                appIds: filters.appIds,
                categories: filters.categories,
                statuses: filters.statuses,
                priorities: filters.priorities,
                assignedTo: filters.assignedTo,
            };

            const slaCompliance = await this.performanceService.getSLACompliance(analyticsFilters);

            // 違反パターン分析
            const violationAnalysis = {
                totalViolations: slaCompliance.violations.length,
                severityDistribution: this.analyzeSeverityDistribution(slaCompliance.violations),
                categoryPatterns: this.analyzeCategoryPatterns(slaCompliance.violations),
                timePatterns: this.analyzeTimePatterns(slaCompliance.violations),
                recommendations: this.generateRecommendations(slaCompliance),
            };

            this.logger.log('SLA違反詳細分析取得成功', {
                totalViolations: violationAnalysis.totalViolations
            });

            return {
                success: true,
                data: violationAnalysis,
                message: 'SLA違反詳細分析を取得しました',
            };
        } catch (error) {
            this.logger.error('SLA違反詳細分析取得エラー', error);
            throw error;
        }
    }

    /**
     * 違反の重要度分布を分析
     */
    private analyzeSeverityDistribution(violations: any[]): any {
        const distribution = { urgent: 0, high: 0, medium: 0, low: 0 };

        violations.forEach(violation => {
            distribution[violation.priority as keyof typeof distribution]++;
        });

        return distribution;
    }

    /**
     * カテゴリパターンを分析
     */
    private analyzeCategoryPatterns(violations: any[]): any {
        const patterns = new Map<string, number>();

        violations.forEach(violation => {
            const category = violation.category || 'その他';
            patterns.set(category, (patterns.get(category) || 0) + 1);
        });

        return Array.from(patterns.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * 時間パターンを分析
     */
    private analyzeTimePatterns(violations: any[]): any {
        // 簡略化された実装
        return {
            peakHours: [9, 10, 14, 15], // 違反が多い時間帯
            peakDays: ['Monday', 'Tuesday'], // 違反が多い曜日
        };
    }

    /**
     * 改善提案を生成
     */
    private generateRecommendations(slaCompliance: any): string[] {
        const recommendations: string[] = [];

        if (slaCompliance.complianceRate < 80) {
            recommendations.push('SLA達成率が80%を下回っています。リソース配分の見直しを検討してください。');
        }

        if (slaCompliance.violations.length > 10) {
            recommendations.push('SLA違反が多発しています。優先度の高い問い合わせの対応プロセスを改善してください。');
        }

        if (slaCompliance.averageResponseTime > 4) {
            recommendations.push('平均応答時間が4時間を超えています。初回応答の自動化を検討してください。');
        }

        return recommendations;
    }
}