import { IsOptional, IsString, IsNumber, Min, Max, IsArray, IsEnum, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export enum SortBy {
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
    TITLE = 'title',
    STATUS = 'status',
    PRIORITY = 'priority',
}

export class SearchFiltersDto {
    @ApiPropertyOptional({ description: 'アプリケーションID' })
    @IsOptional()
    @IsString()
    appId?: string;

    @ApiPropertyOptional({ description: '状態フィルター', isArray: true })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    status?: string[];

    @ApiPropertyOptional({ description: 'カテゴリフィルター', isArray: true })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    category?: string[];

    @ApiPropertyOptional({ description: '担当者ID' })
    @IsOptional()
    @IsString()
    assignedTo?: string;

    @ApiPropertyOptional({ description: '優先度フィルター', isArray: true })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    priority?: string[];

    @ApiPropertyOptional({ description: '顧客メールアドレス' })
    @IsOptional()
    @IsString()
    customerEmail?: string;

    @ApiPropertyOptional({ description: '開始日' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: '終了日' })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class SearchCriteriaDto {
    @ApiProperty({ description: '検索クエリ' })
    @IsString()
    query: string;

    @ApiPropertyOptional({ description: 'フィルター条件' })
    @IsOptional()
    @Type(() => SearchFiltersDto)
    filters?: SearchFiltersDto;

    @ApiPropertyOptional({ description: 'ソート項目', enum: SortBy, default: SortBy.CREATED_AT })
    @IsOptional()
    @IsEnum(SortBy)
    sortBy?: SortBy = SortBy.CREATED_AT;

    @ApiPropertyOptional({ description: 'ソート順', enum: SortOrder, default: SortOrder.DESC })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;

    @ApiPropertyOptional({ description: 'ページ番号', minimum: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: '1ページあたりの件数', minimum: 1, maximum: 100, default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}

export class FullTextSearchResultDto {
    @ApiProperty({ description: 'ID' })
    id: string;

    @ApiProperty({ description: 'タイトル' })
    title: string;

    @ApiProperty({ description: '内容' })
    content: string;

    @ApiProperty({ description: 'タイプ' })
    type: 'inquiry' | 'response' | 'faq';

    @ApiProperty({ description: '検索スコア' })
    score: number;

    @ApiProperty({ description: 'ハイライト部分' })
    highlights: string[];

    @ApiProperty({ description: 'メタデータ' })
    metadata: Record<string, any>;

    @ApiProperty({ description: '作成日時' })
    createdAt: Date;
}

export class PaginatedSearchResultDto {
    @ApiProperty({ description: '検索結果', type: [FullTextSearchResultDto] })
    items: FullTextSearchResultDto[];

    @ApiProperty({ description: '総件数' })
    total: number;

    @ApiProperty({ description: '現在のページ' })
    page: number;

    @ApiProperty({ description: '1ページあたりの件数' })
    limit: number;

    @ApiProperty({ description: '総ページ数' })
    totalPages: number;

    @ApiProperty({ description: '次のページがあるか' })
    hasNext: boolean;

    @ApiProperty({ description: '前のページがあるか' })
    hasPrev: boolean;
}