/**
 * FAQ関連のバリデーション関数
 * 要件: 6.1, 6.2, 6.3, 6.4 (FAQ生成機能)
 */

import { IsString, IsUUID, IsBoolean, IsOptional, IsArray, IsInt, IsNumber, MinLength, MaxLength, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateFAQRequest, UpdateFAQRequest, FAQGenerationOptions } from '../types/faq.types';

export class CreateFAQDto implements CreateFAQRequest {
  @IsUUID(4, { message: 'アプリIDは有効なUUIDである必要があります' })
  appId: string;

  @IsString({ message: '質問は文字列で入力してください' })
  @MinLength(1, { message: '質問は必須項目です' })
  @MaxLength(1000, { message: '質問は1000文字以内で入力してください' })
  question: string;

  @IsString({ message: '回答は文字列で入力してください' })
  @MinLength(1, { message: '回答は必須項目です' })
  @MaxLength(10000, { message: '回答は10000文字以内で入力してください' })
  answer: string;

  @IsOptional()
  @IsString({ message: 'カテゴリは文字列で入力してください' })
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  category?: string;

  @IsOptional()
  @IsArray({ message: 'タグは配列で入力してください' })
  @IsString({ each: true, message: 'タグは文字列の配列で入力してください' })
  tags?: string[];

  @IsOptional()
  @IsBoolean({ message: '公開設定はboolean値で入力してください' })
  isPublished?: boolean;
}

export class UpdateFAQDto implements UpdateFAQRequest {
  @IsOptional()
  @IsString({ message: '質問は文字列で入力してください' })
  @MinLength(1, { message: '質問は1文字以上で入力してください' })
  @MaxLength(1000, { message: '質問は1000文字以内で入力してください' })
  question?: string;

  @IsOptional()
  @IsString({ message: '回答は文字列で入力してください' })
  @MinLength(1, { message: '回答は1文字以上で入力してください' })
  @MaxLength(10000, { message: '回答は10000文字以内で入力してください' })
  answer?: string;

  @IsOptional()
  @IsString({ message: 'カテゴリは文字列で入力してください' })
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  category?: string;

  @IsOptional()
  @IsArray({ message: 'タグは配列で入力してください' })
  @IsString({ each: true, message: 'タグは文字列の配列で入力してください' })
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '表示順は整数で入力してください' })
  @Min(0, { message: '表示順は0以上である必要があります' })
  orderIndex?: number;

  @IsOptional()
  @IsBoolean({ message: '公開設定はboolean値で入力してください' })
  isPublished?: boolean;
}

export class FAQGenerationOptionsDto implements FAQGenerationOptions {
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '最小クラスタサイズは整数で入力してください' })
  @Min(2, { message: '最小クラスタサイズは2以上である必要があります' })
  @Max(50, { message: '最小クラスタサイズは50以下である必要があります' })
  minClusterSize: number;

  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '最大クラスタ数は整数で入力してください' })
  @Min(1, { message: '最大クラスタ数は1以上である必要があります' })
  @Max(100, { message: '最大クラスタ数は100以下である必要があります' })
  maxClusters: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: '類似度閾値は数値で入力してください' })
  @Min(0.1, { message: '類似度閾値は0.1以上である必要があります' })
  @Max(1.0, { message: '類似度閾値は1.0以下である必要があります' })
  similarityThreshold: number;

  @IsOptional()
  @IsArray({ message: 'カテゴリは配列で入力してください' })
  @IsString({ each: true, message: 'カテゴリは文字列の配列で入力してください' })
  categories?: string[];
}

// バリデーション関数
export function validateFAQQuestion(question: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!question || question.trim().length === 0) {
    errors.push('質問は必須項目です');
  }
  
  if (question.length > 1000) {
    errors.push('質問は1000文字以内で入力してください');
  }
  
  // 質問として適切かチェック
  if (question.trim().length < 5) {
    errors.push('質問は5文字以上で入力してください');
  }
  
  // 疑問符の存在チェック（推奨）
  if (!question.includes('?') && !question.includes('？') && !question.includes('ですか') && !question.includes('でしょうか')) {
    // 警告レベル（エラーではない）
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateFAQAnswer(answer: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!answer || answer.trim().length === 0) {
    errors.push('回答は必須項目です');
  }
  
  if (answer.length > 10000) {
    errors.push('回答は10000文字以内で入力してください');
  }
  
  if (answer.trim().length < 10) {
    errors.push('回答は10文字以上で入力してください');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateFAQTags(tags: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (tags && tags.length > 10) {
    errors.push('タグは10個以下で入力してください');
  }
  
  if (tags) {
    for (const tag of tags) {
      if (tag.length > 50) {
        errors.push('各タグは50文字以内で入力してください');
        break;
      }
      
      if (tag.trim().length === 0) {
        errors.push('空のタグは指定できません');
        break;
      }
    }
    
    // 重複チェック
    const uniqueTags = new Set(tags.map(tag => tag.toLowerCase()));
    if (uniqueTags.size !== tags.length) {
      errors.push('重複するタグは指定できません');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateFAQCategory(category: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (category && category.length > 100) {
    errors.push('カテゴリは100文字以内で入力してください');
  }
  
  if (category && category.trim().length === 0) {
    errors.push('カテゴリが指定されている場合は空文字列にできません');
  }
  
  // 不正な文字のチェック
  if (category && /[<>\"'&]/.test(category)) {
    errors.push('カテゴリに使用できない文字が含まれています');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateFAQGenerationOptions(options: FAQGenerationOptions): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (options.minClusterSize >= options.maxClusters) {
    errors.push('最小クラスタサイズは最大クラスタ数より小さい必要があります');
  }
  
  if (options.similarityThreshold < 0.1 || options.similarityThreshold > 1.0) {
    errors.push('類似度閾値は0.1から1.0の間で指定してください');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}