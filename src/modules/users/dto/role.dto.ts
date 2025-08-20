import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsArray,
    IsOptional,
    IsBoolean,
    IsNumber,
    MinLength,
    MaxLength,
    ArrayNotEmpty,
} from 'class-validator';

/**
 * 役割作成DTO
 */
export class CreateRoleDto {
    @ApiProperty({
        description: '役割名',
        example: 'サポート担当者',
    })
    @IsString()
    @MinLength(1, { message: '役割名は必須です' })
    @MaxLength(100, { message: '役割名は100文字以内で入力してください' })
    name: string;

    @ApiProperty({
        description: '役割の説明',
        example: '問い合わせ対応とFAQ管理権限を持つ',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255, { message: '説明は255文字以内で入力してください' })
    description?: string;

    @ApiProperty({
        description: '権限リスト',
        example: ['inquiry:read', 'inquiry:update', 'response:create'],
        type: [String],
    })
    @IsArray()
    @ArrayNotEmpty({ message: '権限は最低1つ指定してください' })
    @IsString({ each: true })
    permissions: string[];

    @ApiProperty({
        description: 'アクティブフラグ',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: '表示順序',
        example: 1,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    sortOrder?: number;
}

/**
 * 役割更新DTO
 */
export class UpdateRoleDto {
    @ApiProperty({
        description: '役割名',
        example: 'サポート担当者',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(1, { message: '役割名は必須です' })
    @MaxLength(100, { message: '役割名は100文字以内で入力してください' })
    name?: string;

    @ApiProperty({
        description: '役割の説明',
        example: '問い合わせ対応とFAQ管理権限を持つ',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255, { message: '説明は255文字以内で入力してください' })
    description?: string;

    @ApiProperty({
        description: '権限リスト',
        example: ['inquiry:read', 'inquiry:update', 'response:create'],
        type: [String],
        required: false,
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @ApiProperty({
        description: 'アクティブフラグ',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: '表示順序',
        example: 1,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    sortOrder?: number;
}

/**
 * 権限チェックDTO
 */
export class CheckPermissionDto {
    @ApiProperty({
        description: 'リソース名',
        example: 'inquiry',
    })
    @IsString()
    resource: string;

    @ApiProperty({
        description: 'アクション名',
        example: 'read',
    })
    @IsString()
    action: string;
}

/**
 * 複数権限チェックDTO
 */
export class CheckMultiplePermissionsDto {
    @ApiProperty({
        description: '権限リスト',
        example: [
            { resource: 'inquiry', action: 'read' },
            { resource: 'response', action: 'create' },
        ],
        type: [CheckPermissionDto],
    })
    @IsArray()
    @ArrayNotEmpty()
    permissions: CheckPermissionDto[];
}