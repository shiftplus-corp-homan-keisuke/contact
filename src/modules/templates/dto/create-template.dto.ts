import {
    IsString,
    IsOptional,
    IsArray,
    IsBoolean,
    ValidateNested,
    Length,
    ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateVariableDto {
    @ApiProperty({ description: '変数名' })
    @IsString()
    @Length(1, 100)
    name: string;

    @ApiProperty({
        description: '変数の型',
        enum: ['text', 'number', 'date', 'boolean', 'select'],
    })
    @IsString()
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';

    @ApiPropertyOptional({ description: '変数の説明' })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    description?: string;

    @ApiPropertyOptional({ description: 'デフォルト値' })
    @IsOptional()
    @IsString()
    defaultValue?: string;

    @ApiProperty({ description: '必須フラグ' })
    @IsBoolean()
    required: boolean;

    @ApiPropertyOptional({ description: 'select型の場合の選択肢' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(50)
    options?: string[];

    @ApiPropertyOptional({ description: '表示順序' })
    @IsOptional()
    orderIndex?: number;
}

export class CreateTemplateDto {
    @ApiProperty({ description: 'テンプレート名' })
    @IsString()
    @Length(1, 255)
    name: string;

    @ApiProperty({ description: 'カテゴリ' })
    @IsString()
    @Length(1, 100)
    category: string;

    @ApiProperty({ description: 'テンプレート内容' })
    @IsString()
    @Length(1, 10000)
    content: string;

    @ApiPropertyOptional({ description: 'テンプレート変数' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateTemplateVariableDto)
    variables?: CreateTemplateVariableDto[];

    @ApiPropertyOptional({ description: 'タグ' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    tags?: string[];

    @ApiPropertyOptional({ description: '共有フラグ' })
    @IsOptional()
    @IsBoolean()
    isShared?: boolean;
}