/**
 * APIキー関連のDTO
 * 要件: 7.1, 7.4 (API認証とレート制限)
 */

import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, IsUUID, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'アプリケーションID' })
  @IsUUID()
  appId: string;

  @ApiPropertyOptional({ description: 'APIキー名' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '権限リスト', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: '1時間あたりのリクエスト制限', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  rateLimitPerHour?: number;

  @ApiPropertyOptional({ description: '有効期限' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({ description: 'APIキー名' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '権限リスト', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: '1時間あたりのリクエスト制限' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  rateLimitPerHour?: number;

  @ApiPropertyOptional({ description: 'アクティブ状態' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '有効期限' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class ApiKeyResponseDto {
  @ApiProperty({ description: 'APIキーID' })
  id: string;

  @ApiProperty({ description: 'APIキー（作成時のみ返却）' })
  apiKey?: string;

  @ApiProperty({ description: 'APIキー名' })
  name: string;

  @ApiProperty({ description: 'アプリケーションID' })
  appId: string;

  @ApiProperty({ description: '権限リスト', type: [String] })
  permissions: string[];

  @ApiProperty({ description: '1時間あたりのリクエスト制限' })
  rateLimitPerHour: number;

  @ApiProperty({ description: 'アクティブ状態' })
  isActive: boolean;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '最終使用日時' })
  lastUsedAt?: Date;

  @ApiProperty({ description: '有効期限' })
  expiresAt?: Date;
}

export class ApiKeyListResponseDto {
  @ApiProperty({ description: 'APIキーID' })
  id: string;

  @ApiProperty({ description: 'APIキー名' })
  name: string;

  @ApiProperty({ description: 'アプリケーションID' })
  appId: string;

  @ApiProperty({ description: 'アプリケーション名' })
  applicationName: string;

  @ApiProperty({ description: '権限リスト', type: [String] })
  permissions: string[];

  @ApiProperty({ description: '1時間あたりのリクエスト制限' })
  rateLimitPerHour: number;

  @ApiProperty({ description: 'アクティブ状態' })
  isActive: boolean;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '最終使用日時' })
  lastUsedAt?: Date;

  @ApiProperty({ description: '有効期限' })
  expiresAt?: Date;
}

export class ApiKeyStatsDto {
  @ApiProperty({ description: '総リクエスト数' })
  totalRequests: number;

  @ApiProperty({ description: '最終使用日時' })
  lastUsedAt?: Date;

  @ApiProperty({ description: 'アクティブ状態' })
  isActive: boolean;

  @ApiProperty({ description: '1時間あたりのリクエスト制限' })
  rateLimitPerHour: number;
}

export class RateLimitStatsDto {
  @ApiProperty({ description: '総リクエスト数' })
  totalRequests: number;

  @ApiProperty({ description: '1時間あたりの平均リクエスト数' })
  averageRequestsPerHour: number;

  @ApiProperty({ description: 'ピーク時間' })
  peakHour: {
    hour: string;
    requests: number;
  };

  @ApiProperty({ description: '日別統計', type: [Object] })
  dailyBreakdown: Array<{
    date: string;
    requests: number;
  }>;
}