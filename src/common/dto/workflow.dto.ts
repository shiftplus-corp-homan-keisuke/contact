/**
 * ワークフロー関連のDTO
 * 要件: 2.2, 2.3 (状態管理とワークフロー機能)
 */

import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryStatus } from '../types/inquiry.types';

export class UpdateStatusDto {
  @ApiProperty({ 
    description: '新しい状態',
    enum: InquiryStatus,
    example: InquiryStatus.IN_PROGRESS
  })
  @IsEnum(InquiryStatus, { message: '有効な状態を指定してください' })
  @IsNotEmpty({ message: '状態は必須項目です' })
  status: InquiryStatus;

  @ApiPropertyOptional({ 
    description: '状態変更のコメント',
    example: '顧客からの追加情報を待っています'
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class StatusHistoryDto {
  @ApiProperty({ description: '履歴ID' })
  id: string;

  @ApiProperty({ description: '問い合わせID' })
  inquiryId: string;

  @ApiPropertyOptional({ 
    description: '変更前の状態',
    enum: InquiryStatus
  })
  oldStatus?: InquiryStatus;

  @ApiProperty({ 
    description: '変更後の状態',
    enum: InquiryStatus
  })
  newStatus: InquiryStatus;

  @ApiProperty({ description: '変更者ID' })
  changedBy: string;

  @ApiPropertyOptional({ description: 'コメント' })
  comment?: string;

  @ApiProperty({ description: '変更日時' })
  changedAt: Date;

  @ApiPropertyOptional({ description: '変更者情報' })
  changedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export class StatusTransitionDto {
  @ApiProperty({ 
    description: '現在の状態',
    enum: InquiryStatus
  })
  currentStatus: InquiryStatus;

  @ApiProperty({ 
    description: '利用可能な遷移先状態',
    enum: InquiryStatus,
    isArray: true
  })
  availableTransitions: InquiryStatus[];
}

export class StatusStatsDto {
  @ApiProperty({ description: '新規件数' })
  new: number;

  @ApiProperty({ description: '対応中件数' })
  inProgress: number;

  @ApiProperty({ description: '保留件数' })
  pending: number;

  @ApiProperty({ description: '解決済み件数' })
  resolved: number;

  @ApiProperty({ description: 'クローズ件数' })
  closed: number;

  @ApiProperty({ description: '合計件数' })
  total: number;
}

export class StaleInquiryDto {
  @ApiProperty({ description: '問い合わせID' })
  id: string;

  @ApiProperty({ description: 'タイトル' })
  title: string;

  @ApiProperty({ 
    description: '現在の状態',
    enum: InquiryStatus
  })
  status: InquiryStatus;

  @ApiProperty({ description: '最終更新日時' })
  updatedAt: Date;

  @ApiProperty({ description: '放置日数' })
  staleDays: number;

  @ApiPropertyOptional({ description: 'アプリケーション情報' })
  application?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: '担当者情報' })
  assignedUser?: {
    id: string;
    name: string;
    email: string;
  };
}