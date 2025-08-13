/**
 * 役割管理関連のDTO
 * 要件: 5.1, 5.2, 5.3, 5.4 (権限管理機能)
 */

import { IsString, IsArray, IsOptional, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionDto {
  @ApiProperty({ description: 'リソース名', example: 'inquiry' })
  @IsString()
  resource: string;

  @ApiProperty({ description: 'アクション一覧', example: ['create', 'read', 'update'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  actions: string[];
}

export class CreateRoleDto {
  @ApiProperty({ description: '役割名', example: 'support_staff' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '役割の説明', example: 'サポート担当者' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '権限一覧', type: [PermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  @ArrayMinSize(1)
  permissions: PermissionDto[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: '役割名', example: 'support_staff' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '役割の説明', example: 'サポート担当者' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '権限一覧', type: [PermissionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions?: PermissionDto[];
}

export class CheckPermissionDto {
  @ApiProperty({ description: 'リソース名', example: 'inquiry' })
  @IsString()
  resource: string;

  @ApiProperty({ description: 'アクション名', example: 'create' })
  @IsString()
  action: string;
}

export class RoleResponseDto {
  @ApiProperty({ description: '役割ID' })
  id: string;

  @ApiProperty({ description: '役割名' })
  name: string;

  @ApiProperty({ description: '役割の説明' })
  description: string;

  @ApiProperty({ description: '権限一覧', type: [PermissionDto] })
  permissions: PermissionDto[];

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;
}

export class PermissionCheckResponseDto {
  @ApiProperty({ description: '権限の有無' })
  hasPermission: boolean;
}

export class UserPermissionsResponseDto {
  @ApiProperty({ description: 'ユーザーの権限一覧', type: [PermissionDto] })
  permissions: PermissionDto[];
}