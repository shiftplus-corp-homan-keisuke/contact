import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorDto {
    @ApiProperty({ description: 'フィールド名' })
    field: string;

    @ApiProperty({ description: 'エラーメッセージ' })
    message: string;

    @ApiProperty({ description: '入力値', required: false })
    value?: any;

    constructor(field: string, message: string, value?: any) {
        this.field = field;
        this.message = message;
        this.value = value;
    }
}

export class ErrorDto {
    @ApiProperty({ description: 'エラーコード' })
    code: string;

    @ApiProperty({ description: 'エラーメッセージ' })
    message: string;

    @ApiProperty({ description: 'エラー詳細', required: false, type: [ValidationErrorDto] })
    details?: ValidationErrorDto[];

    @ApiProperty({ description: 'タイムスタンプ' })
    timestamp: string;

    @ApiProperty({ description: 'リクエストパス', required: false })
    path?: string;

    constructor(code: string, message: string, details?: ValidationErrorDto[], path?: string) {
        this.code = code;
        this.message = message;
        this.details = details;
        this.timestamp = new Date().toISOString();
        this.path = path;
    }
}

export class MetaDto {
    @ApiProperty({ description: 'タイムスタンプ' })
    timestamp: string;

    @ApiProperty({ description: 'リクエストID', required: false })
    requestId?: string;

    @ApiProperty({ description: 'APIバージョン', required: false })
    version?: string;

    constructor(requestId?: string, version?: string) {
        this.timestamp = new Date().toISOString();
        this.requestId = requestId;
        this.version = version || '1.0.0';
    }
}

export class BaseResponseDto<T = any> {
    @ApiProperty({ description: '処理成功フラグ' })
    success: boolean;

    @ApiProperty({ description: 'レスポンスデータ', required: false })
    data?: T;

    @ApiProperty({ description: 'エラー情報', required: false })
    error?: ErrorDto;

    @ApiProperty({ description: 'メタデータ', required: false })
    meta?: MetaDto;

    constructor(data?: T, meta?: MetaDto) {
        this.success = true;
        this.data = data;
        this.meta = meta || new MetaDto();
    }

    static success<T>(data?: T, meta?: MetaDto): BaseResponseDto<T> {
        return new BaseResponseDto(data, meta);
    }

    static error(error: ErrorDto): BaseResponseDto {
        const response = new BaseResponseDto();
        response.success = false;
        response.error = error;
        response.meta = new MetaDto();
        return response;
    }
}