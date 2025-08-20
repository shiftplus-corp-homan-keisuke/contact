/**
 * 回答作成DTO
 * 要件2.1: 問い合わせと回答の関連付け機能に対応
 */

import {
    IsString,
    IsNotEmpty,
    IsUUID,
    IsOptional,
    IsBoolean,
    IsEnum,
    IsArray,
    IsObject,
    IsInt,
    Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResponseDto {
    @ApiProperty({
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @IsUUID('4', { message: '問い合わせIDは有効なUUIDである必要があります' })
    @IsNotEmpty({ message: '問い合わせIDは必須項目です' })
    inquiryId: string;

    @ApiProperty({
        description: '回答内容',
        example: 'ログイン画面のパスワードリセット機能をご利用ください。'
    })
    @IsString({ message: '回答内容は文字列である必要があります' })
    @IsNotEmpty({ message: '回答内容は必須項目です' })
    content: string;

    @ApiPropertyOptional({
        description: '公開フラグ（FAQなどで公開可能か）',
        example: true,
        default: false
    })
    @IsOptional()
    @IsBoolean({ message: '公開フラグはboolean値である必要があります' })
    isPublic?: boolean;

    @ApiPropertyOptional({
        description: '内部メモフラグ',
        example: false,
        default: false
    })
    @IsOptional()
    @IsBoolean({ message: '内部メモフラグはboolean値である必要があります' })
    isInternal?: boolean;

    @ApiPropertyOptional({
        description: '回答タイプ',
        enum: ['answer', 'note', 'escalation'],
        example: 'answer'
    })
    @IsOptional()
    @IsEnum(['answer', 'note', 'escalation'], {
        message: '回答タイプはanswer, note, escalationのいずれかである必要があります'
    })
    responseType?: string;

    @ApiPropertyOptional({
        description: '回答時間（分）',
        example: 30,
        minimum: 0
    })
    @IsOptional()
    @IsInt({ message: '回答時間は整数である必要があります' })
    @Min(0, { message: '回答時間は0以上である必要があります' })
    responseTimeMinutes?: number;

    @ApiPropertyOptional({
        description: '添付ファイルID一覧',
        example: ['550e8400-e29b-41d4-a716-446655440001'],
        type: [String]
    })
    @IsOptional()
    @IsArray({ message: '添付ファイルIDは配列である必要があります' })
    @IsUUID('4', { each: true, message: '添付ファイルIDは有効なUUIDである必要があります' })
    attachmentIds?: string[];

    @ApiPropertyOptional({
        description: 'メタデータ（追加情報）',
        example: { source: 'manual', category: 'technical' }
    })
    @IsOptional()
    @IsObject({ message: 'メタデータはオブジェクトである必要があります' })
    metadata?: Record<string, any>;
}