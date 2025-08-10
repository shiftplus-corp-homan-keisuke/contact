/**
 * FAQ関連DTO
 * 要件: 6.3, 6.4 (FAQ管理機能)
 */

import { IsString, IsOptional, IsBoolean, IsArray, IsInt, IsNumber, Min, Max, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * FAQ作成リクエストDTO
 */
export class CreateFAQDto {
  @ApiProperty({ description: 'アプリケーションID' })
  @IsUUID()
  @IsNotEmpty()
  appId: string;

  @ApiProperty({ description: '質問内容', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;

  @ApiProperty({ description: '回答内容' })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiPropertyOptional({ description: 'カテゴリ', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'タグ配列', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '表示順序', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: '公開状態', default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

/**
 * FAQ更新リクエストDTO
 */
export class UpdateFAQDto {
  @ApiPropertyOptional({ description: '質問内容', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  question?: string;

  @ApiPropertyOptional({ description: '回答内容' })
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional({ description: 'カテゴリ', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'タグ配列', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '表示順序', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: '公開状態' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

/**
 * FAQ検索リクエストDTO
 */
export class SearchFAQDto {
  @ApiPropertyOptional({ description: '検索クエリ' })
  @IsOptional()
  @IsString()
  query?: string;

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
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'タグ配列', type: [String] })
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

  @ApiPropertyOptional({ description: 'ソート項目', enum: ['createdAt', 'updatedAt', 'orderIndex'] })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'orderIndex';

  @ApiPropertyOptional({ description: 'ソート順序', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'ページ番号', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '1ページあたりの件数', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * FAQ公開状態一括更新DTO
 */
export class BulkUpdateFAQPublishStatusDto {
  @ApiProperty({ description: 'FAQ ID配列', type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  ids: string[];

  @ApiProperty({ description: '公開状態' })
  @IsBoolean()
  isPublished: boolean;
}

/**
 * FAQ表示順序更新DTO
 */
export class UpdateFAQOrderDto {
  @ApiProperty({ description: 'FAQ順序更新配列', type: 'array', items: { type: 'object' } })
  @IsArray()
  @Type(() => FAQOrderItem)
  items: FAQOrderItem[];
}

export class FAQOrderItem {
  @ApiProperty({ description: 'FAQ ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: '表示順序', minimum: 0 })
  @IsInt()
  @Min(0)
  orderIndex: number;
}

/**
 * FAQレスポンスDTO
 */
export class FAQResponseDto {
  @ApiProperty({ description: 'FAQ ID' })
  id: string;

  @ApiProperty({ description: 'アプリケーションID' })
  appId: string;

  @ApiProperty({ description: '質問内容' })
  question: string;

  @ApiProperty({ description: '回答内容' })
  answer: string;

  @ApiProperty({ description: 'カテゴリ', nullable: true })
  category: string | null;

  @ApiProperty({ description: 'タグ配列', type: [String] })
  tags: string[];

  @ApiProperty({ description: '表示順序' })
  orderIndex: number;

  @ApiProperty({ description: '公開状態' })
  isPublished: boolean;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'アプリケーション情報' })
  application?: {
    id: string;
    name: string;
    description: string;
  };
}

/**
 * FAQ検索結果DTO
 */
export class FAQSearchResultDto {
  @ApiProperty({ description: 'FAQ配列', type: [FAQResponseDto] })
  items: FAQResponseDto[];

  @ApiProperty({ description: '総件数' })
  total: number;

  @ApiProperty({ description: '現在のページ' })
  page: number;

  @ApiProperty({ description: '1ページあたりの件数' })
  limit: number;

  @ApiProperty({ description: '総ページ数' })
  totalPages: number;
}

/**
 * FAQ統計DTO
 */
export class FAQStatisticsDto {
  @ApiProperty({ description: '総FAQ数' })
  total: number;

  @ApiProperty({ description: '公開済みFAQ数' })
  published: number;

  @ApiProperty({ description: '非公開FAQ数' })
  unpublished: number;

  @ApiProperty({ description: 'カテゴリ別統計', type: 'array', items: { type: 'object' } })
  categories: { category: string; count: number }[];
}

/**
 * FAQ自動生成オプションDTO
 * 要件: 6.1, 6.2 (問い合わせクラスタリングアルゴリズムの実装)
 */
export class FAQGenerationOptionsDto {
  @ApiProperty({ description: '最小クラスタサイズ', minimum: 2, maximum: 50, default: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(50)
  minClusterSize: number = 3;

  @ApiProperty({ description: '最大クラスタ数', minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxClusters: number = 20;

  @ApiProperty({ description: '類似度閾値', minimum: 0.1, maximum: 1.0, default: 0.7 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  similarityThreshold: number = 0.7;

  @ApiPropertyOptional({ description: '対象期間開始日' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  startDate?: Date;

  @ApiPropertyOptional({ description: '対象期間終了日' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  endDate?: Date;

  @ApiPropertyOptional({ description: '対象カテゴリ配列', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(category => category.trim());
    }
    return value;
  })
  categories?: string[];
}

/**
 * FAQクラスタレスポンスDTO
 * 要件: 6.2 (FAQ項目の自動生成とプレビュー機能)
 */
export class FAQClusterResponseDto {
  @ApiProperty({ description: 'クラスタID' })
  id: string;

  @ApiProperty({ description: '含まれる問い合わせID配列', type: [String] })
  inquiries: string[];

  @ApiProperty({ description: '代表的な質問' })
  representativeQuestion: string;

  @ApiProperty({ description: '提案回答' })
  suggestedAnswer: string;

  @ApiProperty({ description: 'カテゴリ', nullable: true })
  category?: string;

  @ApiProperty({ description: '信頼度', minimum: 0, maximum: 1 })
  confidence: number;
}

/**
 * FAQ自動生成結果DTO
 * 要件: 6.2 (FAQ項目の自動生成とプレビュー機能)
 */
export class FAQGenerationResultDto {
  @ApiProperty({ description: 'FAQ候補クラスタ配列', type: [FAQClusterResponseDto] })
  clusters: FAQClusterResponseDto[];

  @ApiProperty({ description: '統計情報' })
  statistics: {
    totalInquiries: number;
    clusteredInquiries: number;
    unclustered: number;
    generatedFAQs: number;
  };
}

/**
 * クラスタからFAQ作成リクエストDTO
 * 要件: 6.2 (FAQ項目の自動生成)
 */
export class CreateFAQFromClusterDto {
  @ApiProperty({ description: 'クラスタID' })
  @IsString()
  @IsNotEmpty()
  clusterId: string;

  @ApiPropertyOptional({ description: '公開状態', default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'カテゴリ（クラスタのカテゴリを上書き）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'タグ配列（クラスタのタグを上書き）', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * 複数クラスタからFAQ一括作成リクエストDTO
 * 要件: 6.2 (FAQ項目の自動生成)
 */
export class BulkCreateFAQFromClustersDto {
  @ApiProperty({ description: 'クラスタID配列', type: [String] })
  @IsArray()
  @IsString({ each: true })
  clusterIds: string[];

  @ApiPropertyOptional({ description: '公開状態', default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: '自動公開閾値（信頼度がこの値以上の場合は自動公開）', minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  autoPublishThreshold?: number;
}

/**
 * FAQ一括作成結果DTO
 * 要件: 6.2 (FAQ項目の自動生成)
 */
export class BulkCreateFAQResultDto {
  @ApiProperty({ description: '作成成功したFAQ配列', type: [FAQResponseDto] })
  created: FAQResponseDto[];

  @ApiProperty({ description: '作成失敗したクラスタ情報配列' })
  failed: {
    clusterId: string;
    error: string;
  }[];

  @ApiProperty({ description: '作成統計' })
  statistics: {
    total: number;
    success: number;
    failed: number;
  };
}