import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FAQResponseDto {
    @ApiProperty({ description: 'FAQ ID' })
    id: string;

    @ApiProperty({ description: 'アプリケーションID' })
    appId: string;

    @ApiProperty({ description: 'FAQ質問' })
    question: string;

    @ApiProperty({ description: 'FAQ回答' })
    answer: string;

    @ApiPropertyOptional({ description: 'カテゴリ' })
    category?: string;

    @ApiProperty({ description: '表示順序' })
    orderIndex: number;

    @ApiProperty({ description: '公開状態' })
    isPublished: boolean;

    @ApiPropertyOptional({ description: 'タグ', type: [String] })
    tags?: string[];

    @ApiProperty({ description: '作成日時' })
    createdAt: Date;

    @ApiProperty({ description: '更新日時' })
    updatedAt: Date;
}