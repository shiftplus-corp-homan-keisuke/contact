/**
 * 問い合わせ更新DTO
 * 要件1.1, 1.3, 1.4: 問い合わせ更新機能に対応
 */

import {
    IsString,
    IsOptional,
    IsUUID,
    IsEmail,
    IsEnum,
    MaxLength,
    IsArray,
    IsObject
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryPriority, InquiryStatus } from '../entities/inquiry.entity';

export class UpdateInquiryDto {
    @ApiPropertyOptional({
        description: '問い合わせタイトル',
        example: 'ログインできない問題について（更新）',
        maxLength: 500
    })
    @IsOptional()
    @IsString({ message: 'タイトルは文字列である必要があります' })
    @MaxLength(500, { message: 'タイトルは500文字以内で入力してください' })
    title?: string;

    @ApiPropertyOptional({
        description: '問い合わせ内容',
        example: 'ログイン画面でメールアドレスとパスワードを入力してもエラーが表示されます。（追加情報あり）'
    })
    @IsOptional()
    @IsString({ message: '内容は文字列である必要があります' })
    content?: string;

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
        example: 'high'
    })
    @IsOptional()
    @IsEnum(['low', 'medium', 'high', 'urgent'], {
        message: '優先度はlow, medium, high, urgentのいずれかである必要があります'
    })
    priority?: InquiryPriority;

    @ApiPropertyOptional({
        description: '担当者ID',
        example: '550e8400-e29b-41d4-a716-446655440001'
    })
    @IsOptional()
    @IsUUID('4', { message: '担当者IDは有効なUUIDである必要があります' })
    assignedTo?: string;

    @ApiPropertyOptional({
        description: 'タグ',
        example: ['ログイン', 'エラー', '緊急'],
        type: [String]
    })
    @IsOptional()
    @IsArray({ message: 'タグは配列である必要があります' })
    @IsString({ each: true, message: 'タグの各要素は文字列である必要があります' })
    tags?: string[];

    @ApiPropertyOptional({
        description: 'メタデータ（追加情報）',
        example: { browser: 'Chrome', version: '120.0.0.0', resolved: false }
    })
    @IsOptional()
    @IsObject({ message: 'メタデータはオブジェクトである必要があります' })
    metadata?: Record<string, any>;
}

/**
 * 問い合わせ状態更新DTO
 * 要件2.2, 2.3: 状態管理機能に対応
 */
export class UpdateInquiryStatusDto {
    @ApiPropertyOptional({
        description: '問い合わせ状態',
        enum: ['new', 'in_progress', 'pending', 'resolved', 'closed'],
        example: 'in_progress'
    })
    @IsEnum(['new', 'in_progress', 'pending', 'resolved', 'closed'], {
        message: '状態はnew, in_progress, pending, resolved, closedのいずれかである必要があります'
    })
    status: InquiryStatus;

    @ApiPropertyOptional({
        description: '状態変更理由・コメント',
        example: '調査を開始しました'
    })
    @IsOptional()
    @IsString({ message: 'コメントは文字列である必要があります' })
    comment?: string;
}