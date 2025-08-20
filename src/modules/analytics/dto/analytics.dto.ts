import { IsOptional, IsDateString, IsArray, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 分析フィルターDTO
 */
export class AnalyticsFiltersDto {
    @ApiPropertyOptional({ description: '開始日' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: '終了日' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'アプリケーションID配列', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    appIds?: string[];

    @ApiPropertyOptional({ description: 'カテゴリ配列', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categories?: string[];

    @ApiPropertyOptional({
        description: 'ステータス配列',
        type: [String],
        enum: ['new', 'in_progress', 'pending', 'resolved', 'closed']
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    statuses?: string[];

    @ApiPropertyOptional({
        description: '優先度配列',
        type: [String],
        enum: ['low', 'medium', 'high', 'urgent']
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    priorities?: string[];

    @ApiPropertyOptional({ description: '担当者ID配列', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    assignedTo?: string[];
}

/**
 * ダッシュボードクエリDTO
 */
export class DashboardQueryDto extends AnalyticsFiltersDto {
    @ApiPropertyOptional({ description: 'リアルタイム更新を有効にするか', default: false })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    realtime?: boolean;

    @ApiPropertyOptional({ description: 'タイムゾーン', default: 'Asia/Tokyo' })
    @IsOptional()
    @IsString()
    timezone?: string;
}

/**
 * 期間指定DTO
 */
export class PeriodDto {
    @ApiProperty({
        description: '期間タイプ',
        enum: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'custom']
    })
    @IsEnum(['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'custom'])
    period: string;

    @ApiPropertyOptional({ description: 'カスタム期間の開始日（periodがcustomの場合必須）' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'カスタム期間の終了日（periodがcustomの場合必須）' })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

/**
 * 統計レスポンスDTO
 */
export class InquiryStatisticsResponseDto {
    @ApiProperty({ description: '総問い合わせ数' })
    totalInquiries: number;

    @ApiProperty({ description: '新規問い合わせ数' })
    newInquiries: number;

    @ApiProperty({ description: '対応中問い合わせ数' })
    inProgressInquiries: number;

    @ApiProperty({ description: '解決済み問い合わせ数' })
    resolvedInquiries: number;

    @ApiProperty({ description: 'クローズ済み問い合わせ数' })
    closedInquiries: number;

    @ApiProperty({ description: '平均初回応答時間（時間）' })
    averageResponseTime: number;

    @ApiProperty({ description: '平均解決時間（時間）' })
    averageResolutionTime: number;

    @ApiProperty({ description: '満足度スコア', required: false })
    satisfactionScore?: number;

    @ApiProperty({ description: 'カテゴリ別統計', type: 'array' })
    categoryBreakdown: any[];

    @ApiProperty({ description: 'アプリ別統計', type: 'array' })
    appBreakdown: any[];

    @ApiProperty({ description: 'ステータス別統計', type: 'array' })
    statusBreakdown: any[];

    @ApiProperty({ description: '優先度別統計', type: 'array' })
    priorityBreakdown: any[];
}

/**
 * ダッシュボードレスポンスDTO
 */
export class DashboardResponseDto {
    @ApiProperty({ description: '基本統計情報' })
    statistics: InquiryStatisticsResponseDto;

    @ApiProperty({ description: '応答時間分析' })
    responseTimeAnalytics: any;

    @ApiProperty({ description: '最近のトレンド', type: 'array' })
    recentTrends: any[];

    @ApiProperty({ description: 'トップカテゴリ', type: 'array' })
    topCategories: any[];

    @ApiProperty({ description: 'トップアプリ', type: 'array' })
    topApps: any[];

    @ApiProperty({ description: '最終更新時刻' })
    lastUpdated: Date;
}

/**
 * リアルタイム更新DTO
 */
export class RealTimeUpdateDto {
    @ApiProperty({
        description: '更新タイプ',
        enum: ['inquiry_created', 'inquiry_updated', 'inquiry_resolved']
    })
    type: string;

    @ApiProperty({ description: '更新データ' })
    data: any;

    @ApiProperty({ description: 'タイムスタンプ' })
    timestamp: Date;
}/
    **
 * パフォーマンス分析用DTO
    */
export class UserPerformanceQueryDto extends AnalyticsFiltersDto {
    @ApiPropertyOptional({ description: 'ユーザーID' })
    @IsOptional()
    @IsString()
    userId?: string;
}

export class TeamPerformanceQueryDto extends AnalyticsFiltersDto {
    @ApiPropertyOptional({ description: 'チームID' })
    @IsOptional()
    @IsString()
    teamId?: string;
}

export class TrendAnalysisQueryDto extends AnalyticsFiltersDto {
    @ApiProperty({
        description: 'メトリック種別',
        enum: ['inquiry_count', 'response_time', 'resolution_rate', 'sla_compliance']
    })
    @IsEnum(['inquiry_count', 'response_time', 'resolution_rate', 'sla_compliance'])
    metric: string;

    @ApiPropertyOptional({
        description: '期間タイプ',
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily'
    })
    @IsOptional()
    @IsEnum(['daily', 'weekly', 'monthly'])
    period?: 'daily' | 'weekly' | 'monthly';
}

/**
 * ユーザーパフォーマンスレスポンスDTO
 */
export class UserPerformanceResponseDto {
    @ApiProperty({ description: 'ユーザーID' })
    userId: string;

    @ApiProperty({ description: 'ユーザー名' })
    userName: string;

    @ApiProperty({ description: '総問い合わせ数' })
    totalInquiries: number;

    @ApiProperty({ description: '解決済み問い合わせ数' })
    resolvedInquiries: number;

    @ApiProperty({ description: '平均応答時間（時間）' })
    averageResponseTime: number;

    @ApiProperty({ description: '平均解決時間（時間）' })
    averageResolutionTime: number;

    @ApiProperty({ description: '解決率（%）' })
    resolutionRate: number;

    @ApiProperty({ description: '満足度スコア', required: false })
    satisfactionScore?: number;

    @ApiProperty({
        description: 'ワークロード',
        enum: ['low', 'medium', 'high']
    })
    workload: string;

    @ApiProperty({ description: '効率性スコア（0-100）' })
    efficiency: number;
}

/**
 * SLA達成率レスポンスDTO
 */
export class SLAComplianceResponseDto {
    @ApiProperty({ description: '総問い合わせ数' })
    totalInquiries: number;

    @ApiProperty({ description: 'SLA達成問い合わせ数' })
    slaCompliantInquiries: number;

    @ApiProperty({ description: 'SLA達成率（%）' })
    complianceRate: number;

    @ApiProperty({ description: '平均応答時間（時間）' })
    averageResponseTime: number;

    @ApiProperty({ description: 'SLA目標時間（時間）' })
    slaTarget: number;

    @ApiProperty({ description: 'SLA違反一覧', type: 'array' })
    violations: any[];

    @ApiProperty({ description: 'カテゴリ別SLA達成率', type: 'array' })
    complianceByCategory: any[];

    @ApiProperty({ description: '優先度別SLA達成率', type: 'array' })
    complianceByPriority: any[];
}

/**
 * トレンド分析レスポンスDTO
 */
export class TrendAnalysisResponseDto {
    @ApiProperty({ description: 'メトリック名' })
    metric: string;

    @ApiProperty({
        description: '期間タイプ',
        enum: ['daily', 'weekly', 'monthly']
    })
    period: string;

    @ApiProperty({ description: 'トレンドデータ', type: 'array' })
    data: any[];

    @ApiProperty({
        description: 'トレンド方向',
        enum: ['increasing', 'decreasing', 'stable']
    })
    trend: string;

    @ApiProperty({ description: '変化率（%）' })
    changePercentage: number;
}