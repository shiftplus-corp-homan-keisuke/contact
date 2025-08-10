import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T = any> {
  @ApiProperty({ description: '処理成功フラグ' })
  success: boolean;

  @ApiProperty({ description: 'レスポンスデータ' })
  data?: T;

  @ApiProperty({ description: 'メッセージ' })
  message?: string;

  @ApiProperty({ description: 'エラー情報' })
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty({ description: 'タイムスタンプ' })
  timestamp: string;

  constructor(data?: T, success: boolean = true, message?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}

export class PaginatedResponseDto<T> extends BaseResponseDto<{
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  constructor(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    const totalPages = Math.ceil(total / limit);
    super({
      items,
      total,
      page,
      limit,
      totalPages,
    });
  }
}