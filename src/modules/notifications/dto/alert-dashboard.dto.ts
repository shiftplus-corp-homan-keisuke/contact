import { IsOptional, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * ダッシュボードクエリDTO
 */
export class DashboardQueryDto {
    @ApiPropertyOptional({ description: 'アプリケーションID' })
    @IsOptional()
    @IsUUID()
    appId?: string;

    @ApiPropertyOptional({ description: '取得日数', minimum: 1, maximum: 365 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @Min(1)
    @Max(365)
    days?: number;
}

/**
 * ダッシュボード概要レスポンスDTO
 */
export class DashboardOverviewResponseDto {
    @ApiPropertyOptional({ description: 'アクティブなSLA違反数' })
    activeSlaViolations: number;

    @ApiPropertyOptional({ description: '過去24時間の新しいSLA違反数' })
    recentSlaViolations: number;

    @ApiPropertyOptional({ description: '重要度別SLA違反数' })
    slaViolationsBySeverity: Record<string, number>;

    @ApiPropertyOptional({ description: '過去24時間のエスカレーション数' })
    recentEscalations: number;

    @ApiPropertyOptional({ description: '自動エスカレーション率（%）' })
    autoEscalationRate: number;

    @ApiPropertyOptional({ description: '高優先度の対応待ち問い合わせ数' })
    highPriorityInquiries: number;

    @ApiPropertyOptional({ description: '最終更新日時' })
    lastUpdated: Date;
}

/**
 * SLA違反トレンドレスポンスDTO
 */
export class SlaViolationTrendsResponseDto {
    @ApiPropertyOptional({ description: '日付' })
    date: string;

    @ApiPropertyOptional({ description: '応答時間違反数' })
    response_time: number;

    @ApiPropertyOptional({ description: '解決時間違反数' })
    resolution_time: number;

    @ApiPropertyOptional({ description: 'エスカレーション時間違反数' })
    escalation_time: number;
}

/**
 * エスカレーション分析レスポンスDTO
 */
export class EscalationAnalysisResponseDto {
    @ApiPropertyOptional({ description: '総エスカレーション数' })
    total: number;

    @ApiPropertyOptional({ description: '理由別エスカレーション数' })
    byReason: Record<string, number>;

    @ApiPropertyOptional({ description: 'レベル別エスカレーション数' })
    byLevel: Record<string, number>;

    @ApiPropertyOptional({ description: '時間別エスカレーション分布' })
    hourlyDistribution: Array<{ hour: number; count: number }>;

    @ApiPropertyOptional({ description: 'トップエスカレーション対象' })
    topEscalationTargets: Array<{ userId: string; count: number }>;

    @ApiPropertyOptional({ description: '自動エスカレーション率（%）' })
    automaticRate: number;
}

/**
 * 通知効果分析レスポンスDTO
 */
export class NotificationEffectivenessResponseDto {
    @ApiPropertyOptional({ description: '総通知数' })
    total: number;

    @ApiPropertyOptional({ description: 'ステータス別通知数' })
    byStatus: Record<string, number>;

    @ApiPropertyOptional({ description: 'チャネル別通知数' })
    byChannel: Record<string, number>;

    @ApiPropertyOptional({ description: '配信成功率（%）' })
    successRate: number;
}

/**
 * リアルタイムアラートレスポンスDTO
 */
export class RealTimeAlertsResponseDto {
    @ApiPropertyOptional({ description: '最近のSLA違反' })
    recentViolations: any[];

    @ApiPropertyOptional({ description: '最近のエスカレーション' })
    recentEscalations: any[];

    @ApiPropertyOptional({ description: '緊急対応が必要な問い合わせ' })
    urgentInquiries: any[];

    @ApiPropertyOptional({ description: 'タイムスタンプ' })
    timestamp: Date;
}