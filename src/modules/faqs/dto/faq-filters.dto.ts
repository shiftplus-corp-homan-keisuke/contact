import { IsOptional, IsString, IsBoolean, IsArray, IsUUID, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class FAQFiltersDto {
    @ApiPropertyOptional({ description: 'アプリケーションID' })
    @IsOptional()
    @IsUUID()
    appId?: string;

    @ApiPropertyOptional({ description: 'カテゴリ' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({ description: '公開状態' })
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    isPublished?: boolean;

    @ApiPropertyOptional({ description: 'タグ（カンマ区切り）' })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ description: '検索キーワード' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'ページ番号', minimum: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ description: '1ページあたりの件数', minimum: 1, maximum: 100, default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number;
}