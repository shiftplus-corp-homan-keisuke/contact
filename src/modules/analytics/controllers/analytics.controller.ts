import {
    Controller,
    Get,
    Query,
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
    ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../users/guards/roles.guard';
import { Roles } from '../../users/decorators/roles.decorator';
import { AnalyticsService } from '../services/analytics.service';
import {
    AnalyticsFiltersDto,
    DashboardQueryDto,
    DashboardResponseDto,
    InquiryStatisticsResponseDto,
    PeriodDto
} from '../dto/analytics.dto';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';

/**
 * 分析機能コントローラー
 * ダッシュボードと統計情報のAPIエンドポイントを提供
 */
@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
    private readonly logger = new Logger(AnalyticsController.name);

    constructor(private readonly analyticsService: AnalyticsService) { }

    /**
     * ダッシュボードデータを取得
     */
    @Get('dashboard')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: 'ダッシュボードデータ取得',
        description: '統計情報、応答時間分析、トレンドデータを含むダッシュボードデータを取得'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'ダッシュボードデータ取得成功',
        type: DashboardResponseDto,
    })
    @ApiQuery({ name: 'startDate', required: false, description: '開始日 (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: '終了日 (YYYY-MM-DD)' })
    @ApiQuery({ name: 'appIds', required: false, description: 'アプリケーションID配列', type: [String] })
    @ApiQuery({ name: 'categories', required: false, description: 'カテゴリ配列', type: [String] })
    @ApiQuery({ name: 'realtime', required: false, description: 'リアルタイム更新', type: Boolean })
    @HttpCode(HttpStatus.OK)
    async getDashboard(@Query() query: DashboardQueryDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('ダッシュボードデータ取得リクエスト', { query });

        try {
            const filters = {
                startDate: query.startDate ? new Date(query.startDate) : undefined,
                endDate: query.endDate ? new Date(query.endDate) : undefined,
                appIds: query.appIds,
                categories: query.categories,
                statuses: query.statuses,
                priorities: query.priorities,
                assignedTo: query.assignedTo,
            };

            const dashboardData = await this.analyticsService.getDashboardData(filters);

            const response = {
                ...dashboardData,
                lastUpdated: new Date(),
            };

            this.logger.log('ダッシュボードデータ取得成功');
            return {
                success: true,
                data: response,
                message: 'ダッシュボードデータを取得しました',
            };
        } catch (error) {
            this.logger.error('ダッシュボードデータ取得エラー', error);
            throw error;
        }
    }

    /**
     * 基本統計情報を取得
     */
    @Get('statistics')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: '基本統計情報取得',
        description: '問い合わせ件数、ステータス別統計、カテゴリ別統計などの基本統計情報を取得'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '統計情報取得成功',
        type: InquiryStatisticsResponseDto,
    })
    @HttpCode(HttpStatus.OK)
    async getStatistics(@Query() filters: AnalyticsFiltersDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('統計情報取得リクエスト', { filters });

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

            const statistics = await this.analyticsService.getInquiryStatistics(analyticsFilters);

            this.logger.log('統計情報取得成功', { totalInquiries: statistics.totalInquiries });
            return {
                success: true,
                data: statistics,
                message: '統計情報を取得しました',
            };
        } catch (error) {
            this.logger.error('統計情報取得エラー', error);
            throw error;
        }
    }

    /**
     * 応答時間分析を取得
     */
    @Get('response-time')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: '応答時間分析取得',
        description: '平均応答時間、中央値、時間別・日別・カテゴリ別の応答時間分析を取得'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '応答時間分析取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getResponseTimeAnalytics(@Query() filters: AnalyticsFiltersDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('応答時間分析取得リクエスト', { filters });

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

            const responseTimeAnalytics = await this.analyticsService.getResponseTimeAnalytics(analyticsFilters);

            this.logger.log('応答時間分析取得成功');
            return {
                success: true,
                data: responseTimeAnalytics,
                message: '応答時間分析を取得しました',
            };
        } catch (error) {
            this.logger.error('応答時間分析取得エラー', error);
            throw error;
        }
    }

    /**
     * 期間別統計を取得
     */
    @Get('period-statistics')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: '期間別統計取得',
        description: '指定期間の統計情報を取得（今日、昨日、過去7日間、過去30日間など）'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '期間別統計取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getPeriodStatistics(@Query() periodDto: PeriodDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('期間別統計取得リクエスト', { period: periodDto.period });

        try {
            const { startDate, endDate } = this.calculatePeriodDates(periodDto);

            const filters = {
                startDate,
                endDate,
            };

            const statistics = await this.analyticsService.getInquiryStatistics(filters);

            this.logger.log('期間別統計取得成功', {
                period: periodDto.period,
                totalInquiries: statistics.totalInquiries
            });

            return {
                success: true,
                data: {
                    period: periodDto.period,
                    startDate,
                    endDate,
                    statistics,
                },
                message: `${periodDto.period}の統計情報を取得しました`,
            };
        } catch (error) {
            this.logger.error('期間別統計取得エラー', error);
            throw error;
        }
    }

    /**
     * カテゴリ別詳細統計を取得
     */
    @Get('category-breakdown')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: 'カテゴリ別詳細統計取得',
        description: 'カテゴリごとの詳細な統計情報と応答時間分析を取得'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'カテゴリ別統計取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getCategoryBreakdown(@Query() filters: AnalyticsFiltersDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('カテゴリ別統計取得リクエスト', { filters });

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

            const statistics = await this.analyticsService.getInquiryStatistics(analyticsFilters);

            this.logger.log('カテゴリ別統計取得成功');
            return {
                success: true,
                data: {
                    categoryBreakdown: statistics.categoryBreakdown,
                    totalInquiries: statistics.totalInquiries,
                },
                message: 'カテゴリ別統計を取得しました',
            };
        } catch (error) {
            this.logger.error('カテゴリ別統計取得エラー', error);
            throw error;
        }
    }

    /**
     * アプリ別詳細統計を取得
     */
    @Get('app-breakdown')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: 'アプリ別詳細統計取得',
        description: 'アプリケーションごとの詳細な統計情報と応答時間分析を取得'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'アプリ別統計取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getAppBreakdown(@Query() filters: AnalyticsFiltersDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('アプリ別統計取得リクエスト', { filters });

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

            const statistics = await this.analyticsService.getInquiryStatistics(analyticsFilters);

            this.logger.log('アプリ別統計取得成功');
            return {
                success: true,
                data: {
                    appBreakdown: statistics.appBreakdown,
                    totalInquiries: statistics.totalInquiries,
                },
                message: 'アプリ別統計を取得しました',
            };
        } catch (error) {
            this.logger.error('アプリ別統計取得エラー', error);
            throw error;
        }
    }

    /**
     * 期間の開始日と終了日を計算
     */
    private calculatePeriodDates(periodDto: PeriodDto): { startDate: Date; endDate: Date } {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (periodDto.period) {
            case 'today':
                return {
                    startDate: today,
                    endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
                };

            case 'yesterday':
                const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                return {
                    startDate: yesterday,
                    endDate: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
                };

            case 'last_7_days':
                return {
                    startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
                    endDate: now,
                };

            case 'last_30_days':
                return {
                    startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
                    endDate: now,
                };

            case 'this_month':
                return {
                    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                    endDate: now,
                };

            case 'last_month':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                return {
                    startDate: lastMonth,
                    endDate: lastMonthEnd,
                };

            case 'custom':
                if (!periodDto.startDate || !periodDto.endDate) {
                    throw new Error('カスタム期間の場合、開始日と終了日が必要です');
                }
                return {
                    startDate: new Date(periodDto.startDate),
                    endDate: new Date(periodDto.endDate),
                };

            default:
                throw new Error(`サポートされていない期間タイプ: ${periodDto.period}`);
        }
    }
}