/**
 * 回答更新DTO
 * 要件2.3: 回答の更新・履歴管理機能に対応
 */

import {
    IsString,
    IsOptional,
    IsBoolean,
    IsEnum,
    IsArray,
    IsObject,
    IsInt,
    Min,
    IsUUID
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateResponseDto {
    @ApiPropertyOptional({
        description: '回答内容',
        example: 'ログイン画面のパスワードリセット機能をご利用ください。（更新版）'
    })
    @IsOptional()
    @IsString({ message: '回答内容は文字列である必要があります' })
    content?: string;

    @ApiPropertyOptional({
        description: '公開フラグ（FAQなどで公開可能か）',
        example: true
    })
    @IsOptional()
    @IsBoolean({ message: '公開フラグはboolean値である必要があります' })
    isPublic?: boolean;

    @ApiPropertyOptional({
        description: '内部メモフラグ',
        example: false
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
        example: 45,
        minimum: 0
    })
    @IsOptional()
    @IsInt({ message: '回答時間は整数である必要があります' })
    @Min(0, { message: '回答時間は0以上である必要があります' })
    responseTimeMinutes?: number;

    @ApiPropertyOptional({
        description: '添付ファイルID一覧',
        example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
        type: [String]
    })
    @IsOptional()
    @IsArray({ message: '添付ファイルIDは配列である必要があります' })
    @IsUUID('4', { each: true, message: '添付ファイルIDは有効なUUIDである必要があります' })
    attachmentIds?: string[];

    @ApiPropertyOptional({
        description: 'メタデータ（追加情報）',
        example: { source: 'manual', category: 'technical', updated: true }
    })
    @IsOptional()
    @IsObject({ message: 'メタデータはオブジェクトである必要があります' })
    metadata?: Record<string, any>;

    @ApiPropertyOptional({
        description: '更新理由・コメント',
        example: '追加情報を含めて回答を更新しました'
    })
    @IsOptional()
    @IsString({ message: '更新理由は文字列である必要があります' })
    updateComment?: string;
}