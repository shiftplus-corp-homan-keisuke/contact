import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsUUID, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * SLA設定作成DTO
 */
export class CreateSlaConfigDto {
    @ApiProperty({ description: 'アプリケーションID' })
    @IsUUID()
    appId: string;

    @ApiProperty({
        description: '優先度',
        enum: ['low', 'medium', 'high', 'urgent']
    })
    @IsEnum(['low', 'medium', 'high', 'urgent'])
    priority: 'low' | 'medium' | 'high' | 'urgent';

    @ApiProperty({ description: '応答時間（時間）' })
    @IsNumber()
    @Min(1)
    @Max(168) // 1週間
    responseTimeHours: number;

    @ApiProperty({ description: '解決時間（時間）' })
    @IsNumber()
    @Min(1)
    @Max(720) // 30日
    resolutionTimeHours: number;

    @ApiProperty({ description: 'エスカレーション時間（時間）' })
    @IsNumber()
    @Min(1)
    @Max(168) // 1週間
    escalationTimeHours: number;

    @ApiPropertyOptional({ description: 'アクティブ状態', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

/**
 * SLA設定更新DTO
 */
export class UpdateSlaConfigDto {
    @ApiPropertyOptional({ description: '応答時間（時間）' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(168)
    responseTimeHours?: number;

    @ApiPropertyOptional({ description: '解決時間（時間）' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(720)
    resolutionTimeHours?: number;

    @ApiPropertyOptional({ description: 'エスカレーション時間（時間）' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(168)
    escalationTimeHours?: number;

    @ApiPropertyOptional({ description: 'アクティブ状態' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

/**
 * SLA違反統計取得DTO
 */
export class SlaViolationStatsDto {
    @ApiPropertyOptional({ description: 'アプリケーションID' })
    @IsOptional()
    @IsUUID()
    appId?: string;

    @ApiPropertyOptional({ description: '開始日' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: '終了日' })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

/**
 * SLA違反解決DTO
 */
export class ResolveSlaViolationDto {
    @ApiPropertyOptional({ description: '解決コメント' })
    @IsOptional()
    @IsString()
    comment?: string;
}

/**
 * SLA設定レスポンスDTO
 */
export class SlaConfigResponseDto {
    @ApiProperty({ description: 'ID' })
    id: string;

    @ApiProperty({ description: 'アプリケーションID' })
    appId: string;

    @ApiProperty({ description: '優先度' })
    priority: string;

    @ApiProperty({ description: '応答時間（時間）' })
    responseTimeHours: number;

    @ApiProperty({ description: '解決時間（時間）' })
    resolutionTimeHours: number;

    @ApiProperty({ description: 'エスカレーション時間（時間）' })
    escalationTimeHours: number;

    @ApiProperty({ description: 'アクティブ状態' })
    isActive: boolean;

    @ApiProperty({ description: '作成日時' })
    createdAt: Date;

    @ApiProperty({ description: '更新日時' })
    updatedAt: Date;
}

/**
 * SLA違反レスポンスDTO
 */
export class SlaViolationResponseDto {
    @ApiProperty({ description: 'ID' })
    id: string;

    @ApiProperty({ description: '問い合わせID' })
    inquiryId: string;

    @ApiProperty({ description: 'SLA設定ID' })
    slaConfigId: string;

    @ApiProperty({ description: '違反タイプ' })
    violationType: string;

    @ApiProperty({ description: '期待時間' })
    expectedTime: Date;

    @ApiProperty({ description: '実際の時間' })
    actualTime: Date;

    @ApiProperty({ description: '遅延時間（時間）' })
    delayHours: number;

    @ApiProperty({ description: '重要度' })
    severity: string;

    @ApiProperty({ description: '解決済み' })
    isResolved: boolean;

    @ApiProperty({ description: '検出日時' })
    detectedAt: Date;
}

/**
 * SLA違反統計レスポンスDTO
 */
export class SlaViolationStatsResponseDto {
    @ApiProperty({ description: '総違反数' })
    total: number;

    @ApiProperty({ description: 'タイプ別違反数' })
    byType: Record<string, number>;

    @ApiProperty({ description: '重要度別違反数' })
    bySeverity: Record<string, number>;

    @ApiProperty({ description: '解決済み違反数' })
    resolved: number;

    @ApiProperty({ description: '未解決違反数' })
    unresolved: number;

    @ApiProperty({ description: '平均遅延時間（時間）' })
    averageDelayHours: number;
}