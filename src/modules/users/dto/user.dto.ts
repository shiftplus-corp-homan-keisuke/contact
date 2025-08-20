import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsString,
    IsUUID,
    IsOptional,
    IsBoolean,
    MinLength,
    MaxLength,
} from 'class-validator';

/**
 * ユーザー作成DTO
 */
export class CreateUserDto {
    @ApiProperty({
        description: 'メールアドレス',
        example: 'user@example.com',
    })
    @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
    email: string;

    @ApiProperty({
        description: 'ユーザー名',
        example: '田中太郎',
    })
    @IsString()
    @MinLength(1, { message: 'ユーザー名は必須です' })
    @MaxLength(255, { message: 'ユーザー名は255文字以内で入力してください' })
    name: string;

    @ApiProperty({
        description: 'パスワードハッシュ',
        example: '$2b$12$...',
    })
    @IsString()
    passwordHash: string;

    @ApiProperty({
        description: '役割ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID(4, { message: '有効な役割IDを指定してください' })
    roleId: string;

    @ApiProperty({
        description: 'アクティブフラグ',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: '電話番号',
        example: '090-1234-5678',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(20, { message: '電話番号は20文字以内で入力してください' })
    phoneNumber?: string;

    @ApiProperty({
        description: '部署名',
        example: '開発部',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100, { message: '部署名は100文字以内で入力してください' })
    department?: string;

    @ApiProperty({
        description: '役職',
        example: 'エンジニア',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100, { message: '役職は100文字以内で入力してください' })
    position?: string;
}

/**
 * ユーザー更新DTO
 */
export class UpdateUserDto {
    @ApiProperty({
        description: 'メールアドレス',
        example: 'user@example.com',
        required: false,
    })
    @IsOptional()
    @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
    email?: string;

    @ApiProperty({
        description: 'ユーザー名',
        example: '田中太郎',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'ユーザー名は必須です' })
    @MaxLength(255, { message: 'ユーザー名は255文字以内で入力してください' })
    name?: string;

    @ApiProperty({
        description: '役割ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    @IsOptional()
    @IsUUID(4, { message: '有効な役割IDを指定してください' })
    roleId?: string;

    @ApiProperty({
        description: 'アクティブフラグ',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: 'プロフィール画像URL',
        example: 'https://example.com/avatar.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'プロフィール画像URLは255文字以内で入力してください' })
    profileImageUrl?: string;

    @ApiProperty({
        description: '電話番号',
        example: '090-1234-5678',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(20, { message: '電話番号は20文字以内で入力してください' })
    phoneNumber?: string;

    @ApiProperty({
        description: '部署名',
        example: '開発部',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100, { message: '部署名は100文字以内で入力してください' })
    department?: string;

    @ApiProperty({
        description: '役職',
        example: 'エンジニア',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100, { message: '役職は100文字以内で入力してください' })
    position?: string;
}