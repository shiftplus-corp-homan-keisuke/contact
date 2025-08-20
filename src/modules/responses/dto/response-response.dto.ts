/**
 * 回答レスポンスDTO
 * API応答用のデータ転送オブジェクト
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

/**
 * 回答基本情報レスポンス
 */
export class ResponseResponseDto {
    @ApiProperty({
        description: '回答ID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @Expose()
    id: string;

    @ApiProperty({
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440001'
    })
    @Expose()
    inquiryId: string;

    @ApiProperty({
        description: '回答者ID',
        example: '550e8400-e29b-41d4-a716-446655440002'
    })
    @Expose()
    userId: string;

    @ApiProperty({
        description: '回答内容',
        example: 'ログイン画面のパスワードリセット機能をご利用ください。'
    })
    @Expose()
    content: string;

    @ApiProperty({
        description: '公開フラグ',
        example: true
    })
    @Expose()
    isPublic: boolean;

    @ApiProperty({
        description: '内部メモフラグ',
        example: false
    })
    @Expose()
    isInternal: boolean;

    @ApiPropertyOptional({
        description: '回答タイプ',
        example: 'answer'
    })
    @Expose()
    responseType?: string;

    @ApiPropertyOptional({
        description: '回答時間（分）',
        example: 30
    })
    @Expose()
    responseTimeMinutes?: number;

    @ApiProperty({
        description: '添付ファイルID一覧',
        example: ['550e8400-e29b-41d4-a716-446655440003'],
        type: [String]
    })
    @Expose()
    attachmentIds: string[];

    @ApiProperty({
        description: 'メタデータ',
        example: { source: 'manual', category: 'technical' }
    })
    @Expose()
    metadata: Record<string, any>;

    @ApiProperty({
        description: '作成日時',
        example: '2024-01-01T10:00:00Z'
    })
    @Expose()
    createdAt: Date;

    @ApiProperty({
        description: '更新日時',
        example: '2024-01-01T10:30:00Z'
    })
    @Expose()
    updatedAt: Date;
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
 * 回答履歴DTO
 */
export class ResponseHistoryDto {
    @ApiProperty({
        description: '履歴ID',
        example: '550e8400-e29b-41d4-a716-446655440004'
    })
    @Expose()
    id: string;

    @ApiProperty({
        description: '回答ID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @Expose()
    responseId: string;

    @ApiPropertyOptional({
        description: '変更前の内容',
        example: '元の回答内容'
    })
    @Expose()
    oldContent?: string;

    @ApiProperty({
        description: '変更後の内容',
        example: '更新された回答内容'
    })
    @Expose()
    newContent: string;

    @ApiProperty({
        description: '変更実行者ID',
        example: '550e8400-e29b-41d4-a716-446655440002'
    })
    @Expose()
    changedBy: string;

    @ApiProperty({
        description: '変更日時',
        example: '2024-01-01T10:30:00Z'
    })
    @Expose()
    changedAt: Date;

    @ApiPropertyOptional({
        description: '変更理由・コメント',
        example: '追加情報を含めて更新'
    })
    @Expose()
    comment?: string;

    @ApiPropertyOptional({
        description: '変更タイプ',
        example: 'update'
    })
    @Expose()
    changeType?: string;

    @ApiPropertyOptional({
        description: '変更実行者情報'
    })
    @Expose()
    @Type(() => UserInfoDto)
    changedByUser?: UserInfoDto;
}

/**
 * 回答詳細レスポンス（関連データを含む）
 */
export class ResponseDetailResponseDto extends ResponseResponseDto {
    @ApiPropertyOptional({
        description: '回答者情報'
    })
    @Expose()
    @Type(() => UserInfoDto)
    user?: UserInfoDto;

    @ApiPropertyOptional({
        description: '回答履歴',
        type: [ResponseHistoryDto]
    })
    @Expose()
    @Type(() => ResponseHistoryDto)
    history?: ResponseHistoryDto[];
}