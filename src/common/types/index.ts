/**
 * 共通型定義のバレルエクスポート
 */

// ユーザー関連
export * from './user.types';

// 問い合わせ関連
export * from './inquiry.types';

// 回答関連
export * from './response.types';

// バリデーション関連
export * from './validation.types';

// API関連
export * from './api.types';

// 通知関連
export * from './notification.types';

// 基本型定義
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SoftDeleteEntity extends BaseEntity {
    deletedAt?: Date;
}

// バリデーション結果型
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
    value?: any;
    code?: string;
}

// ページネーション型
export interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

// 共通フィルター型
export interface BaseFilters {
    createdAt?: DateRange;
    updatedAt?: DateRange;
    isActive?: boolean;
}

// 日付範囲型
export interface DateRange {
    startDate: Date;
    endDate: Date;
}

// ソート設定型
export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

// 検索設定型
export interface SearchConfig {
    query: string;
    fields: string[];
    fuzzy?: boolean;
    caseSensitive?: boolean;
}