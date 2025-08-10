/**
 * 分析コントローラー
 * 要件: 9.1 (基本統計ダッシュボードの実装)
 */

import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Logger,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AnalyticsService } from '../services/analytics.service';
import { 
  AnalyticsFiltersDto, 
  InquiryStatisticsDto, 
  ResponseTimeAnalyticsDto,
  RealtimeStatsDto,
  StatsPeriodDto,
  UserPerformanceDto,
  TeamPerformanceDto,
  SlaComplianceReportDto,
  TrendAnalysisDto,
  ReportGenerationDto,
  DateRangeDto
} from '../dto/analytics.dto';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * 基本統計情報を取得
   * 要件: 9.1 (問い合わせ件数・対応時間統計の実装)
   */
  @Get('statistics')
  @Roles('admin', 'support', 'viewer')
  @ApiOperation({ 
    summary: '基本統計情報取得',
    description: '問い合わせ件数、対応時間、カテゴリ別・アプリ別統計を取得'
  })
  @ApiResponse({ 
    status: 200, 
    description: '統計情報取得成功',
    type: InquiryStatisticsDto
  })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  @ApiQuery({ name: 'startDate', required: false, description: '開始日 (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: '終了日 (ISO 8601)' })
  @ApiQuery({ name: 'categories', required: false, description: 'カテゴリフィルター (カンマ区切り)' })
  @ApiQuery({ name: 'statuses', required: false, description: 'ステータスフィルター (カンマ区切り)' })
  @ApiQuery({ name: 'priorities', required: false, description: '優先度フィルター (カンマ区切り)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getStatistics(@Query() filters: AnalyticsFiltersDto): Promise<InquiryStatisticsDto> {
    this.logger.log(`統計情報取得: ${JSON.stringify(filters)}`);

    // クエリパラメータの配列変換
    if (filters.categories && typeof filters.categories === 'string') {
      filters.categories = (filters.categories as string).split(',');
    }
    if (filters.statuses && typeof filters.statuses === 'string') {
      filters.statuses = (filters.statuses as string).split(',') as any;
    }
    if (filters.priorities && typeof filters.priorities === 'string') {
      filters.priorities = (filters.priorities as string).split(',') as any;
    }

    return await this.analyticsService.getInquiryStatistics(filters);
  }

  /**
   * 対応時間分析を取得
   * 要件: 9.1 (対応時間統計の実装)
   */
  @Get('response-time')
  @Roles('admin', 'support', 'viewer')
  @ApiOperation({ 
    summary: '対応時間分析取得',
    description: '詳細な対応時間統計、分布、SLA達成率を取得'
  })
  @ApiResponse({ 
    status: 200, 
    description: '対応時間分析取得成功',
    type: ResponseTimeAnalyticsDto
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getResponseTimeAnalytics(@Query() filters: AnalyticsFiltersDto): Promise<ResponseTimeAnalyticsDto> {
    this.logger.log(`対応時間分析取得: ${JSON.stringify(filters)}`);

    // クエリパラメータの配列変換
    if (filters.categories && typeof filters.categories === 'string') {
      filters.categories = (filters.categories as string).split(',');
    }
    if (filters.statuses && typeof filters.statuses === 'string') {
      filters.statuses = (filters.statuses as string).split(',') as any;
    }
    if (filters.priorities && typeof filters.priorities === 'string') {
      filters.priorities = (filters.priorities as string).split(',') as any;
    }

    return await this.analyticsService.getResponseTimeAnalytics(filters);
  }

  /**
   * リアルタイム統計を取得
   * 要件: 9.1 (リアルタイムデータ更新機能)
   */
  @Get('realtime')
  @Roles('admin', 'support', 'viewer')
  @ApiOperation({ 
    summary: 'リアルタイム統計取得',
    description: '現在の問い合わせ状況とリアルタイム統計を取得'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'リアルタイム統計取得成功',
    type: RealtimeStatsDto
  })
  async getRealtimeStats(): Promise<RealtimeStatsDto> {
    this.logger.log('リアルタイム統計取得');
    return await this.analyticsService.getRealtimeStats();
  }

  /**
   * アプリ別統計を取得
   * 要件: 9.1 (アプリ別分析機能)
   */
  @Get('by-app')
  @Roles('admin', 'support', 'viewer')
  @ApiOperation({ 
    summary: 'アプリ別統計取得',
    description: 'アプリケーション別の問い合わせ統計を取得'
  })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'yesterday', 'last7days', 'last30days', 'last90days', 'custom'] })
  @ApiQuery({ name: 'startDate', required: false, description: 'カスタム期間の開始日' })
  @ApiQuery({ name: 'endDate', required: false, description: 'カスタム期間の終了日' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getStatsByApp(@Query() periodDto: StatsPeriodDto): Promise<any> {
    this.logger.log(`アプリ別統計取得: ${JSON.stringify(periodDto)}`);

    const filters = this.buildFiltersFromPeriod(periodDto);
    const stats = await this.analyticsService.getInquiryStatistics(filters);
    
    return {
      period: periodDto.period,
      appBreakdown: stats.appBreakdown,
      totalInquiries: stats.totalInquiries,
      timestamp: new Date()
    };
  }

  /**
   * カテゴリ別統計を取得
   * 要件: 9.1 (カテゴリ別分析機能)
   */
  @Get('by-category')
  @Roles('admin', 'support', 'viewer')
  @ApiOperation({ 
    summary: 'カテゴリ別統計取得',
    description: 'カテゴリ別の問い合わせ統計を取得'
  })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'yesterday', 'last7days', 'last30days', 'last90days', 'custom'] })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getStatsByCategory(
    @Query() periodDto: StatsPeriodDto,
    @Query('appId') appId?: string
  ): Promise<any> {
    this.logger.log(`カテゴリ別統計取得: appId=${appId}, period=${periodDto.period}`);

    const filters = this.buildFiltersFromPeriod(periodDto);
    if (appId) {
      filters.appId = appId;
    }

    const stats = await this.analyticsService.getInquiryStatistics(filters);
    
    return {
      period: periodDto.period,
      appId: appId,
      categoryBreakdown: stats.categoryBreakdown,
      totalInquiries: stats.totalInquiries,
      timestamp: new Date()
    };
  }

  /**
   * 日別トレンドを取得
   * 要件: 9.1 (リアルタイムデータ更新機能)
   */
  @Get('trend')
  @Roles('admin', 'support', 'viewer')
  @ApiOperation({ 
    summary: '日別トレンド取得',
    description: '指定期間の日別問い合わせトレンドを取得'
  })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  @ApiQuery({ name: 'days', required: false, description: '過去何日分のデータを取得するか (デフォルト: 30)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTrend(
    @Query('appId') appId?: string,
    @Query('days') days: number = 30
  ): Promise<any> {
    this.logger.log(`トレンド取得: appId=${appId}, days=${days}`);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const filters: AnalyticsFiltersDto = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };

    if (appId) {
      filters.appId = appId;
    }

    const stats = await this.analyticsService.getInquiryStatistics(filters);
    
    return {
      period: `last${days}days`,
      appId: appId,
      dailyTrend: stats.dailyTrend,
      summary: {
        totalInquiries: stats.totalInquiries,
        averageResponseTimeHours: stats.averageResponseTimeHours,
        averageResolutionTimeHours: stats.averageResolutionTimeHours
      },
      timestamp: new Date()
    };
  }

  /**
   * ダッシュボード用サマリーを取得
   * 要件: 9.1 (基本統計ダッシュボードの実装)
   */
  @Get('dashboard')
  @Roles('admin', 'support', 'viewer')
  @ApiOperation({ 
    summary: 'ダッシュボードサマリー取得',
    description: 'ダッシュボード表示用の統合統計情報を取得'
  })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  async getDashboardSummary(@Query('appId') appId?: string): Promise<any> {
    this.logger.log(`ダッシュボードサマリー取得: appId=${appId}`);

    const filters: AnalyticsFiltersDto = {};
    if (appId) {
      filters.appId = appId;
    }

    const [
      basicStats,
      responseTimeStats,
      realtimeStats
    ] = await Promise.all([
      this.analyticsService.getInquiryStatistics(filters),
      this.analyticsService.getResponseTimeAnalytics(filters),
      this.analyticsService.getRealtimeStats()
    ]);

    return {
      basic: {
        totalInquiries: basicStats.totalInquiries,
        newInquiries: basicStats.newInquiries,
        inProgressInquiries: basicStats.inProgressInquiries,
        resolvedInquiries: basicStats.resolvedInquiries,
        closedInquiries: basicStats.closedInquiries
      },
      performance: {
        averageResponseTimeHours: responseTimeStats.averageFirstResponseTimeHours,
        averageResolutionTimeHours: responseTimeStats.averageResolutionTimeHours,
        slaComplianceRate: responseTimeStats.slaComplianceRate
      },
      realtime: {
        newInquiriesLast24h: realtimeStats.newInquiriesLast24h,
        resolvedInquiriesLast24h: realtimeStats.resolvedInquiriesLast24h,
        pendingInquiries: realtimeStats.pendingInquiries,
        averageResponseTimeLast24h: realtimeStats.averageResponseTimeLast24h
      },
      breakdown: {
        byApp: basicStats.appBreakdown.slice(0, 5), // 上位5アプリ
        byCategory: basicStats.categoryBreakdown.slice(0, 5), // 上位5カテゴリ
        byPriority: basicStats.priorityBreakdown,
        byStatus: basicStats.statusBreakdown
      },
      trend: basicStats.dailyTrend.slice(-7), // 過去7日間
      timestamp: new Date()
    };
  }

  // ===== パフォーマンス分析エンドポイント (要件: 9.2) =====

  /**
   * ユーザーパフォーマンス分析を取得
   * 要件: 9.2 (ユーザー・チーム別パフォーマンス分析)
   */
  @Get('performance/user/:userId')
  @Roles('admin', 'support')
  @ApiOperation({ 
    summary: 'ユーザーパフォーマンス分析取得',
    description: '指定ユーザーの詳細なパフォーマンス分析を取得'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'ユーザーパフォーマンス分析取得成功',
    type: UserPerformanceDto
  })
  @ApiQuery({ name: 'startDate', required: true, description: '分析期間開始日 (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: '分析期間終了日 (ISO 8601)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUserPerformance(
    @Query('userId') userId: string,
    @Query() dateRange: DateRangeDto
  ): Promise<UserPerformanceDto> {
    this.logger.log(`ユーザーパフォーマンス分析取得: userId=${userId}, period=${dateRange.startDate}-${dateRange.endDate}`);
    return await this.analyticsService.getUserPerformance(userId, dateRange);
  }

  /**
   * チームパフォーマンス分析を取得
   * 要件: 9.2 (ユーザー・チーム別パフォーマンス分析)
   */
  @Get('performance/team/:teamId')
  @Roles('admin', 'support')
  @ApiOperation({ 
    summary: 'チームパフォーマンス分析取得',
    description: '指定チームの詳細なパフォーマンス分析を取得'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'チームパフォーマンス分析取得成功',
    type: TeamPerformanceDto
  })
  @ApiQuery({ name: 'startDate', required: true, description: '分析期間開始日 (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: '分析期間終了日 (ISO 8601)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTeamPerformance(
    @Query('teamId') teamId: string,
    @Query() dateRange: DateRangeDto
  ): Promise<TeamPerformanceDto> {
    this.logger.log(`チームパフォーマンス分析取得: teamId=${teamId}, period=${dateRange.startDate}-${dateRange.endDate}`);
    return await this.analyticsService.getTeamPerformance(teamId, dateRange);
  }

  /**
   * SLA達成率監視レポートを取得
   * 要件: 9.2 (SLA達成率監視機能)
   */
  @Get('sla/compliance-report')
  @Roles('admin', 'support', 'viewer')
  @ApiOperation({ 
    summary: 'SLA達成率監視レポート取得',
    description: '詳細なSLA達成率分析と改善提案を取得'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'SLA達成率レポート取得成功',
    type: SlaComplianceReportDto
  })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  @ApiQuery({ name: 'startDate', required: false, description: '開始日 (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: '終了日 (ISO 8601)' })
  @ApiQuery({ name: 'categories', required: false, description: 'カテゴリフィルター (カンマ区切り)' })
  @ApiQuery({ name: 'priorities', required: false, description: '優先度フィルター (カンマ区切り)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSlaComplianceReport(@Query() filters: AnalyticsFiltersDto): Promise<SlaComplianceReportDto> {
    this.logger.log(`SLA達成率レポート取得: ${JSON.stringify(filters)}`);

    // クエリパラメータの配列変換
    if (filters.categories && typeof filters.categories === 'string') {
      filters.categories = (filters.categories as string).split(',');
    }
    if (filters.priorities && typeof filters.priorities === 'string') {
      filters.priorities = (filters.priorities as string).split(',') as any;
    }

    return await this.analyticsService.getSlaComplianceReport(filters);
  }

  /**
   * トレンド分析を取得
   * 要件: 9.2 (トレンド分析とレポート生成機能)
   */
  @Get('trend-analysis/:metric')
  @Roles('admin', 'support', 'viewer')
  @ApiOperation({ 
    summary: 'トレンド分析取得',
    description: '指定メトリックの詳細なトレンド分析、季節パターン、異常値検出、予測を取得'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'トレンド分析取得成功',
    type: TrendAnalysisDto
  })
  @ApiQuery({ name: 'startDate', required: true, description: '分析期間開始日 (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: '分析期間終了日 (ISO 8601)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTrendAnalysis(
    @Query('metric') metric: string,
    @Query() dateRange: DateRangeDto
  ): Promise<TrendAnalysisDto> {
    this.logger.log(`トレンド分析取得: metric=${metric}, period=${dateRange.startDate}-${dateRange.endDate}`);

    // サポートされているメトリックの検証
    const supportedMetrics = ['inquiryCount', 'responseTime', 'slaCompliance', 'customerSatisfaction'];
    if (!supportedMetrics.includes(metric)) {
      throw new Error(`サポートされていないメトリックです: ${metric}. サポート対象: ${supportedMetrics.join(', ')}`);
    }

    return await this.analyticsService.getTrendAnalysis(metric, dateRange);
  }

  /**
   * レポート生成
   * 要件: 9.2 (トレンド分析とレポート生成機能)
   */
  @Get('reports/generate/:reportType')
  @Roles('admin', 'support')
  @ApiOperation({ 
    summary: 'レポート生成',
    description: '指定タイプの詳細レポートを生成'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'レポート生成成功',
    type: ReportGenerationDto
  })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  @ApiQuery({ name: 'startDate', required: false, description: '開始日 (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: '終了日 (ISO 8601)' })
  @ApiQuery({ name: 'categories', required: false, description: 'カテゴリフィルター (カンマ区切り)' })
  @ApiQuery({ name: 'priorities', required: false, description: '優先度フィルター (カンマ区切り)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateReport(
    @Query('reportType') reportType: 'performance' | 'sla' | 'trend' | 'comprehensive',
    @Query() filters: AnalyticsFiltersDto
  ): Promise<ReportGenerationDto> {
    this.logger.log(`レポート生成: type=${reportType}, filters=${JSON.stringify(filters)}`);

    // サポートされているレポートタイプの検証
    const supportedTypes = ['performance', 'sla', 'trend', 'comprehensive'];
    if (!supportedTypes.includes(reportType)) {
      throw new Error(`サポートされていないレポートタイプです: ${reportType}. サポート対象: ${supportedTypes.join(', ')}`);
    }

    // クエリパラメータの配列変換
    if (filters.categories && typeof filters.categories === 'string') {
      filters.categories = (filters.categories as string).split(',');
    }
    if (filters.priorities && typeof filters.priorities === 'string') {
      filters.priorities = (filters.priorities as string).split(',') as any;
    }

    return await this.analyticsService.generateReport(reportType, filters);
  }

  /**
   * パフォーマンス比較分析を取得
   * 要件: 9.2 (ユーザー・チーム別パフォーマンス分析)
   */
  @Get('performance/comparison')
  @Roles('admin', 'support')
  @ApiOperation({ 
    summary: 'パフォーマンス比較分析取得',
    description: 'ユーザー間またはチーム間のパフォーマンス比較分析を取得'
  })
  @ApiQuery({ name: 'userIds', required: false, description: '比較対象ユーザーID (カンマ区切り)' })
  @ApiQuery({ name: 'teamIds', required: false, description: '比較対象チームID (カンマ区切り)' })
  @ApiQuery({ name: 'startDate', required: true, description: '分析期間開始日 (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: '分析期間終了日 (ISO 8601)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getPerformanceComparison(
    @Query('userIds') userIds?: string,
    @Query('teamIds') teamIds?: string,
    @Query() dateRange?: DateRangeDto
  ): Promise<any> {
    this.logger.log(`パフォーマンス比較分析取得: userIds=${userIds}, teamIds=${teamIds}`);

    if (!dateRange) {
      throw new Error('分析期間の指定が必要です');
    }

    const result: any = {
      comparisonType: userIds ? 'user' : 'team',
      period: dateRange,
      timestamp: new Date()
    };

    if (userIds) {
      const userIdList = userIds.split(',');
      const userPerformances = await Promise.all(
        userIdList.map(userId => this.analyticsService.getUserPerformance(userId.trim(), dateRange))
      );

      result.userComparison = {
        users: userPerformances,
        metrics: this.calculateComparisonMetrics(userPerformances, 'user'),
        ranking: this.rankPerformances(userPerformances, 'user')
      };
    }

    if (teamIds) {
      const teamIdList = teamIds.split(',');
      const teamPerformances = await Promise.all(
        teamIdList.map(teamId => this.analyticsService.getTeamPerformance(teamId.trim(), dateRange))
      );

      result.teamComparison = {
        teams: teamPerformances,
        metrics: this.calculateComparisonMetrics(teamPerformances, 'team'),
        ranking: this.rankPerformances(teamPerformances, 'team')
      };
    }

    return result;
  }

  /**
   * SLA違反アラートを取得
   * 要件: 9.2 (SLA達成率監視機能)
   */
  @Get('sla/violations/alerts')
  @Roles('admin', 'support')
  @ApiOperation({ 
    summary: 'SLA違反アラート取得',
    description: '現在のSLA違反状況とアラートを取得'
  })
  @ApiQuery({ name: 'severity', required: false, enum: ['low', 'medium', 'high'], description: '重要度フィルター' })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  async getSlaViolationAlerts(
    @Query('severity') severity?: 'low' | 'medium' | 'high',
    @Query('appId') appId?: string
  ): Promise<any> {
    this.logger.log(`SLA違反アラート取得: severity=${severity}, appId=${appId}`);

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const filters: AnalyticsFiltersDto = {
      startDate: last24h.toISOString(),
      endDate: now.toISOString()
    };

    if (appId) {
      filters.appId = appId;
    }

    const slaReport = await this.analyticsService.getSlaComplianceReport(filters);

    // 違反アラートの生成
    const alerts = [];

    // 全体的なSLA達成率が低い場合
    if (slaReport.overallComplianceRate < 80) {
      alerts.push({
        id: `sla_overall_${Date.now()}`,
        type: 'overall_compliance',
        severity: slaReport.overallComplianceRate < 60 ? 'high' : 'medium',
        title: '全体SLA達成率低下',
        message: `全体のSLA達成率が${slaReport.overallComplianceRate.toFixed(1)}%に低下しています`,
        value: slaReport.overallComplianceRate,
        threshold: 80,
        timestamp: now
      });
    }

    // 優先度別の違反チェック
    slaReport.complianceByPriority.forEach(priority => {
      if (priority.complianceRate < 70) {
        alerts.push({
          id: `sla_priority_${priority.priority}_${Date.now()}`,
          type: 'priority_compliance',
          severity: priority.complianceRate < 50 ? 'high' : 'medium',
          title: `${priority.priority}優先度SLA違反`,
          message: `${priority.priority}優先度の問い合わせでSLA達成率が${priority.complianceRate.toFixed(1)}%に低下`,
          value: priority.complianceRate,
          threshold: 70,
          priority: priority.priority,
          timestamp: now
        });
      }
    });

    // 重要度フィルタリング
    let filteredAlerts = alerts;
    if (severity) {
      filteredAlerts = alerts.filter(alert => alert.severity === severity);
    }

    return {
      alerts: filteredAlerts,
      summary: {
        total: alerts.length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      },
      overallComplianceRate: slaReport.overallComplianceRate,
      timestamp: now
    };
  }

  /**
   * パフォーマンス改善提案を取得
   * 要件: 9.2 (トレンド分析とレポート生成機能)
   */
  @Get('performance/recommendations')
  @Roles('admin', 'support')
  @ApiOperation({ 
    summary: 'パフォーマンス改善提案取得',
    description: '現在のパフォーマンス分析に基づく改善提案を取得'
  })
  @ApiQuery({ name: 'userId', required: false, description: '特定ユーザーの改善提案' })
  @ApiQuery({ name: 'teamId', required: false, description: '特定チームの改善提案' })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  async getPerformanceRecommendations(
    @Query('userId') userId?: string,
    @Query('teamId') teamId?: string,
    @Query('appId') appId?: string
  ): Promise<any> {
    this.logger.log(`パフォーマンス改善提案取得: userId=${userId}, teamId=${teamId}, appId=${appId}`);

    const now = new Date();
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateRange: DateRangeDto = {
      startDate: last30days.toISOString(),
      endDate: now.toISOString()
    };

    const recommendations = [];

    if (userId) {
      // ユーザー固有の改善提案
      const userPerformance = await this.analyticsService.getUserPerformance(userId, dateRange);
      
      if (userPerformance.slaComplianceRate < 80) {
        recommendations.push({
          category: 'SLA改善',
          title: 'SLA達成率向上',
          description: `現在のSLA達成率${userPerformance.slaComplianceRate.toFixed(1)}%を改善する必要があります`,
          priority: 'high',
          actionItems: [
            'よく使用するテンプレートの整備',
            '問い合わせカテゴリ別の対応手順の確認',
            '優先度の高い問い合わせの優先処理'
          ],
          estimatedImpact: '15-20%のSLA達成率向上'
        });
      }

      if (userPerformance.averageResponseTimeHours > 8) {
        recommendations.push({
          category: '対応時間短縮',
          title: '初回対応時間の短縮',
          description: `平均対応時間${userPerformance.averageResponseTimeHours.toFixed(1)}時間を短縮できます`,
          priority: 'medium',
          actionItems: [
            'FAQ活用による迅速な回答',
            '自動返信テンプレートの活用',
            '問い合わせトリアージの改善'
          ],
          estimatedImpact: '2-4時間の対応時間短縮'
        });
      }
    }

    if (teamId) {
      // チーム固有の改善提案
      const teamPerformance = await this.analyticsService.getTeamPerformance(teamId, dateRange);
      
      // ワークロードバランスの改善提案
      const imbalancedMembers = teamPerformance.workloadBalance.filter(member => 
        member.workloadRatio > 1.5 || member.workloadRatio < 0.5
      );

      if (imbalancedMembers.length > 0) {
        recommendations.push({
          category: 'ワークロード最適化',
          title: 'チーム内ワークロードバランス改善',
          description: 'チーム内でワークロードの偏りが発生しています',
          priority: 'medium',
          actionItems: [
            '問い合わせ自動振り分けルールの見直し',
            'メンバー間のスキル共有セッション実施',
            '負荷分散アルゴリズムの調整'
          ],
          estimatedImpact: '10-15%の効率性向上'
        });
      }
    }

    // 全体的な改善提案
    const filters: AnalyticsFiltersDto = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    };
    if (appId) filters.appId = appId;

    const slaReport = await this.analyticsService.getSlaComplianceReport(filters);
    
    if (slaReport.overallComplianceRate < 85) {
      recommendations.push({
        category: 'システム改善',
        title: '全体的なSLA達成率向上',
        description: '組織全体でのSLA達成率向上が必要です',
        priority: 'high',
        actionItems: [
          'FAQ自動生成機能の活用',
          'AI支援回答システムの導入検討',
          'エスカレーション手順の最適化',
          'スタッフトレーニングプログラムの強化'
        ],
        estimatedImpact: '20-30%のSLA達成率向上'
      });
    }

    return {
      recommendations,
      summary: {
        total: recommendations.length,
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length
      },
      analysisContext: {
        userId,
        teamId,
        appId,
        period: dateRange
      },
      timestamp: now
    };
  }

  /**
   * 期間指定からフィルターを構築
   */
  private buildFiltersFromPeriod(periodDto: StatsPeriodDto): AnalyticsFiltersDto {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (periodDto.period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (periodDto.customRange) {
          startDate = new Date(periodDto.customRange.startDate);
          endDate = new Date(periodDto.customRange.endDate);
        } else {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  /**
   * 比較メトリクスを計算
   */
  private calculateComparisonMetrics(performances: any[], type: 'user' | 'team'): any {
    if (performances.length === 0) return {};

    const metrics = {
      averageResponseTime: performances.reduce((sum, p) => sum + p.averageResponseTimeHours, 0) / performances.length,
      averageSlaCompliance: performances.reduce((sum, p) => sum + p.slaComplianceRate, 0) / performances.length,
      totalInquiriesHandled: performances.reduce((sum, p) => sum + p.totalInquiriesHandled, 0),
      bestPerformer: performances.reduce((best, current) => 
        current.slaComplianceRate > best.slaComplianceRate ? current : best
      ),
      worstPerformer: performances.reduce((worst, current) => 
        current.slaComplianceRate < worst.slaComplianceRate ? current : worst
      )
    };

    return metrics;
  }

  /**
   * パフォーマンスランキングを作成
   */
  private rankPerformances(performances: any[], type: 'user' | 'team'): any[] {
    return performances
      .map((performance, index) => ({
        ...performance,
        rank: index + 1,
        score: this.calculatePerformanceScore(performance)
      }))
      .sort((a, b) => b.score - a.score)
      .map((performance, index) => ({
        ...performance,
        rank: index + 1
      }));
  }

  /**
   * パフォーマンススコアを計算
   */
  private calculatePerformanceScore(performance: any): number {
    // SLA達成率 (40%), 対応時間 (30%), 解決率 (20%), 顧客満足度 (10%)
    const slaScore = performance.slaComplianceRate || 0;
    const responseTimeScore = Math.max(0, 100 - (performance.averageResponseTimeHours || 0) * 5);
    const resolutionScore = performance.totalInquiriesHandled > 0 
      ? (performance.resolvedInquiries / performance.totalInquiriesHandled) * 100 
      : 0;
    const satisfactionScore = (performance.customerSatisfactionScore || 3) * 20; // 5点満点を100点満点に変換

    return (slaScore * 0.4) + (responseTimeScore * 0.3) + (resolutionScore * 0.2) + (satisfactionScore * 0.1);
  }
}