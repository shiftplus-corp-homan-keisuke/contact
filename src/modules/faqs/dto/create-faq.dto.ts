import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFAQDto {
    @ApiProperty({ description: 'アプリケーションID' })
    @IsUUID()
    @IsNotEmpty()
    appId: string;

    @ApiProperty({ description: 'FAQ質問' })
    @IsString()
    @IsNotEmpty()
    question: string;

    @ApiProperty({ description: 'FAQ回答' })
    @IsString()
    @IsNotEmpty()
    answer: string;

    @ApiPropertyOptional({ description: 'カテゴリ' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({ description: '表示順序', default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    orderIndex?: number;

    @ApiPropertyOptional({ description: '公開状態', default: false })
    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @ApiPropertyOptional({ description: 'タグ', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
}