/**
 * ユーザー管理関連のDTO
 * 要件: 4.1, 4.2 (ユーザー管理機能)
 */

import { IsEmail, IsString, IsUUID, IsBoolean, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'メールアドレス', example: 'user@example.com' })
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません' })
  @MaxLength(255, { message: 'メールアドレスは255文字以内で入力してください' })
  email: string;

  @ApiProperty({ description: 'パスワード', example: 'SecurePass123!' })
  @IsString({ message: 'パスワードは文字列で入力してください' })
  @MinLength(8, { message: 'パスワードは8文字以上で入力してください' })
  @MaxLength(128, { message: 'パスワードは128文字以内で入力してください' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'パスワードは大文字、小文字、数字、特殊文字を含む必要があります'
  })
  password: string;

  @ApiProperty({ description: 'ユーザー名', example: '田中太郎' })
  @IsString({ message: '名前は文字列で入力してください' })
  @MinLength(1, { message: '名前は必須項目です' })
  @MaxLength(255, { message: '名前は255文字以内で入力してください' })
  name: string;

  @ApiProperty({ description: '役割ID' })
  @IsUUID(4, { message: '役割IDは有効なUUIDである必要があります' })
  roleId: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'メールアドレス', example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません' })
  @MaxLength(255, { message: 'メールアドレスは255文字以内で入力してください' })
  email?: string;

  @ApiPropertyOptional({ description: 'ユーザー名', example: '田中太郎' })
  @IsOptional()
  @IsString({ message: '名前は文字列で入力してください' })
  @MinLength(1, { message: '名前は1文字以上で入力してください' })
  @MaxLength(255, { message: '名前は255文字以内で入力してください' })
  name?: string;

  @ApiPropertyOptional({ description: '役割ID' })
  @IsOptional()
  @IsUUID(4, { message: '役割IDは有効なUUIDである必要があります' })
  roleId?: string;

  @ApiPropertyOptional({ description: 'アクティブ状態', example: true })
  @IsOptional()
  @IsBoolean({ message: 'アクティブ状態はboolean値で入力してください' })
  isActive?: boolean;
}

export class LoginCredentialsDto {
  @ApiProperty({ description: 'メールアドレス', example: 'user@example.com' })
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません' })
  email: string;

  @ApiProperty({ description: 'パスワード', example: 'SecurePass123!' })
  @IsString({ message: 'パスワードは文字列で入力してください' })
  @MinLength(1, { message: 'パスワードは必須項目です' })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '現在のパスワード' })
  @IsString({ message: '現在のパスワードは文字列で入力してください' })
  currentPassword: string;

  @ApiProperty({ description: '新しいパスワード' })
  @IsString({ message: 'パスワードは文字列で入力してください' })
  @MinLength(8, { message: 'パスワードは8文字以上で入力してください' })
  @MaxLength(128, { message: 'パスワードは128文字以内で入力してください' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'パスワードは大文字、小文字、数字、特殊文字を含む必要があります'
  })
  newPassword: string;
}

export class UserResponseDto {
  @ApiProperty({ description: 'ユーザーID' })
  id: string;

  @ApiProperty({ description: 'メールアドレス' })
  email: string;

  @ApiProperty({ description: 'ユーザー名' })
  name: string;

  @ApiProperty({ description: '役割ID' })
  roleId: string;

  @ApiProperty({ description: 'アクティブ状態' })
  isActive: boolean;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;
}

export class UserHistoryResponseDto {
  @ApiProperty({ description: '履歴ID' })
  id: string;

  @ApiProperty({ description: 'フィールド名' })
  fieldName: string;

  @ApiProperty({ description: '変更前の値' })
  oldValue: string | null;

  @ApiProperty({ description: '変更後の値' })
  newValue: string;

  @ApiProperty({ description: '変更者ID' })
  changedBy: string;

  @ApiProperty({ description: '変更日時' })
  changedAt: Date;
}