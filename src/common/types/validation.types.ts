/**
 * バリデーション関連の型定義
 */

export interface ValidationError {
    field: string;
    message: string;
    code?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface DateRange {
    startDate: Date;
    endDate: Date;
}