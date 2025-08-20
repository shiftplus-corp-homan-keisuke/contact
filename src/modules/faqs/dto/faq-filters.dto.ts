import { IsOptional, IsString, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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
}