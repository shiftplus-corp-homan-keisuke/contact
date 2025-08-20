import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsArray,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsUUID,
    IsDateString,
    MinLength,
    MaxLength,
    Min,
    Max,
} from 'class-validator';

/**
 * APIキー作成DTO
 */
export class CreateApiKeyDto {
    @ApiProperty({
        description: 'アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID(4, { message: '有効なアプリケーションIDを指定してください' })
    appId: string;

    @ApiProperty({
        description: 'APIキー名',
        example: 'モバイルアプリ用APIキー',
    })
    @IsString()
    @MinLength(1, { message: 'APIキー名は必須です' })
    @MaxLength(255, { message: 'APIキー名は255文字以内で入力してください' })
    name: string;

    @ApiProperty({
        description: 'APIキーの説明',
        example: 'モバイルアプリからの問い合わせ登録用',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500, { message: '説明は500文字以内で入力してください' })
    description?: string;

    @ApiProperty({
        description: '権限リスト',
        example: ['inquiry:create', 'inquiry:read'],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    permissions: string[];

    @ApiProperty({
        description: '1時間あたりのリクエスト制限数',
        example: 1000,
        minimum: 1,
        maximum: 10000,
    })
    @IsNumber()
    @Min(1, { message: 'リクエスト制限数は1以上である必要があります' })
    @Max(10000, { message: 'リクエスト制限数は10000以下である必要があります' })
    rateLimitPerHour: number;

    @ApiProperty({
        description: 'バースト制限（短時間での最大リクエスト数）',
        example: 100,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(1, { message: 'バースト制限は1以上である必要があります' })
    burstLimit?: number;

    @ApiProperty({
        description: '有効期限',
        example: '2024-12-31T23:59:59Z',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    expiresAt?: Date;

    @ApiProperty({
        description: '許可IPアドレス（CIDR形式）',
        example: '192.168.1.0/24',
        required: false,
    })
    @IsOptional()
    @IsString()
    allowedIpAddress?: string;

    @ApiProperty({
        description: '許可リファラー',
        example: 'https://example.com',
        required: false,
    })
    @IsOptional()
    @IsString()
    allowedReferer?: string;

    @ApiProperty({
        description: '作成者ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
        required: false,
    })
    @IsOptional()
    @IsUUID(4)
    createdBy?: string;
}

/**
 * APIキー更新DTO
 */
export class UpdateApiKeyDto {
    @ApiProperty({
        description: 'APIキー名',
        example: 'モバイルアプリ用APIキー（更新版）',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'APIキー名は必須です' })
    @MaxLength(255, { message: 'APIキー名は255文字以内で入力してください' })
    name?: string;

    @ApiProperty({
        description: 'APIキーの説明',
        example: 'モバイルアプリからの問い合わせ登録用（更新版）',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500, { message: '説明は500文字以内で入力してください' })
    description?: string;

    @ApiProperty({
        description: '権限リスト',
        example: ['inquiry:create', 'inquiry:read', 'faq:read'],
        type: [String],
        required: false,
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @ApiProperty({
        description: '1時間あたりのリクエスト制限数',
        example: 2000,
        minimum: 1,
        maximum: 10000,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(1, { message: 'リクエスト制限数は1以上である必要があります' })
    @Max(10000, { message: 'リクエスト制限数は10000以下である必要があります' })
    rateLimitPerHour?: number;

    @ApiProperty({
        description: 'バースト制限（短時間での最大リクエスト数）',
        example: 200,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(1, { message: 'バースト制限は1以上である必要があります' })
    burstLimit?: number;

    @ApiProperty({
        description: 'アクティブフラグ',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: '有効期限',
        example: '2025-12-31T23:59:59Z',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    expiresAt?: Date;

    @ApiProperty({
        description: '許可IPアドレス（CIDR形式）',
        example: '192.168.1.0/24',
        required: false,
    })
    @IsOptional()
    @IsString()
    allowedIpAddress?: string;

    @ApiProperty({
        description: '許可リファラー',
        example: 'https://example.com',
        required: false,
    })
    @IsOptional()
    @IsString()
    allowedReferer?: string;
}

/**
 * APIキー使用統計取得DTO
 */
export class GetUsageStatsDto {
    @ApiProperty({
        description: '統計期間（日数）',
        example: 30,
        minimum: 1,
        maximum: 365,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(1, { message: '統計期間は1日以上である必要があります' })
    @Max(365, { message: '統計期間は365日以下である必要があります' })
    days?: number = 30;
}