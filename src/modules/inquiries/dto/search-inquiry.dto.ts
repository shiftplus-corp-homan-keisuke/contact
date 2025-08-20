/**
 * 問い合わせ検索・フィルタリングDTO
 * 要件8: 検索・フィルタリング機能に対応
 */

import {
    IsOptional,
    IsString,
    IsUUID,
    IsEnum,
    IsArray,
    IsDateString,
    IsEmail
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/types/pagination.types';
import { InquiryStatus, InquiryPriority } from '../entities/inquiry.entity';

export class SearchInquiryDto extends PaginationDto {
    @ApiPropertyOptional({
        description: '検索クエリ（タイトル・内容を対象とした全文検索）',
        example: 'ログイン エラー'
    })
    @IsOptional()
    @IsString({ message: '検索クエリは文字列である必要があります' })
    query?: string;

    @ApiPropertyOptional({
        description: '対象アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @IsOptional()
    @IsUUID('4', { message: 'アプリIDは有効なUUIDである必要があります' })
    appId?: string;

    @ApiPropertyOptional({
        description: '問い合わせ状態（複数指定可能）',
        enum: ['new', 'in_progress', 'pending', 'resolved', 'closed'],
        isArray: true,
        example: ['new', 'in_progress']
    })
    @IsOptional()
    @IsArray({ message: '状態は配列である必要があります' })
    @IsEnum(['new', 'in_progress', 'pending', 'resolved', 'closed'], {
        each: true,
        message: '状態はnew, in_progress, pending, resolved, closedのいずれかである必要があります'
    })
    status?: InquiryStatus[];

    @ApiPropertyOptional({
        description: '優先度（複数指定可能）',
        enum: ['low', 'medium', 'high', 'urgent'],
        isArray: true,
        example: ['high', 'urgent']
    })
    @IsOptional()
    @IsArray({ message: '優先度は配列である必要があります' })
    @IsEnum(['low', 'medium', 'high', 'urgent'], {
        each: true,
        message: '優先度はlow, medium, high, urgentのいずれかである必要があります'
    })
    priority?: InquiryPriority[];

    @ApiPropertyOptional({
        description: 'カテゴリ（複数指定可能）',
        isArray: true,
        example: ['技術的問題', 'アカウント関連']
    })
    @IsOptional()
    @IsArray({ message: 'カテゴリは配列である必要があります' })
    @IsString({ each: true, message: 'カテゴリの各要素は文字列である必要があります' })
    category?: string[];

    @ApiPropertyOptional({
        description: '担当者ID',
        example: '550e8400-e29b-41d4-a716-446655440001'
    })
    @IsOptional()
    @IsUUID('4', { message: '担当者IDは有効なUUIDである必要があります' })
    assignedTo?: string;

    @ApiPropertyOptional({
        description: '顧客メールアドレス',
        example: 'customer@example.com'
    })
    @IsOptional()
    @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
    customerEmail?: string;

    @ApiPropertyOptional({
        description: '作成日時の開始日（ISO 8601形式）',
        example: '2024-01-01T00:00:00Z'
    })
    @IsOptional()
    @IsDateString({}, { message: '開始日は有効な日時形式である必要があります' })
    createdAtFrom?: string;

    @ApiPropertyOptional({
        description: '作成日時の終了日（ISO 8601形式）',
        example: '2024-12-31T23:59:59Z'
    })
    @IsOptional()
    @IsDateString({}, { message: '終了日は有効な日時形式である必要があります' })
    createdAtTo?: string;

    @ApiPropertyOptional({
        description: 'タグ（複数指定可能）',
        isArray: true,
        example: ['ログイン', 'エラー']
    })
    @IsOptional()
    @IsArray({ message: 'タグは配列である必要があります' })
    @IsString({ each: true, message: 'タグの各要素は文字列である必要があります' })
    tags?: string[];

    @ApiPropertyOptional({
        description: '未割り当ての問い合わせのみを取得するかどうか',
        example: true
    })
    @IsOptional()
    @Type(() => Boolean)
    unassignedOnly?: boolean;

    @ApiPropertyOptional({
        description: '初回回答待ちの問い合わせのみを取得するかどうか',
        example: true
    })
    @IsOptional()
    @Type(() => Boolean)
    awaitingFirstResponse?: boolean;
}