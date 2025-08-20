import { IsString, IsUUID, IsOptional, IsNumber, IsBoolean, IsEnum, IsObject, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

/**
 * ファイルアップロードDTO
 */
export class FileUploadDto {
    @ApiProperty({ description: '関連する問い合わせID' })
    @IsUUID()
    inquiryId: string;

    @ApiPropertyOptional({ description: 'メタデータ' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

/**
 * ファイル検索DTO
 */
export class FileSearchDto {
    @ApiPropertyOptional({ description: '問い合わせID' })
    @IsOptional()
    @IsUUID()
    inquiryId?: string;

    @ApiPropertyOptional({ description: 'アップロードユーザーID' })
    @IsOptional()
    @IsUUID()
    uploadedBy?: string;

    @ApiPropertyOptional({ description: 'MIMEタイプ' })
    @IsOptional()
    @IsString()
    mimeType?: string;

    @ApiPropertyOptional({
        description: 'スキャン結果',
        enum: ['pending', 'clean', 'infected', 'suspicious', 'error']
    })
    @IsOptional()
    @IsEnum(['pending', 'clean', 'infected', 'suspicious', 'error'])
    scanResult?: 'pending' | 'clean' | 'infected' | 'suspicious' | 'error';

    @ApiPropertyOptional({ description: '削除フラグ' })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    isDeleted?: boolean;

    @ApiPropertyOptional({ description: '開始日時' })
    @IsOptional()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({ description: '終了日時' })
    @IsOptional()
    @Type(() => Date)
    endDate?: Date;

    @ApiPropertyOptional({ description: '最小ファイルサイズ' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minSize?: number;

    @ApiPropertyOptional({ description: '最大ファイルサイズ' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxSize?: number;

    @ApiPropertyOptional({ description: 'ページ番号', default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: '1ページあたりの件数', default: 20 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 20;
}

/**
 * ファイル削除DTO
 */
export class FileDeleteDto {
    @ApiPropertyOptional({ description: '削除理由' })
    @IsOptional()
    @IsString()
    reason?: string;
}

/**
 * ファイルスキャンDTO
 */
export class FileScanDto {
    @ApiProperty({ description: 'スキャン対象ファイルID配列' })
    @IsArray()
    @IsUUID(undefined, { each: true })
    fileIds: string[];

    @ApiPropertyOptional({ description: '強制再スキャンフラグ' })
    @IsOptional()
    @IsBoolean()
    forceRescan?: boolean;
}

/**
 * ストレージ使用量取得DTO
 */
export class StorageUsageDto {
    @ApiPropertyOptional({ description: 'アプリケーションID' })
    @IsOptional()
    @IsUUID()
    appId?: string;

    @ApiPropertyOptional({ description: '期間（日数）', default: 30 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(365)
    @Type(() => Number)
    days?: number = 30;
}

/**
 * ファイルクリーンアップDTO
 */
export class FileCleanupDto {
    @ApiPropertyOptional({ description: '保持期間（日数）', default: 90 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    retentionDays?: number = 90;

    @ApiPropertyOptional({ description: 'ドライランフラグ' })
    @IsOptional()
    @IsBoolean()
    dryRun?: boolean;

    @ApiPropertyOptional({ description: '削除対象のスキャン結果' })
    @IsOptional()
    @IsArray()
    @IsEnum(['pending', 'clean', 'infected', 'suspicious', 'error'], { each: true })
    targetScanResults?: Array<'pending' | 'clean' | 'infected' | 'suspicious' | 'error'>;
}

/**
 * ファイル統計取得DTO
 */
export class FileStatisticsDto {
    @ApiPropertyOptional({ description: '開始日時' })
    @IsOptional()
    @Type(() => Date)
    startDate?: Date;

    @ApiPropertyOptional({ description: '終了日時' })
    @IsOptional()
    @Type(() => Date)
    endDate?: Date;

    @ApiPropertyOptional({ description: 'グループ化単位', enum: ['day', 'week', 'month'] })
    @IsOptional()
    @IsEnum(['day', 'week', 'month'])
    groupBy?: 'day' | 'week' | 'month';
}