import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FAQSiteGenerationDto {
    @ApiProperty({ description: 'アプリケーションID' })
    @IsString()
    appId: string;

    @ApiPropertyOptional({ description: 'サイトテーマ', default: 'default' })
    @IsOptional()
    @IsString()
    theme?: string;

    @ApiPropertyOptional({ description: 'カスタムCSS' })
    @IsOptional()
    @IsString()
    customCss?: string;

    @ApiPropertyOptional({ description: 'サイトタイトル' })
    @IsOptional()
    @IsString()
    siteTitle?: string;

    @ApiPropertyOptional({ description: 'サイト説明' })
    @IsOptional()
    @IsString()
    siteDescription?: string;
}

export class FAQSiteConfigDto {
    @ApiProperty({ description: 'アプリケーションID' })
    @IsString()
    appId: string;

    @ApiProperty({ description: 'サイトタイトル' })
    @IsString()
    siteTitle: string;

    @ApiPropertyOptional({ description: 'サイト説明' })
    @IsOptional()
    @IsString()
    siteDescription?: string;

    @ApiPropertyOptional({ description: 'テーマ', default: 'default' })
    @IsOptional()
    @IsString()
    theme?: string;

    @ApiPropertyOptional({ description: 'カスタムCSS' })
    @IsOptional()
    @IsString()
    customCss?: string;

    @ApiPropertyOptional({ description: 'ヘッダーロゴURL' })
    @IsOptional()
    @IsString()
    logoUrl?: string;

    @ApiPropertyOptional({ description: 'フッターテキスト' })
    @IsOptional()
    @IsString()
    footerText?: string;

    @ApiPropertyOptional({ description: '検索機能有効化', default: true })
    @IsOptional()
    @IsBoolean()
    enableSearch?: boolean;

    @ApiPropertyOptional({ description: 'カテゴリフィルター有効化', default: true })
    @IsOptional()
    @IsBoolean()
    enableCategoryFilter?: boolean;
}

export class FAQSiteResponseDto {
    @ApiProperty({ description: 'サイトURL' })
    siteUrl: string;

    @ApiProperty({ description: '生成日時' })
    generatedAt: Date;

    @ApiProperty({ description: 'FAQ件数' })
    faqCount: number;

    @ApiProperty({ description: 'カテゴリ一覧' })
    categories: string[];
}

export class FAQSiteStatusDto {
    @ApiProperty({ description: 'アプリケーションID' })
    appId: string;

    @ApiProperty({ description: 'サイトが公開されているか' })
    isPublished: boolean;

    @ApiProperty({ description: 'サイトURL' })
    siteUrl: string;

    @ApiProperty({ description: '最終更新日時' })
    lastUpdated: Date;

    @ApiProperty({ description: '公開FAQ件数' })
    publishedFaqCount: number;

    @ApiProperty({ description: 'サイト設定' })
    config: FAQSiteConfigDto;
}

export class PublishFAQSiteDto {
    @ApiProperty({ description: 'アプリケーションID' })
    @IsString()
    appId: string;

    @ApiPropertyOptional({ description: '公開するFAQのIDリスト（指定しない場合は全ての公開FAQを対象）' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    faqIds?: string[];

    @ApiPropertyOptional({ description: 'サイト設定' })
    @IsOptional()
    config?: FAQSiteConfigDto;
}