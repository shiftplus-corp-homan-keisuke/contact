/**
 * 問い合わせ作成DTO
 * 要件1.1, 1.3, 1.4: 問い合わせ登録機能に対応
 */

import {
    IsString,
    IsNotEmpty,
    IsUUID,
    IsOptional,
    IsEmail,
    IsEnum,
    MaxLength,
    IsArray,
    ValidateNested,
    IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryPriority } from '../entities/inquiry.entity';

export class CreateInquiryDto {
    @ApiProperty({
        description: '問い合わせタイトル',
        example: 'ログインできない問題について',
        maxLength: 500
    })
    @IsString({ message: 'タイトルは文字列である必要があります' })
    @IsNotEmpty({ message: 'タイトルは必須項目です' })
    @MaxLength(500, { message: 'タイトルは500文字以内で入力してください' })
    title: string;

    @ApiProperty({
        description: '問い合わせ内容',
        example: 'ログイン画面でメールアドレスとパスワードを入力してもエラーが表示されます。'
    })
    @IsString({ message: '内容は文字列である必要があります' })
    @IsNotEmpty({ message: '内容は必須項目です' })
    content: string;

    @ApiProperty({
        description: '対象アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @IsUUID('4', { message: '対象アプリIDは有効なUUIDである必要があります' })
    @IsNotEmpty({ message: '対象アプリIDは必須項目です' })
    appId: string;

    @ApiPropertyOptional({
        description: '顧客メールアドレス',
        example: 'customer@example.com'
    })
    @IsOptional()
    @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
    customerEmail?: string;

    @ApiPropertyOptional({
        description: '顧客名',
        example: '田中太郎',
        maxLength: 255
    })
    @IsOptional()
    @IsString({ message: '顧客名は文字列である必要があります' })
    @MaxLength(255, { message: '顧客名は255文字以内で入力してください' })
    customerName?: string;

    @ApiPropertyOptional({
        description: 'カテゴリ',
        example: '技術的問題',
        maxLength: 100
    })
    @IsOptional()
    @IsString({ message: 'カテゴリは文字列である必要があります' })
    @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
    category?: string;

    @ApiPropertyOptional({
        description: '優先度',
        enum: ['low', 'medium', 'high', 'urgent'],
        example: 'medium'
    })
    @IsOptional()
    @IsEnum(['low', 'medium', 'high', 'urgent'], {
        message: '優先度はlow, medium, high, urgentのいずれかである必要があります'
    })
    priority?: InquiryPriority;

    @ApiPropertyOptional({
        description: 'タグ',
        example: ['ログイン', 'エラー'],
        type: [String]
    })
    @IsOptional()
    @IsArray({ message: 'タグは配列である必要があります' })
    @IsString({ each: true, message: 'タグの各要素は文字列である必要があります' })
    tags?: string[];

    @ApiPropertyOptional({
        description: 'メタデータ（追加情報）',
        example: { browser: 'Chrome', version: '120.0.0.0' }
    })
    @IsOptional()
    @IsObject({ message: 'メタデータはオブジェクトである必要があります' })
    metadata?: Record<string, any>;
}