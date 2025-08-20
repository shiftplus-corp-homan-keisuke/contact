import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * エスカレーション実行DTO
 */
export class EscalateInquiryDto {
    @ApiProperty({ description: 'エスカレーション先ユーザーID' })
    @IsUUID()
    escalatedTo: string;

    @ApiProperty({ description: 'エスカレーション理由' })
    @IsString()
    reason: string;

    @ApiPropertyOptional({ description: 'コメント' })
    @IsOptional()
    @IsString()
    comment?: string;
}

/**
 * エスカレーション統計取得DTO
 */
export class EscalationStatsDto {
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
 * エスカレーションレスポンスDTO
 */
export class EscalationResponseDto {
    @ApiProperty({ description: 'ID' })
    id: string;

    @ApiProperty({ description: '問い合わせID' })
    inquiryId: string;

    @ApiProperty({ description: 'エスカレーション元ユーザーID' })
    escalatedFrom: string;

    @ApiProperty({ description: 'エスカレーション先ユーザーID' })
    escalatedTo: string;

    @ApiProperty({ description: 'エスカレーション理由' })
    escalationReason: string;

    @ApiProperty({ description: 'エスカレーションレベル' })
    escalationLevel: number;

    @ApiProperty({ description: 'コメント' })
    comment: string;

    @ApiProperty({ description: '自動エスカレーション' })
    isAutomatic: boolean;

    @ApiProperty({ description: 'エスカレーション実行者ID' })
    escalatedBy: string;

    @ApiProperty({ description: 'エスカレーション日時' })
    escalatedAt: Date;
}

/**
 * エスカレーション統計レスポンスDTO
 */
export class EscalationStatsResponseDto {
    @ApiProperty({ description: '総エスカレーション数' })
    total: number;

    @ApiProperty({ description: '自動エスカレーション数' })
    automatic: number;

    @ApiProperty({ description: '手動エスカレーション数' })
    manual: number;

    @ApiProperty({ description: '理由別エスカレーション数' })
    byReason: Record<string, number>;

    @ApiProperty({ description: 'レベル別エスカレーション数' })
    byLevel: Record<string, number>;

    @ApiProperty({ description: '平均エスカレーションレベル' })
    averageLevel: number;
}

/**
 * ユーザー別エスカレーション統計レスポンスDTO
 */
export class UserEscalationStatsResponseDto {
    @ApiProperty({ description: '関与した総エスカレーション数' })
    totalInvolved: number;

    @ApiProperty({ description: 'エスカレーション元となった数' })
    escalatedFrom: number;

    @ApiProperty({ description: 'エスカレーション先となった数' })
    escalatedTo: number;

    @ApiProperty({ description: '受けた自動エスカレーション数' })
    automaticEscalations: number;

    @ApiProperty({ description: '受けた手動エスカレーション数' })
    manualEscalations: number;
}