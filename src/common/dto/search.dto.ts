/**
 * 検索・フィルタリング関連のDTO
 * 要件: 8.1, 8.2, 8.4 (検索・フィルタリング機能)
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsEnum, IsUUID, IsDateString, IsIn } from 'class-validator';
import { InquiryStatus, InquiryPriority } from '../types/inquiry.types';
import { PaginationDto } from './pagination.dto';

export class SearchInquiriesDto extends PaginationDto {
  @ApiPropertyOptional({ 
    description: '検索クエリ（タイトル・内容を全文検索）',
    example: 'ログイン エラー'
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ 
    description: 'アプリケーションID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID('4', { message: '有効なアプリケーションIDを指定してください' })
  appId?: string;

  @ApiPropertyOptional({ 
    description: '状態フィルター（複数指定可能）',
    enum: InquiryStatus,
    isArray: true,
    example: ['new', 'in_progress']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InquiryStatus, { each: true, message: '有効な状態を指定してください' })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  status?: InquiryStatus[];

  @ApiPropertyOptional({ 
    description: 'カテゴリフィルター（複数指定可能）',
    isArray: true,
    example: ['技術的問題', 'アカウント関連']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  category?: string[];

  @ApiPropertyOptional({ 
    description: '優先度フィルター（複数指定可能）',
    enum: InquiryPriority,
    isArray: true,
    example: ['high', 'urgent']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InquiryPriority, { each: true, message: '有効な優先度を指定してください' })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  priority?: InquiryPriority[];

  @ApiPropertyOptional({ 
    description: '担当者ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID('4', { message: '有効な担当者IDを指定してください' })
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: '顧客メールアドレス',
    example: 'customer@example.com'
  })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ 
    description: '開始日（YYYY-MM-DD形式）',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString({}, { message: '有効な日付形式（YYYY-MM-DD）で入力してください' })
  startDate?: string;

  @ApiPropertyOptional({ 
    description: '終了日（YYYY-MM-DD形式）',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString({}, { message: '有効な日付形式（YYYY-MM-DD）で入力してください' })
  endDate?: string;

  @ApiPropertyOptional({ 
    description: 'ソート項目',
    enum: ['createdAt', 'updatedAt', 'title', 'priority', 'status'],
    default: 'createdAt'
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'title', 'priority', 'status'], {
    message: '有効なソート項目を指定してください'
  })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ 
    description: 'ソート順',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'ソート順はascまたはdescを指定してください' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SearchResultDto<T> {
  @ApiPropertyOptional({ description: '検索結果' })
  items: T[];

  @ApiPropertyOptional({ description: '総件数' })
  total: number;

  @ApiPropertyOptional({ description: '現在のページ' })
  page: number;

  @ApiPropertyOptional({ description: '1ページあたりの件数' })
  limit: number;

  @ApiPropertyOptional({ description: '総ページ数' })
  totalPages: number;

  @ApiPropertyOptional({ description: '検索クエリ' })
  query?: string;

  @ApiPropertyOptional({ description: '適用されたフィルター' })
  appliedFilters?: Record<string, any>;

  @ApiPropertyOptional({ description: '検索実行時間（ミリ秒）' })
  executionTime?: number;
}