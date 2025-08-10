/**
 * テンプレート関連DTO
 * 要件: 10.1, 10.2, 10.3 (テンプレート管理システム)
 */

import { IsString, IsOptional, IsBoolean, IsArray, IsInt, IsNumber, IsUUID, IsNotEmpty, MaxLength, Min, Max, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateVariableType, TemplateUsageContext, ValidationRule } from '../types/template.types';

/**
 * テンプレート作成リクエストDTO
 */
export class CreateTemplateDto {
  @ApiProperty({ description: 'テンプレート名', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'テンプレート内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'カテゴリ', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: '説明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'アプリケーションID' })
  @IsOptional()
  @IsUUID()
  appId?: string;

  @ApiPropertyOptional({ description: '共有フラグ', default: false })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiPropertyOptional({ description: 'タグ配列', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '変数定義', type: [Object] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables?: TemplateVariableDto[];
}

/**
 * テンプレート更新リクエストDTO
 */
export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'テンプレート名', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'テンプレート内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'カテゴリ', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: '説明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '共有フラグ' })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiPropertyOptional({ description: 'アクティブフラグ' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'タグ配列', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * テンプレート変数DTO
 */
export class TemplateVariableDto {
  @ApiProperty({ description: '変数名', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '変数タイプ', enum: TemplateVariableType })
  @IsEnum(TemplateVariableType)
  type: TemplateVariableType;

  @ApiPropertyOptional({ description: '説明', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: 'デフォルト値' })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ description: '必須フラグ', default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'オプション（select型の場合の選択肢など）' })
  @IsOptional()
  @IsObject()
  options?: any;

  @ApiPropertyOptional({ description: 'バリデーションルール', type: [Object] })
  @IsOptional()
  @IsArray()
  validationRules?: ValidationRule[];
}

/**
 * テンプレート検索リクエストDTO
 */
export class SearchTemplateDto {
  @ApiPropertyOptional({ description: '検索キーワード' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'カテゴリ' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'タグ配列', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'アプリケーションID' })
  @IsOptional()
  @IsUUID()
  appId?: string;

  @ApiPropertyOptional({ description: '作成者ID' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional({ description: '共有フラグ' })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiPropertyOptional({ description: 'アクティブフラグ' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ページ番号', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: '1ページあたりの件数', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

/**
 * テンプレート使用リクエストDTO
 */
export class UseTemplateDto {
  @ApiProperty({ description: 'テンプレートID' })
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: '変数値', type: Object })
  @IsObject()
  variables: Record<string, any>;

  @ApiPropertyOptional({ description: '使用コンテキスト', enum: TemplateUsageContext })
  @IsOptional()
  @IsEnum(TemplateUsageContext)
  context?: TemplateUsageContext;

  @ApiPropertyOptional({ description: '問い合わせID' })
  @IsOptional()
  @IsUUID()
  inquiryId?: string;

  @ApiPropertyOptional({ description: '回答ID' })
  @IsOptional()
  @IsUUID()
  responseId?: string;
}

/**
 * テンプレート提案リクエストDTO
 */
export class TemplateSuggestionDto {
  @ApiProperty({ description: '問い合わせ内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'カテゴリ' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'アプリケーションID' })
  @IsOptional()
  @IsUUID()
  appId?: string;

  @ApiPropertyOptional({ description: '提案数', minimum: 1, maximum: 10, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}

/**
 * テンプレート効果評価DTO
 */
export class TemplateEffectivenessDto {
  @ApiProperty({ description: 'テンプレート使用ID' })
  @IsUUID()
  @IsNotEmpty()
  usageId: string;

  @ApiProperty({ description: '効果評価（1-5）', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'フィードバックコメント' })
  @IsOptional()
  @IsString()
  comment?: string;
}

/**
 * テンプレートレスポンスDTO
 */
export class TemplateResponseDto {
  @ApiProperty({ description: 'テンプレートID' })
  id: string;

  @ApiProperty({ description: 'テンプレート名' })
  name: string;

  @ApiProperty({ description: 'テンプレート内容' })
  content: string;

  @ApiProperty({ description: 'カテゴリ' })
  category: string;

  @ApiProperty({ description: '説明' })
  description: string;

  @ApiProperty({ description: 'アプリケーションID' })
  appId: string;

  @ApiProperty({ description: '作成者ID' })
  createdBy: string;

  @ApiProperty({ description: '共有フラグ' })
  isShared: boolean;

  @ApiProperty({ description: 'アクティブフラグ' })
  isActive: boolean;

  @ApiProperty({ description: '使用回数' })
  usageCount: number;

  @ApiProperty({ description: '効果スコア' })
  effectivenessScore: number;

  @ApiProperty({ description: 'タグ配列', type: [String] })
  tags: string[];

  @ApiProperty({ description: '最終使用日時' })
  lastUsedAt: Date;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;

  @ApiProperty({ description: '変数定義', type: [TemplateVariableDto] })
  variables: TemplateVariableDto[];
}

/**
 * テンプレート使用結果DTO
 */
export class TemplateUsageResultDto {
  @ApiProperty({ description: '生成されたコンテンツ' })
  content: string;

  @ApiProperty({ description: '使用された変数' })
  variables: Record<string, any>;

  @ApiProperty({ description: '使用履歴ID' })
  usageId: string;

  @ApiProperty({ description: 'エラー配列', type: [Object] })
  errors: any[];
}

/**
 * テンプレート統計DTO
 */
export class TemplateStatisticsDto {
  @ApiProperty({ description: '総使用回数' })
  totalUsage: number;

  @ApiProperty({ description: '平均効果スコア' })
  averageEffectiveness: number;

  @ApiProperty({ description: '人気変数統計', type: [Object] })
  popularVariables: any[];

  @ApiProperty({ description: 'コンテキスト別使用統計' })
  usageByContext: Record<string, number>;

  @ApiProperty({ description: 'ユーザー別使用統計', type: [Object] })
  usageByUser: any[];

  @ApiProperty({ description: '使用トレンドデータ', type: [Object] })
  usageTrend: any[];
}