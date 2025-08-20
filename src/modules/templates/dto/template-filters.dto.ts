import {
    IsOptional,
    IsString,
    IsArray,
    IsBoolean,
    IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateFiltersDto {
    @ApiPropertyOptional({ description: 'カテゴリでフィルタ' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({ description: 'タグでフィルタ' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value.split(',').map(tag => tag.trim());
        }
        return value;
    })
    tags?: string[];

    @ApiPropertyOptional({ description: '共有テンプレートのみ' })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value === 'true';
        }
        return value;
    })
    isShared?: boolean;

    @ApiPropertyOptional({ description: '作成者でフィルタ' })
    @IsOptional()
    @IsUUID()
    createdBy?: string;

    @ApiPropertyOptional({ description: '検索クエリ' })
    @IsOptional()
    @IsString()
    searchQuery?: string;
}