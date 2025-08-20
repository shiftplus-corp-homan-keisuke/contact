// API関連の型定義
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Array<{
            field: string;
            message: string;
        }>;
    };
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Array<{
        field: string;
        message: string;
    }>;
}