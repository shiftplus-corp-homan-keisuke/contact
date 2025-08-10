/**
 * 分析機能用DTO
 * 要件: 9.1 (基本統計ダッシュボードの実装)
 */

import { IsOptional, IsString, IsDateString, IsArray, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { InquiryStatus, InquiryPriority } from '../types/inquiry.types';

/**
 * 分析フィルター用DTO
 */
export class AnalyticsFiltersDto {
  @IsOptional()
  @IsString()
  appId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(InquiryStatus, { each: true })
  statuses?: InquiryStatus[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(InquiryPriority, { each: true })
  priorities?: InquiryPriority[];
}

/**
 * 基本統計情報レスポンス
 */
export class InquiryStatisticsDto {
  totalInquiries: number;
  newInquiries: number;
  inProgressInquiries: number;
  resolvedInquiries: number;
  closedInquiries: number;
  averageResponseTimeHours: number;
  averageResolutionTimeHours: number;
  categoryBreakdown: CategoryStatsDto[];
  appBreakdown: AppStatsDto[];
  priorityBreakdown: PriorityStatsDto[];
  statusBreakdown: StatusStatsDto[];
  dailyTrend: DailyTrendDto[];
}

/**
 * カテゴリ別統計
 */
export class CategoryStatsDto {
  category: string;
  count: number;
  percentage: number;
  averageResponseTimeHours: number;
}

/**
 * アプリ別統計
 */
export class AppStatsDto {
  appId: string;
  appName: string;
  count: number;
  percentage: number;
  averageResponseTimeHours: number;
  newCount: number;
  resolvedCount: number;
}

/**
 * 優先度別統計
 */
export class PriorityStatsDto {
  priority: InquiryPriority;
  count: number;
  percentage: number;
  averageResponseTimeHours: number;
}

/**
 * ステータス別統計
 */
export class StatusStatsDto {
  status: InquiryStatus;
  count: number;
  percentage: number;
}

/**
 * 日別トレンド
 */
export class DailyTrendDto {
  date: string;
  totalInquiries: number;
  newInquiries: number;
  resolvedInquiries: number;
  averageResponseTimeHours: number;
}

/**
 * 対応時間分析レスポンス
 */
export class ResponseTimeAnalyticsDto {
  averageFirstResponseTimeHours: number;
  averageResolutionTimeHours: number;
  medianFirstResponseTimeHours: number;
  medianResolutionTimeHours: number;
  responseTimeDistribution: ResponseTimeDistributionDto[];
  slaComplianceRate: number;
  responseTimeByCategory: CategoryResponseTimeDto[];
  responseTimeByPriority: PriorityResponseTimeDto[];
}

/**
 * 対応時間分布
 */
export class ResponseTimeDistributionDto {
  timeRangeHours: string; // "0-1", "1-4", "4-24", "24+"
  count: number;
  percentage: number;
}

/**
 * カテゴリ別対応時間
 */
export class CategoryResponseTimeDto {
  category: string;
  averageResponseTimeHours: number;
  averageResolutionTimeHours: number;
  count: number;
}

/**
 * 優先度別対応時間
 */
export class PriorityResponseTimeDto {
  priority: InquiryPriority;
  averageResponseTimeHours: number;
  averageResolutionTimeHours: number;
  count: number;
  slaTargetHours: number;
  complianceRate: number;
}

/**
 * リアルタイム統計更新用DTO
 */
export class RealtimeStatsDto {
  timestamp: Date;
  totalInquiries: number;
  newInquiriesLast24h: number;
  resolvedInquiriesLast24h: number;
  averageResponseTimeLast24h: number;
  activeUsers: number;
  pendingInquiries: number;
}

/**
 * 期間指定用DTO
 */
export class DateRangeDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

/**
 * 統計期間指定用DTO
 */
export class StatsPeriodDto {
  @IsOptional()
  @IsEnum(['today', 'yesterday', 'last7days', 'last30days', 'last90days', 'custom'])
  period?: string = 'last30days';

  @IsOptional()
  @Type(() => DateRangeDto)
  customRange?: DateRangeDto;
}

/**
 * ユーザーパフォーマンス分析用DTO
 * 要件: 9.2 (ユーザー・チーム別パフォーマンス分析)
 */
export class UserPerformanceDto {
  userId: string;
  userName: string;
  email: string;
  totalInquiriesHandled: number;
  resolvedInquiries: number;
  averageResponseTimeHours: number;
  averageResolutionTimeHours: number;
  slaComplianceRate: number;
  customerSatisfactionScore: number;
  workloadDistribution: WorkloadDistributionDto[];
  performanceTrend: PerformanceTrendDto[];
  topCategories: CategoryPerformanceDto[];
}

/**
 * チームパフォーマンス分析用DTO
 * 要件: 9.2 (ユーザー・チーム別パフォーマンス分析)
 */
export class TeamPerformanceDto {
  teamId: string;
  teamName: string;
  memberCount: number;
  totalInquiriesHandled: number;
  resolvedInquiries: number;
  averageResponseTimeHours: number;
  averageResolutionTimeHours: number;
  teamSlaComplianceRate: number;
  teamSatisfactionScore: number;
  memberPerformances: UserPerformanceDto[];
  workloadBalance: WorkloadBalanceDto[];
  performanceComparison: TeamComparisonDto[];
}

/**
 * ワークロード分布用DTO
 */
export class WorkloadDistributionDto {
  priority: InquiryPriority;
  count: number;
  percentage: number;
  averageHandlingTimeHours: number;
}

/**
 * パフォーマンストレンド用DTO
 */
export class PerformanceTrendDto {
  date: string;
  inquiriesHandled: number;
  averageResponseTimeHours: number;
  slaComplianceRate: number;
  satisfactionScore: number;
}

/**
 * カテゴリ別パフォーマンス用DTO
 */
export class CategoryPerformanceDto {
  category: string;
  count: number;
  averageResponseTimeHours: number;
  slaComplianceRate: number;
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
}

/**
 * ワークロードバランス用DTO
 */
export class WorkloadBalanceDto {
  userId: string;
  userName: string;
  currentWorkload: number;
  averageWorkload: number;
  workloadRatio: number; // 平均に対する比率
  efficiency: number; // 効率性スコア
}

/**
 * チーム比較用DTO
 */
export class TeamComparisonDto {
  metric: string;
  value: number;
  benchmark: number;
  percentageDifference: number;
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * SLA達成率監視用DTO
 * 要件: 9.2 (SLA達成率監視機能)
 */
export class SlaComplianceReportDto {
  overallComplianceRate: number;
  complianceByPriority: PrioritySlaComplianceDto[];
  complianceByCategory: CategorySlaComplianceDto[];
  complianceByUser: UserSlaComplianceDto[];
  complianceByApp: AppSlaComplianceDto[];
  complianceTrend: SlaComplianceTrendDto[];
  violationAnalysis: SlaViolationAnalysisDto;
  improvementRecommendations: SlaImprovementDto[];
}

/**
 * 優先度別SLA達成率用DTO
 */
export class PrioritySlaComplianceDto {
  priority: InquiryPriority;
  targetHours: number;
  complianceRate: number;
  averageResponseTimeHours: number;
  violationCount: number;
  totalCount: number;
}

/**
 * カテゴリ別SLA達成率用DTO
 */
export class CategorySlaComplianceDto {
  category: string;
  complianceRate: number;
  averageResponseTimeHours: number;
  violationCount: number;
  totalCount: number;
}

/**
 * ユーザー別SLA達成率用DTO
 */
export class UserSlaComplianceDto {
  userId: string;
  userName: string;
  complianceRate: number;
  averageResponseTimeHours: number;
  violationCount: number;
  totalCount: number;
  performanceRank: number;
}

/**
 * アプリ別SLA達成率用DTO
 */
export class AppSlaComplianceDto {
  appId: string;
  appName: string;
  complianceRate: number;
  averageResponseTimeHours: number;
  violationCount: number;
  totalCount: number;
}

/**
 * SLA達成率トレンド用DTO
 */
export class SlaComplianceTrendDto {
  date: string;
  complianceRate: number;
  violationCount: number;
  totalInquiries: number;
  averageResponseTimeHours: number;
}

/**
 * SLA違反分析用DTO
 */
export class SlaViolationAnalysisDto {
  totalViolations: number;
  violationRate: number;
  commonCauses: ViolationCauseDto[];
  timePatterns: ViolationTimePatternDto[];
  impactAnalysis: ViolationImpactDto;
}

/**
 * 違反原因用DTO
 */
export class ViolationCauseDto {
  cause: string;
  count: number;
  percentage: number;
  averageDelayHours: number;
}

/**
 * 違反時間パターン用DTO
 */
export class ViolationTimePatternDto {
  timeRange: string; // "00:00-06:00", "06:00-12:00", etc.
  violationCount: number;
  violationRate: number;
}

/**
 * 違反影響分析用DTO
 */
export class ViolationImpactDto {
  customerSatisfactionImpact: number;
  escalationRate: number;
  averageResolutionDelayHours: number;
  businessImpactScore: number;
}

/**
 * SLA改善提案用DTO
 */
export class SlaImprovementDto {
  area: string;
  currentPerformance: number;
  targetPerformance: number;
  recommendation: string;
  estimatedImpact: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * トレンド分析用DTO
 * 要件: 9.2 (トレンド分析とレポート生成機能)
 */
export class TrendAnalysisDto {
  metric: string;
  period: string;
  dataPoints: TrendDataPointDto[];
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number; // -1 to 1
  seasonalPatterns: SeasonalPatternDto[];
  anomalies: AnomalyDto[];
  forecast: ForecastDto[];
}

/**
 * トレンドデータポイント用DTO
 */
export class TrendDataPointDto {
  timestamp: string;
  value: number;
  movingAverage: number;
  percentageChange: number;
}

/**
 * 季節パターン用DTO
 */
export class SeasonalPatternDto {
  pattern: string; // "daily", "weekly", "monthly"
  description: string;
  strength: number;
  peakPeriods: string[];
  lowPeriods: string[];
}

/**
 * 異常値用DTO
 */
export class AnomalyDto {
  timestamp: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  possibleCause: string;
}

/**
 * 予測用DTO
 */
export class ForecastDto {
  timestamp: string;
  predictedValue: number;
  confidenceLevel: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
  accuracy?: number;
}

/**
 * レポート生成用DTO
 * 要件: 9.2 (トレンド分析とレポート生成機能)
 */
export class ReportGenerationDto {
  reportId: string;
  reportType: 'performance' | 'sla' | 'trend' | 'comprehensive';
  title: string;
  description: string;
  generatedAt: Date;
  period: DateRangeDto;
  filters: AnalyticsFiltersDto;
  sections: ReportSectionDto[];
  summary: ReportSummaryDto;
  recommendations: ReportRecommendationDto[];
}

/**
 * レポートセクション用DTO
 */
export class ReportSectionDto {
  sectionId: string;
  title: string;
  type: 'chart' | 'table' | 'text' | 'metric';
  data: any;
  insights: string[];
}

/**
 * レポートサマリー用DTO
 */
export class ReportSummaryDto {
  keyMetrics: KeyMetricDto[];
  highlights: string[];
  concerns: string[];
  overallScore: number;
}

/**
 * キーメトリック用DTO
 */
export class KeyMetricDto {
  name: string;
  value: number;
  unit: string;
  change: number;
  changeDirection: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

/**
 * レポート推奨事項用DTO
 */
export class ReportRecommendationDto {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  actionItems: string[];
}
/**
 * 予測分析機能用DTO
 * 要件: 9.3 (予測分析機能の実装)
 */

/**
 * 予測リクエスト用DTO
 */
export class PredictionRequestDto {
  @IsEnum(['inquiry_volume', 'response_time', 'resource_demand'])
  metric: 'inquiry_volume' | 'response_time' | 'resource_demand';

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(1)
  @Max(90)
  forecastDays: number;

  @IsEnum(['hourly', 'daily', 'weekly'])
  granularity: 'hourly' | 'daily' | 'weekly';

  @IsOptional()
  @IsString()
  appId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

/**
 * リソース需要予測結果DTO
 */
export class ResourceDemandForecastDto {
  date: string;
  predictedInquiryVolume: number;
  recommendedStaffCount: number;
  expectedWorkloadHours: number;
  confidenceLevel: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 予測分析結果DTO
 */
export class PredictionAnalysisDto {
  metric: string;
  forecastPeriod: string;
  accuracy: number;
  forecast: ForecastDto[];
  resourceDemand?: ResourceDemandForecastDto[];
  insights: PredictionInsightDto[];
  recommendations: PredictionRecommendationDto[];
}

/**
 * 予測インサイトDTO
 */
export class PredictionInsightDto {
  type: 'trend' | 'seasonal' | 'anomaly' | 'capacity';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
}

/**
 * 予測推奨事項DTO
 */
export class PredictionRecommendationDto {
  category: 'staffing' | 'capacity' | 'process' | 'training';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
  timeframe: string;
}

/**
 * 予測可視化データDTO
 */
export class PredictionVisualizationDto {
  chartType: 'line' | 'bar' | 'area';
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  datasets: PredictionDatasetDto[];
  annotations?: PredictionAnnotationDto[];
}

/**
 * 予測データセットDTO
 */
export class PredictionDatasetDto {
  label: string;
  data: { x: string; y: number }[];
  color: string;
  type: 'historical' | 'forecast' | 'confidence';
}

/**
 * 予測アノテーションDTO
 */
export class PredictionAnnotationDto {
  type: 'line' | 'area' | 'point';
  value: any;
  label: string;
  color: string;
}

/**
 * 予測精度レポートDTO
 */
export class PredictionAccuracyReportDto {
  period: string;
  volumePredictionAccuracy: number;
  resourcePredictionAccuracy: number;
  overallAccuracy: number;
  recommendations: PredictionRecommendationDto[];
  lastUpdated: string;
}