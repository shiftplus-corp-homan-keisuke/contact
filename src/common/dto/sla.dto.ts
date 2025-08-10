import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID, IsIn, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSlaConfigDto {
  @ApiProperty({ description: 'アプリケーションID' })
  @IsUUID()
  applicationId: string;

  @ApiProperty({ description: '優先度レベル', enum: ['low', 'medium', 'high', 'critical'] })
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priorityLevel: string;

  @ApiProperty({ description: '初回応答時間（時間）' })
  @IsNumber()
  @Min(1)
  responseTimeHours: number;

  @ApiProperty({ description: '解決時間（時間）' })
  @IsNumber()
  @Min(1)
  resolutionTimeHours: number;

  @ApiProperty({ description: 'エスカレーション時間（時間）' })
  @IsNumber()
  @Min(1)
  escalationTimeHours: number;

  @ApiPropertyOptional({ description: '営業時間のみカウントするか', default: false })
  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;

  @ApiPropertyOptional({ description: '営業開始時間', default: 9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  businessStartHour?: number;

  @ApiPropertyOptional({ description: '営業終了時間', default: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  businessEndHour?: number;

  @ApiPropertyOptional({ description: '営業日（カンマ区切り）', default: '1,2,3,4,5' })
  @IsOptional()
  @IsString()
  businessDays?: string;

  @ApiPropertyOptional({ description: 'アクティブ状態', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSlaConfigDto {
  @ApiPropertyOptional({ description: '優先度レベル', enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priorityLevel?: string;

  @ApiPropertyOptional({ description: '初回応答時間（時間）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  responseTimeHours?: number;

  @ApiPropertyOptional({ description: '解決時間（時間）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  resolutionTimeHours?: number;

  @ApiPropertyOptional({ description: 'エスカレーション時間（時間）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  escalationTimeHours?: number;

  @ApiPropertyOptional({ description: '営業時間のみカウントするか' })
  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;

  @ApiPropertyOptional({ description: '営業開始時間' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  businessStartHour?: number;

  @ApiPropertyOptional({ description: '営業終了時間' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  businessEndHour?: number;

  @ApiPropertyOptional({ description: '営業日（カンマ区切り）' })
  @IsOptional()
  @IsString()
  businessDays?: string;

  @ApiPropertyOptional({ description: 'アクティブ状態' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SlaViolationResponseDto {
  @ApiProperty({ description: 'SLA違反ID' })
  id: string;

  @ApiProperty({ description: '問い合わせID' })
  inquiryId: string;

  @ApiProperty({ description: '違反タイプ' })
  violationType: string;

  @ApiProperty({ description: '期待時間' })
  expectedTime: Date;

  @ApiProperty({ description: '実際の時間' })
  actualTime: Date;

  @ApiProperty({ description: '違反時間' })
  violationTime: Date;

  @ApiProperty({ description: '遅延時間（時間）' })
  delayHours: number;

  @ApiProperty({ description: '重要度' })
  severity: string;

  @ApiProperty({ description: 'エスカレーション済みか' })
  isEscalated: boolean;

  @ApiProperty({ description: 'エスカレーション先ユーザーID' })
  escalatedToUserId: string;

  @ApiProperty({ description: 'エスカレーション日時' })
  escalatedAt: Date;

  @ApiProperty({ description: '解決済みか' })
  isResolved: boolean;

  @ApiProperty({ description: '解決日時' })
  resolvedAt: Date;
}

export class SlaMetricsDto {
  @ApiProperty({ description: 'アプリケーションID' })
  applicationId: string;

  @ApiProperty({ description: '期間開始日' })
  startDate: Date;

  @ApiProperty({ description: '期間終了日' })
  endDate: Date;

  @ApiProperty({ description: '総問い合わせ数' })
  totalInquiries: number;

  @ApiProperty({ description: 'SLA達成数' })
  slaCompliant: number;

  @ApiProperty({ description: 'SLA違反数' })
  slaViolations: number;

  @ApiProperty({ description: 'SLA達成率（%）' })
  complianceRate: number;

  @ApiProperty({ description: '平均応答時間（時間）' })
  averageResponseTime: number;

  @ApiProperty({ description: '平均解決時間（時間）' })
  averageResolutionTime: number;

  @ApiProperty({ description: '優先度別統計' })
  priorityStats: {
    [key: string]: {
      total: number;
      compliant: number;
      violations: number;
      complianceRate: number;
    };
  };
}

export class EscalationRuleDto {
  @ApiProperty({ description: 'エスカレーション先ユーザーID' })
  @IsUUID()
  escalateToUserId: string;

  @ApiProperty({ description: 'エスカレーション理由' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: '追加メモ' })
  @IsOptional()
  @IsString()
  notes?: string;
}