/**
 * 問い合わせ関連のバリデーション関数
 * 要件: 1.1, 1.3, 1.4 (問い合わせ登録機能)
 */

import { IsString, IsUUID, IsEmail, IsOptional, IsEnum, MinLength, MaxLength, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { INQUIRY_STATUS, PRIORITY } from '../constants/inquiry.constants';

export class CreateInquiryDto {
  @IsString({ message: 'タイトルは文字列で入力してください' })
  @MinLength(1, { message: 'タイトルは必須項目です' })
  @MaxLength(500, { message: 'タイトルは500文字以内で入力してください' })
  title: string;

  @IsString({ message: '内容は文字列で入力してください' })
  @MinLength(1, { message: '内容は必須項目です' })
  @MaxLength(10000, { message: '内容は10000文字以内で入力してください' })
  content: string;

  @IsUUID(4, { message: 'アプリIDは有効なUUIDである必要があります' })
  appId: string;

  @IsOptional()
  @IsEmail({}, { message: '顧客メールアドレスの形式が正しくありません' })
  @MaxLength(255, { message: '顧客メールアドレスは255文字以内で入力してください' })
  customerEmail?: string;

  @IsOptional()
  @IsString({ message: '顧客名は文字列で入力してください' })
  @MaxLength(255, { message: '顧客名は255文字以内で入力してください' })
  customerName?: string;

  @IsOptional()
  @IsString({ message: 'カテゴリは文字列で入力してください' })
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  category?: string;

  @IsOptional()
  @IsEnum(PRIORITY, { message: '優先度は有効な値を選択してください' })
  priority?: string;
}

export class UpdateInquiryDto {
  @IsOptional()
  @IsString({ message: 'タイトルは文字列で入力してください' })
  @MinLength(1, { message: 'タイトルは1文字以上で入力してください' })
  @MaxLength(500, { message: 'タイトルは500文字以内で入力してください' })
  title?: string;

  @IsOptional()
  @IsString({ message: '内容は文字列で入力してください' })
  @MinLength(1, { message: '内容は1文字以上で入力してください' })
  @MaxLength(10000, { message: '内容は10000文字以内で入力してください' })
  content?: string;

  @IsOptional()
  @IsString({ message: 'カテゴリは文字列で入力してください' })
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  category?: string;

  @IsOptional()
  @IsEnum(PRIORITY, { message: '優先度は有効な値を選択してください' })
  priority?: string;

  @IsOptional()
  @IsUUID(4, { message: '担当者IDは有効なUUIDである必要があります' })
  assignedTo?: string;
}

export class SearchCriteriaDto {
  @IsOptional()
  @IsString({ message: '検索クエリは文字列で入力してください' })
  @MaxLength(1000, { message: '検索クエリは1000文字以内で入力してください' })
  query?: string;

  @IsOptional()
  @IsString({ message: 'ソート項目は文字列で入力してください' })
  sortBy?: string;

  @IsOptional()
  @IsString({ message: 'ソート順は文字列で入力してください' })
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'ページ番号は整数で入力してください' })
  @Min(1, { message: 'ページ番号は1以上である必要があります' })
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '取得件数は整数で入力してください' })
  @Min(1, { message: '取得件数は1以上である必要があります' })
  @Max(100, { message: '取得件数は100以下である必要があります' })
  limit?: number;
}

// バリデーション関数
export function validateInquiryTitle(title: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('タイトルは必須項目です');
  }
  
  if (title.length > 500) {
    errors.push('タイトルは500文字以内で入力してください');
  }
  
  // HTMLタグの検出
  if (/<[^>]*>/g.test(title)) {
    errors.push('タイトルにHTMLタグは使用できません');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateInquiryContent(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!content || content.trim().length === 0) {
    errors.push('内容は必須項目です');
  }
  
  if (content.length > 10000) {
    errors.push('内容は10000文字以内で入力してください');
  }
  
  // 最小文字数チェック
  if (content.trim().length < 10) {
    errors.push('内容は10文字以上で入力してください');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateInquiryPriority(priority: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validPriorities = Object.values(PRIORITY);
  
  if (priority && !validPriorities.includes(priority as any)) {
    errors.push(`優先度は次の値から選択してください: ${validPriorities.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateInquiryStatus(status: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validStatuses = Object.values(INQUIRY_STATUS);
  
  if (status && !validStatuses.includes(status as any)) {
    errors.push(`ステータスは次の値から選択してください: ${validStatuses.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateSearchQuery(query: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (query && query.length > 1000) {
    errors.push('検索クエリは1000文字以内で入力してください');
  }
  
  // SQLインジェクション対策の基本チェック
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(--|\/\*|\*\/)/,
    /(\b(OR|AND)\b.*=.*)/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      errors.push('検索クエリに不正な文字列が含まれています');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}