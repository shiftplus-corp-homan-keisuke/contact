/**
 * 問い合わせレスポンスDTO
 * API応答用のデータ転送オブジェクト
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { InquiryStatus, InquiryPriority } from '../entities/inquiry.entity';

/**
 * 問い合わせ基本情報レスポンス
 */
export class InquiryResponseDto {
    @ApiProperty({
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @Expose()
    id: string;

    @ApiProperty({
        description: '対象アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440001'
    })
    @Expose()
    appId: string;

    @ApiProperty({
        description: '問い合わせタイトル',
        example: 'ログインできない問題について'
    })
    @Expose()
    title: string;

    @ApiProperty({
        description: '問い合わせ内容',
        example: 'ログイン画面でメールアドレスとパスワードを入力してもエラーが表示されます。'
    })
    @Expose()
    content: string;

    @ApiProperty({
        description: '問い合わせ状態',
        enum: ['new', 'in_progress', 'pending', 'resolved', 'closed'],
        example: 'new'
    })
    @Expose()
    status: InquiryStatus;

    @ApiProperty({
        description: '優先度',
        enum: ['low', 'medium', 'high', 'urgent'],
        example: 'medium'
    })
    @Expose()
    priority: InquiryPriority;

    @ApiPropertyOptional({
        description: 'カテゴリ',
        example: '技術的問題'
    })
    @Expose()
    category?: string;

    @ApiPropertyOptional({
        description: '顧客メールアドレス',
        example: 'customer@example.com'
    })
    @Expose()
    customerEmail?: string;

    @ApiPropertyOptional({
        description: '顧客名',
        example: '田中太郎'
    })
    @Expose()
    customerName?: string;

    @ApiPropertyOptional({
        description: '担当者ID',
        example: '550e8400-e29b-41d4-a716-446655440002'
    })
    @Expose()
    assignedTo?: string;

    @ApiPropertyOptional({
        description: '初回回答日時',
        example: '2024-01-01T10:30:00Z'
    })
    @Expose()
    firstResponseAt?: Date;

    @ApiPropertyOptional({
        description: '解決日時',
        example: '2024-01-01T15:45:00Z'
    })
    @Expose()
    resolvedAt?: Date;

    @ApiPropertyOptional({
        description: 'クローズ日時',
        example: '2024-01-01T16:00:00Z'
    })
    @Expose()
    closedAt?: Date;

    @ApiProperty({
        description: 'タグ',
        example: ['ログイン', 'エラー'],
        type: [String]
    })
    @Expose()
    tags: string[];

    @ApiProperty({
        description: 'メタデータ',
        example: { browser: 'Chrome', version: '120.0.0.0' }
    })
    @Expose()
    metadata: Record<string, any>;

    @ApiProperty({
        description: '作成日時',
        example: '2024-01-01T09:00:00Z'
    })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        description: '更新日時',
        example: '2024-01-01T09:30:00Z'
    })
    @Expose()
    updatedAt: Date;
}

/**
 * アプリケーション情報DTO
 */
export class ApplicationInfoDto {
    @ApiProperty({
        description: 'アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440001'
    })
    @Expose()
    id: string;

    @ApiProperty({
        description: 'アプリケーション名',
        example: 'MyApp'
    })
    @Expose()
    name: string;

    @ApiPropertyOptional({
        description: 'アプリケーションの説明',
        example: 'サンプルアプリケーション'
    })
    @Expose()
    description?: string;
}

/**
 * ユーザー情報DTO
 */
export class UserInfoDto {
    @ApiProperty({
        description: 'ユーザーID',
        example: '550e8400-e29b-41d4-a716-446655440002'
    })
    @Expose()
    id: string;

    @ApiProperty({
        description: 'ユーザー名',
        example: '山田太郎'
    })
    @Expose()
    name: string;

    @ApiProperty({
        description: 'メールアドレス',
        example: 'yamada@example.com'
    })
    @Expose()
    email: string;
}

/**
 * 問い合わせ状態履歴DTO
 */
export class InquiryStatusHistoryDto {
    @ApiProperty({
        description: '履歴ID',
        example: '550e8400-e29b-41d4-a716-446655440003'
    })
    @Expose()
    id: string;

    @ApiPropertyOptional({
        description: '変更前の状態',
        enum: ['new', 'in_progress', 'pending', 'resolved', 'closed'],
        example: 'new'
    })
    @Expose()
    oldStatus?: InquiryStatus;

    @ApiProperty({
        description: '変更後の状態',
        enum: ['new', 'in_progress', 'pending', 'resolved', 'closed'],
        example: 'in_progress'
    })
    @Expose()
    newStatus: InquiryStatus;

    @ApiProperty({
        description: '変更実行者ID',
        example: '550e8400-e29b-41d4-a716-446655440002'
    })
    @Expose()
    changedBy: string;

    @ApiPropertyOptional({
        description: '変更理由・コメント',
        example: '調査を開始しました'
    })
    @Expose()
    comment?: string;

    @ApiProperty({
        description: '変更日時',
        example: '2024-01-01T10:00:00Z'
    })
    @Expose()
    changedAt: Date;

    @ApiPropertyOptional({
        description: '変更実行者情報'
    })
    @Expose()
    @Type(() => UserInfoDto)
    changedByUser?: UserInfoDto;
}

/**
 * 問い合わせ詳細レスポンス（関連データを含む）
 */
export class InquiryDetailResponseDto extends InquiryResponseDto {
    @ApiPropertyOptional({
        description: '対象アプリケーション情報'
    })
    @Expose()
    @Type(() => ApplicationInfoDto)
    app?: ApplicationInfoDto;

    @ApiPropertyOptional({
        description: '担当者情報'
    })
    @Expose()
    @Type(() => UserInfoDto)
    assignedUser?: UserInfoDto;

    @ApiPropertyOptional({
        description: '状態変更履歴',
        type: [InquiryStatusHistoryDto]
    })
    @Expose()
    @Type(() => InquiryStatusHistoryDto)
    statusHistory?: InquiryStatusHistoryDto[];
}