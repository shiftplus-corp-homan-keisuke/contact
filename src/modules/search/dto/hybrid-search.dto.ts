import { IsString, IsNumber, IsOptional, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HybridSearchRequestDto {
    @ApiProperty({ description: '検索クエリ' })
    @IsString()
    query: string;

    @ApiPropertyOptional({
        description: 'ベクトル検索の重み',
        minimum: 0,
        maximum: 1,
        default: 0.5
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(1)
    vectorWeight?: number = 0.5;

    @ApiPropertyOptional({
        description: '全文検索の重み',
        minimum: 0,
        maximum: 1,
        default: 0.5
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(1)
    textWeight?: number = 0.5;

    @ApiPropertyOptional({
        description: '取得件数',
        minimum: 1,
        maximum: 100,
        default: 20
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'フィルター条件' })
    @IsOptional()
    @IsObject()
    filters?: {
        appId?: string;
        status?: string[];
        category?: string[];
        priority?: string[];
        startDate?: string;
        endDate?: string;
    };

    @ApiPropertyOptional({ description: 'ユーザーコンテキスト' })
    @IsOptional()
    @IsObject()
    userContext?: {
        appId?: string;
        recentCategories?: string[];
        preferredTypes?: string[];
    };
}

export class HybridSearchResultDto {
    @ApiProperty({ description: 'ID' })
    id: string;

    @ApiProperty({ description: 'タイトル' })
    title: string;

    @ApiProperty({ description: '内容' })
    content: string;

    @ApiProperty({ description: 'タイプ' })
    type: 'inquiry' | 'response' | 'faq';

    @ApiProperty({ description: 'ベクトル検索スコア' })
    vectorScore: number;

    @ApiProperty({ description: '全文検索スコア' })
    textScore: number;

    @ApiProperty({ description: '統合スコア' })
    combinedScore: number;

    @ApiProperty({ description: 'ハイライト部分' })
    highlights: string[];

    @ApiProperty({ description: 'メタデータ' })
    metadata: Record<string, any>;

    @ApiProperty({ description: '作成日時' })
    createdAt: Date;
}

export class PaginatedHybridSearchResultDto {
    @ApiProperty({ description: '検索結果', type: [HybridSearchResultDto] })
    items: HybridSearchResultDto[];

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

    @ApiProperty({ description: '検索統計' })
    searchStats?: {
        textResultsCount: number;
        vectorResultsCount: number;
        combinedResultsCount: number;
        searchTime: number;
    };
}