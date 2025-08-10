/**
 * 問い合わせ関連のDTO
 * 要件: 1.1, 1.3, 1.4 (問い合わせ登録機能)
 */

import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryStatus, InquiryPriority } from '../types/inquiry.types';

export class CreateInquiryDto {
  @ApiProperty({ description: '問い合わせタイトル', maxLength: 500 })
  @IsString()
  @IsNotEmpty({ message: 'タイトルは必須項目です' })
  @MaxLength(500, { message: 'タイトルは500文字以内で入力してください' })
  title: string;

  @ApiProperty({ description: '問い合わせ内容' })
  @IsString()
  @IsNotEmpty({ message: '内容は必須項目です' })
  content: string;

  @ApiProperty({ description: '対象アプリケーションID' })
  @IsUUID('4', { message: '有効なアプリケーションIDを指定してください' })
  @IsNotEmpty({ message: '対象アプリは必須項目です' })
  appId: string;

  @ApiPropertyOptional({ description: '顧客メールアドレス' })
  @IsOptional()
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  customerEmail?: string;

  @ApiPropertyOptional({ description: '顧客名' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '顧客名は255文字以内で入力してください' })
  customerName?: string;

  @ApiPropertyOptional({ description: 'カテゴリ' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  category?: string;

  @ApiPropertyOptional({ 
    description: '優先度', 
    enum: InquiryPriority,
    default: InquiryPriority.MEDIUM 
  })
  @IsOptional()
  @IsEnum(InquiryPriority, { message: '有効な優先度を指定してください' })
  priority?: InquiryPriority;
}

export class UpdateInquiryDto {
  @ApiPropertyOptional({ description: '問い合わせタイトル', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'タイトルは500文字以内で入力してください' })
  title?: string;

  @ApiPropertyOptional({ description: '問い合わせ内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'カテゴリ' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  category?: string;

  @ApiPropertyOptional({ 
    description: '優先度', 
    enum: InquiryPriority 
  })
  @IsOptional()
  @IsEnum(InquiryPriority, { message: '有効な優先度を指定してください' })
  priority?: InquiryPriority;

  @ApiPropertyOptional({ description: '担当者ID' })
  @IsOptional()
  @IsUUID('4', { message: '有効な担当者IDを指定してください' })
  assignedTo?: string;
}

export class InquiryResponseDto {
  @ApiProperty({ description: '問い合わせID' })
  id: string;

  @ApiProperty({ description: 'アプリケーションID' })
  appId: string;

  @ApiProperty({ description: 'タイトル' })
  title: string;

  @ApiProperty({ description: '内容' })
  content: string;

  @ApiProperty({ description: '状態', enum: InquiryStatus })
  status: InquiryStatus;

  @ApiProperty({ description: '優先度', enum: InquiryPriority })
  priority: InquiryPriority;

  @ApiPropertyOptional({ description: 'カテゴリ' })
  category?: string;

  @ApiPropertyOptional({ description: '顧客メールアドレス' })
  customerEmail?: string;

  @ApiPropertyOptional({ description: '顧客名' })
  customerName?: string;

  @ApiPropertyOptional({ description: '担当者ID' })
  assignedTo?: string;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;
}

export class InquiryDetailResponseDto extends InquiryResponseDto {
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

  @ApiPropertyOptional({ description: '回答一覧' })
  responses?: any[];

  @ApiPropertyOptional({ description: '状態履歴' })
  statusHistory?: any[];
}