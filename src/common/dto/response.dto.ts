/**
 * 回答関連のDTO
 * 要件: 2.1, 2.3, 2.4 (回答管理機能)
 */

import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResponseDto {
  @ApiProperty({ description: '問い合わせID' })
  @IsUUID('4', { message: '有効な問い合わせIDを指定してください' })
  @IsNotEmpty({ message: '問い合わせIDは必須項目です' })
  inquiryId: string;

  @ApiProperty({ description: '回答内容' })
  @IsString()
  @IsNotEmpty({ message: '回答内容は必須項目です' })
  content: string;

  @ApiPropertyOptional({ 
    description: '公開フラグ（顧客に表示するかどうか）',
    default: false 
  })
  @IsOptional()
  @IsBoolean({ message: '公開フラグはboolean値である必要があります' })
  isPublic?: boolean;
}

export class UpdateResponseDto {
  @ApiPropertyOptional({ description: '回答内容' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '回答内容は必須項目です' })
  content?: string;

  @ApiPropertyOptional({ description: '公開フラグ（顧客に表示するかどうか）' })
  @IsOptional()
  @IsBoolean({ message: '公開フラグはboolean値である必要があります' })
  isPublic?: boolean;
}

export class ResponseDto {
  @ApiProperty({ description: '回答ID' })
  id: string;

  @ApiProperty({ description: '問い合わせID' })
  inquiryId: string;

  @ApiProperty({ description: '回答者ID' })
  userId: string;

  @ApiProperty({ description: '回答内容' })
  content: string;

  @ApiProperty({ description: '公開フラグ' })
  isPublic: boolean;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '回答者情報' })
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export class ResponseDetailDto extends ResponseDto {
  @ApiPropertyOptional({ description: '問い合わせ情報' })
  inquiry?: {
    id: string;
    title: string;
    status: string;
  };

  @ApiPropertyOptional({ description: '回答履歴' })
  history?: ResponseHistoryDto[];
}

export class ResponseHistoryDto {
  @ApiProperty({ description: '履歴ID' })
  id: string;

  @ApiProperty({ description: '回答ID' })
  responseId: string;

  @ApiPropertyOptional({ description: '変更前の内容' })
  oldContent?: string;

  @ApiProperty({ description: '変更後の内容' })
  newContent: string;

  @ApiProperty({ description: '変更者ID' })
  changedBy: string;

  @ApiProperty({ description: '変更日時' })
  changedAt: Date;

  @ApiPropertyOptional({ description: '変更者情報' })
  changedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}