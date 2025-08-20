import { IsInt, IsNumber, IsOptional, IsArray, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class FAQGenerationOptionsDto {
    @ApiProperty({ description: '最小クラスタサイズ', minimum: 2, default: 3 })
    @IsInt()
    @Min(2)
    minClusterSize: number = 3;

    @ApiProperty({ description: '最大クラスタ数', minimum: 1, maximum: 20, default: 10 })
    @IsInt()
    @Min(1)
    @Max(20)
    maxClusters: number = 10;

    @ApiProperty({ description: '類似度閾値', minimum: 0, maximum: 1, default: 0.7 })
    @IsNumber()
    @Min(0)
    @Max(1)
    similarityThreshold: number = 0.7;

    @ApiPropertyOptional({ description: '開始日' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: '終了日' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'カテゴリフィルタ', type: [String] })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
    @IsArray()
    categories?: string[];
}

export class FAQClusterResponseDto {
    @ApiProperty({ description: 'クラスタID' })
    id: string;

    @ApiProperty({ description: '問い合わせID一覧', type: [String] })
    inquiryIds: string[];

    @ApiProperty({ description: '代表的な質問' })
    representativeQuestion: string;

    @ApiProperty({ description: '提案回答' })
    suggestedAnswer: string;

    @ApiProperty({ description: '類似度スコア' })
    similarity: number;

    @ApiPropertyOptional({ description: 'カテゴリ' })
    category?: string;
}