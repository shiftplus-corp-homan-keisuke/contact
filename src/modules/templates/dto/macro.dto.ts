import { IsString, IsOptional, IsBoolean, IsObject, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * マクロ作成DTO
 */
export class CreateMacroDto {
    @ApiProperty({ description: 'マクロ名', example: 'greeting_template' })
    @IsString()
    @Length(1, 255)
    name: string;

    @ApiProperty({
        description: 'マクロコンテンツ',
        example: 'こんにちは、{{customer_name}}様。{{message}}'
    })
    @IsString()
    content: string;

    @ApiProperty({
        description: 'マクロ変数定義',
        example: { customer_name: '顧客名', message: 'メッセージ' }
    })
    @IsObject()
    variables: Record<string, string>;

    @ApiPropertyOptional({ description: 'マクロの説明' })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    description?: string;

    @ApiPropertyOptional({ description: '共有フラグ', default: false })
    @IsOptional()
    @IsBoolean()
    isShared?: boolean;
}

/**
 * マクロ更新DTO
 */
export class UpdateMacroDto {
    @ApiPropertyOptional({ description: 'マクロ名' })
    @IsOptional()
    @IsString()
    @Length(1, 255)
    name?: string;

    @ApiPropertyOptional({ description: 'マクロコンテンツ' })
    @IsOptional()
    @IsString()
    content?: string;

    @ApiPropertyOptional({ description: 'マクロ変数定義' })
    @IsOptional()
    @IsObject()
    variables?: Record<string, string>;

    @ApiPropertyOptional({ description: 'マクロの説明' })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    description?: string;

    @ApiPropertyOptional({ description: '共有フラグ' })
    @IsOptional()
    @IsBoolean()
    isShared?: boolean;
}

/**
 * マクロ実行DTO
 */
export class ExecuteMacroDto {
    @ApiProperty({
        description: '変数値',
        example: { customer_name: '田中太郎', message: 'お疲れ様です' }
    })
    @IsObject()
    variableValues: Record<string, string>;
}

/**
 * マクロレスポンスDTO
 */
export class MacroResponseDto {
    @ApiProperty({ description: 'マクロID' })
    id: string;

    @ApiProperty({ description: 'マクロ名' })
    name: string;

    @ApiProperty({ description: 'マクロコンテンツ' })
    content: string;

    @ApiProperty({ description: 'マクロ変数定義' })
    variables: Record<string, string>;

    @ApiPropertyOptional({ description: 'マクロの説明' })
    description?: string;

    @ApiProperty({ description: '共有フラグ' })
    isShared: boolean;

    @ApiProperty({ description: '使用回数' })
    usageCount: number;

    @ApiProperty({ description: '作成者ID' })
    createdBy: string;

    @ApiProperty({ description: '作成日時' })
    createdAt: Date;

    @ApiProperty({ description: '更新日時' })
    updatedAt: Date;
}

/**
 * マクロ実行結果DTO
 */
export class MacroExecutionResultDto {
    @ApiProperty({ description: '展開されたコンテンツ' })
    expandedContent: string;

    @ApiProperty({ description: '使用した変数値' })
    variableValues: Record<string, string>;
}

/**
 * マクロ使用統計DTO
 */
export class MacroUsageStatsDto {
    @ApiProperty({ description: '総使用回数' })
    totalUsage: number;

    @ApiProperty({ description: '最近の使用履歴' })
    recentUsage: {
        id: string;
        expandedVariables: Record<string, string>;
        expandedContent: string;
        usedAt: Date;
        user: {
            id: string;
            name: string;
        };
    }[];
}