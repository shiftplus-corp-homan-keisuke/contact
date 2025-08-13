/**
 * 認証関連のDTO
 * 要件: 4.1, 4.2 (ユーザー管理機能)
 */

import { IsEmail, IsString, MinLength, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'メールアドレス', example: 'user@example.com' })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email: string;

  @ApiProperty({ description: 'パスワード', example: 'password123' })
  @IsString({ message: 'パスワードは文字列である必要があります' })
  @MinLength(8, { message: 'パスワードは8文字以上である必要があります' })
  password: string;
}

export class CreateUserDto {
  @ApiProperty({ description: 'メールアドレス', example: 'user@example.com' })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email: string;

  @ApiProperty({ description: 'パスワード', example: 'password123' })
  @IsString({ message: 'パスワードは文字列である必要があります' })
  @MinLength(8, { message: 'パスワードは8文字以上である必要があります' })
  password: string;

  @ApiProperty({ description: 'ユーザー名', example: '田中太郎' })
  @IsString({ message: 'ユーザー名は文字列である必要があります' })
  name: string;

  @ApiProperty({ description: '役割ID', example: 'uuid-string' })
  @IsUUID(4, { message: '有効な役割IDを指定してください' })
  roleId: string;

  @ApiPropertyOptional({ description: 'アクティブ状態', example: true, default: true })
  @IsOptional()
  @IsBoolean({ message: 'アクティブ状態はboolean値である必要があります' })
  isActive?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'メールアドレス', example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email?: string;

  @ApiPropertyOptional({ description: 'パスワード', example: 'password123' })
  @IsOptional()
  @IsString({ message: 'パスワードは文字列である必要があります' })
  @MinLength(8, { message: 'パスワードは8文字以上である必要があります' })
  password?: string;

  @ApiPropertyOptional({ description: 'ユーザー名', example: '田中太郎' })
  @IsOptional()
  @IsString({ message: 'ユーザー名は文字列である必要があります' })
  name?: string;

  @ApiPropertyOptional({ description: '役割ID', example: 'uuid-string' })
  @IsOptional()
  @IsUUID(4, { message: '有効な役割IDを指定してください' })
  roleId?: string;

  @ApiPropertyOptional({ description: 'アクティブ状態', example: true })
  @IsOptional()
  @IsBoolean({ message: 'アクティブ状態はboolean値である必要があります' })
  isActive?: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'ユーザー情報' })
  user: {
    id: string;
    email: string;
    name: string;
    role: {
      id: string;
      name: string;
      permissions: any[];
    };
  };

  @ApiProperty({ description: 'アクセストークン' })
  accessToken: string;

  @ApiProperty({ description: 'リフレッシュトークン' })
  refreshToken: string;

  @ApiProperty({ description: 'トークン有効期限（秒）' })
  expiresIn: number;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'リフレッシュトークン' })
  @IsString({ message: 'リフレッシュトークンは文字列である必要があります' })
  refreshToken: string;
}