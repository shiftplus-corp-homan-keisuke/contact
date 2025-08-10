/**
 * 回答関連のバリデーション関数
 * 要件: 2.1, 2.3, 2.4 (問い合わせ・回答管理機能)
 */

import { IsString, IsUUID, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';
import { CreateResponseRequest, UpdateResponseRequest, ResponseData } from '../types/response.types';

export class CreateResponseDto implements CreateResponseRequest {
  @IsUUID(4, { message: '問い合わせIDは有効なUUIDである必要があります' })
  inquiryId: string;

  @IsString({ message: '回答内容は文字列で入力してください' })
  @MinLength(1, { message: '回答内容は必須項目です' })
  @MaxLength(50000, { message: '回答内容は50000文字以内で入力してください' })
  content: string;

  @IsOptional()
  @IsBoolean({ message: '公開設定はboolean値で入力してください' })
  isPublic?: boolean;
}

export class UpdateResponseDto implements UpdateResponseRequest {
  @IsOptional()
  @IsString({ message: '回答内容は文字列で入力してください' })
  @MinLength(1, { message: '回答内容は1文字以上で入力してください' })
  @MaxLength(50000, { message: '回答内容は50000文字以内で入力してください' })
  content?: string;

  @IsOptional()
  @IsBoolean({ message: '公開設定はboolean値で入力してください' })
  isPublic?: boolean;
}

export class ResponseDataDto implements ResponseData {
  @IsString({ message: '回答内容は文字列で入力してください' })
  @MinLength(1, { message: '回答内容は必須項目です' })
  @MaxLength(50000, { message: '回答内容は50000文字以内で入力してください' })
  content: string;

  @IsOptional()
  @IsBoolean({ message: '公開設定はboolean値で入力してください' })
  isPublic?: boolean;
}

// バリデーション関数
export function validateResponseContent(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!content || content.trim().length === 0) {
    errors.push('回答内容は必須項目です');
  }
  
  if (content.length > 50000) {
    errors.push('回答内容は50000文字以内で入力してください');
  }
  
  // 最小文字数チェック
  if (content.trim().length < 5) {
    errors.push('回答内容は5文字以上で入力してください');
  }
  
  // 不適切なコンテンツの基本チェック
  const inappropriatePatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];
  
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(content)) {
      errors.push('回答内容に不適切なコンテンツが含まれています');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateResponseUpdate(updates: UpdateResponseRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 少なくとも一つのフィールドが更新される必要がある
  if (!updates.content && updates.isPublic === undefined) {
    errors.push('更新する項目を指定してください');
  }
  
  // 内容が指定されている場合のバリデーション
  if (updates.content !== undefined) {
    const contentValidation = validateResponseContent(updates.content);
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function sanitizeResponseContent(content: string): string {
  // 基本的なHTMLエスケープ
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateResponsePermissions(userId: string, responseUserId: string, userRole: string): { canEdit: boolean; canDelete: boolean; reason?: string } {
  // 管理者は全ての回答を編集・削除可能
  if (userRole === 'admin') {
    return { canEdit: true, canDelete: true };
  }
  
  // 作成者は自分の回答を編集・削除可能
  if (userId === responseUserId) {
    return { canEdit: true, canDelete: true };
  }
  
  // サポート担当者は他の回答を編集可能だが削除は不可
  if (userRole === 'support_staff') {
    return { canEdit: true, canDelete: false, reason: 'サポート担当者は他のユーザーの回答を削除できません' };
  }
  
  // その他のユーザーは編集・削除不可
  return { canEdit: false, canDelete: false, reason: '権限がありません' };
}