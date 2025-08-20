/**
 * API共通レスポンス形式
 * 要件7.2, 7.3: 標準HTTPステータスコードとJSON形式レスポンス
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsObject, IsArray } from 'class-validator';

/**
 * API成功レスポンスの基底クラス
 */
export class ApiSuccessResponseDto<T = any> {
    @ApiProperty({
        description: 'リクエストの成功/失敗を示すフラグ',
        example: true
    })
    @IsBoolean()
    success: boolean = true;

    @ApiProperty({
        description: 'レスポンスデータ',
        required: false
    })
    @IsOptional()
    data?: T;

    @ApiProperty({
        description: 'メッセージ',
        required: false,
        example: 'リクエストが正常に処理されました'
    })
    @IsOptional()
    @IsString()
    message?: string;

    @ApiProperty({
        description: 'メタデータ（ページネーション情報など）',
        required: false
    })
    @IsOptional()
    @IsObject()
    meta?: any;

    constructor(data?: T, message?: string, meta?: any) {
        this.success = true;
        this.data = data;
        this.message = message;
        this.meta = meta;
    }
}

/**
 * APIエラーレスポンスの基底クラス
 */
export class ApiErrorResponseDto {
    @ApiProperty({
        description: 'リクエストの成功/失敗を示すフラグ',
        example: false
    })
    @IsBoolean()
    success: boolean = false;

    @ApiProperty({
        description: 'エラー情報',
        type: 'object'
    })
    @IsObject()
    error: {
        code: string;
        message: string;
        details?: any[];
        timestamp?: string;
        path?: string;
    };

    constructor(code: string, message: string, details?: any[], path?: string) {
        this.success = false;
        this.error = {
            code,
            message,
            details,
            timestamp: new Date().toISOString(),
            path
        };
    }
}

/**
 * バリデーションエラーの詳細情報
 */
export class ValidationErrorDetailDto {
    @ApiProperty({
        description: 'エラーが発生したフィールド名',
        example: 'title'
    })
    @IsString()
    field: string;

    @ApiProperty({
        description: 'エラーメッセージ',
        example: 'タイトルは必須項目です'
    })
    @IsString()
    message: string;

    @ApiProperty({
        description: '入力された値',
        required: false,
        example: ''
    })
    @IsOptional()
    value?: any;

    constructor(field: string, message: string, value?: any) {
        this.field = field;
        this.message = message;
        this.value = value;
    }
}

/**
 * ページネーション付きレスポンス
 */
export class PaginatedApiResponseDto<T = any> extends ApiSuccessResponseDto<T[]> {
    @ApiProperty({
        description: 'ページネーション情報',
        type: 'object'
    })
    @IsObject()
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };

    constructor(
        items: T[],
        total: number,
        page: number,
        limit: number,
        message?: string
    ) {
        const totalPages = Math.ceil(total / limit);
        const meta = {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };

        super(items, message, meta);
        this.meta = meta;
    }
}

/**
 * 作成成功レスポンス（201 Created用）
 */
export class CreatedResponseDto<T = any> extends ApiSuccessResponseDto<T> {
    constructor(data: T, message: string = 'リソースが正常に作成されました') {
        super(data, message);
    }
}

/**
 * 更新成功レスポンス（200 OK用）
 */
export class UpdatedResponseDto<T = any> extends ApiSuccessResponseDto<T> {
    constructor(data: T, message: string = 'リソースが正常に更新されました') {
        super(data, message);
    }
}

/**
 * 削除成功レスポンス（200 OK用）
 */
export class DeletedResponseDto extends ApiSuccessResponseDto<null> {
    constructor(message: string = 'リソースが正常に削除されました') {
        super(null, message);
    }
}

/**
 * 一般的なエラーコード定数
 */
export const API_ERROR_CODES = {
    // 400番台エラー
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_REQUEST: 'INVALID_REQUEST',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',

    // 401番台エラー
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INVALID_API_KEY: 'INVALID_API_KEY',

    // 403番台エラー
    FORBIDDEN: 'FORBIDDEN',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

    // 404番台エラー
    NOT_FOUND: 'NOT_FOUND',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

    // 409番台エラー
    CONFLICT: 'CONFLICT',
    DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',

    // 429番台エラー
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

    // 500番台エラー
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    VECTORIZATION_ERROR: 'VECTORIZATION_ERROR',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];