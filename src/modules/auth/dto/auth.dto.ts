import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    IsUUID,
    IsOptional,
    Matches,
} from 'class-validator';

/**
 * ログインDTO
 */
export class LoginDto {
    @ApiProperty({
        description: 'メールアドレス',
        example: 'user@example.com',
    })
    @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
    email: string;

    @ApiProperty({
        description: 'パスワード',
        example: 'password123',
        minLength: 8,
    })
    @IsString()
    @MinLength(8, { message: 'パスワードは8文字以上である必要があります' })
    password: string;
}

/**
 * ユーザー登録DTO
 */
export class RegisterDto {
    @ApiProperty({
        description: 'メールアドレス',
        example: 'user@example.com',
    })
    @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
    email: string;

    @ApiProperty({
        description: 'ユーザー名',
        example: '田中太郎',
        minLength: 1,
        maxLength: 100,
    })
    @IsString()
    @MinLength(1, { message: 'ユーザー名は必須です' })
    @MaxLength(100, { message: 'ユーザー名は100文字以内で入力してください' })
    name: string;

    @ApiProperty({
        description: 'パスワード（8文字以上、英数字を含む）',
        example: 'Password123!',
        minLength: 8,
    })
    @IsString()
    @MinLength(8, { message: 'パスワードは8文字以上である必要があります' })
    @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
        message: 'パスワードは英字と数字を含む必要があります',
    })
    password: string;

    @ApiProperty({
        description: '役割ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    @IsOptional()
    @IsUUID(4, { message: '有効な役割IDを指定してください' })
    roleId?: string;
}

/**
 * リフレッシュトークンDTO
 */
export class RefreshTokenDto {
    @ApiProperty({
        description: 'リフレッシュトークン',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsString()
    refreshToken: string;
}

/**
 * パスワード変更DTO
 */
export class ChangePasswordDto {
    @ApiProperty({
        description: '現在のパスワード',
        example: 'currentPassword123',
    })
    @IsString()
    currentPassword: string;

    @ApiProperty({
        description: '新しいパスワード（8文字以上、英数字を含む）',
        example: 'NewPassword123!',
        minLength: 8,
    })
    @IsString()
    @MinLength(8, { message: 'パスワードは8文字以上である必要があります' })
    @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
        message: 'パスワードは英字と数字を含む必要があります',
    })
    newPassword: string;
}