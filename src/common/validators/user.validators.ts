/**
 * ユーザー関連のバリデーション関数
 * 要件: 4.1, 4.2 (ユーザー管理機能)
 */

import { IsEmail, IsString, IsUUID, IsBoolean, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { CreateUserRequest, UpdateUserRequest, LoginCredentials } from '../types/user.types';

export class CreateUserDto implements CreateUserRequest {
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません' })
  @MaxLength(255, { message: 'メールアドレスは255文字以内で入力してください' })
  email: string;

  @IsString({ message: 'パスワードは文字列で入力してください' })
  @MinLength(8, { message: 'パスワードは8文字以上で入力してください' })
  @MaxLength(128, { message: 'パスワードは128文字以内で入力してください' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'パスワードは大文字、小文字、数字、特殊文字を含む必要があります'
  })
  password: string;

  @IsString({ message: '名前は文字列で入力してください' })
  @MinLength(1, { message: '名前は必須項目です' })
  @MaxLength(255, { message: '名前は255文字以内で入力してください' })
  name: string;

  @IsUUID(4, { message: '役割IDは有効なUUIDである必要があります' })
  roleId: string;
}

export class UpdateUserDto implements UpdateUserRequest {
  @IsOptional()
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません' })
  @MaxLength(255, { message: 'メールアドレスは255文字以内で入力してください' })
  email?: string;

  @IsOptional()
  @IsString({ message: '名前は文字列で入力してください' })
  @MinLength(1, { message: '名前は1文字以上で入力してください' })
  @MaxLength(255, { message: '名前は255文字以内で入力してください' })
  name?: string;

  @IsOptional()
  @IsUUID(4, { message: '役割IDは有効なUUIDである必要があります' })
  roleId?: string;

  @IsOptional()
  @IsBoolean({ message: 'アクティブ状態はboolean値で入力してください' })
  isActive?: boolean;
}

export class LoginCredentialsDto implements LoginCredentials {
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません' })
  email: string;

  @IsString({ message: 'パスワードは文字列で入力してください' })
  @MinLength(1, { message: 'パスワードは必須項目です' })
  password: string;
}

// バリデーション関数
export function validateEmail(email: string): boolean {
  if (!email || email.trim().length === 0) {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // 基本的な形式チェック
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // 連続するドットのチェック
  if (email.includes('..')) {
    return false;
  }
  
  // @マークの前後が空でないかチェック
  const parts = email.split('@');
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    return false;
  }
  
  return true;
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります');
  }
  
  if (password.length > 128) {
    errors.push('パスワードは128文字以内である必要があります');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('パスワードには小文字を含む必要があります');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('パスワードには大文字を含む必要があります');
  }
  
  if (!/\d/.test(password)) {
    errors.push('パスワードには数字を含む必要があります');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('パスワードには特殊文字(@$!%*?&)を含む必要があります');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateUserName(name: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('名前は必須項目です');
  }
  
  if (name.length > 255) {
    errors.push('名前は255文字以内で入力してください');
  }
  
  // 不正な文字のチェック
  if (/[<>\"'&]/.test(name)) {
    errors.push('名前に使用できない文字が含まれています');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}