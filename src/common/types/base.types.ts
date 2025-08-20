// 基本型定義
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

// API レスポンス型
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: ResponseMeta;
}

export interface ApiError {
    code: string;
    message: string;
    details?: ValidationError[];
    timestamp: string;
    path?: string;
}

export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

export interface ResponseMeta {
    timestamp: string;
    requestId?: string;
    version?: string;
}

// ページネーション型
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

// 検索・フィルター型
export interface SearchOptions {
    query?: string;
    filters?: Record<string, any>;
    pagination?: PaginationOptions;
}

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

// ユーザーコンテキスト型
export interface UserContext {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
}

// APIキーコンテキスト型
export interface ApiKeyContext {
    id: string;
    appId: string;
    permissions: string[];
    rateLimit: number;
    isActive: boolean;
}

// ファイル関連型
export interface FileMetadata {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    uploadedBy: string;
    uploadedAt: Date;
    isScanned?: boolean;
    scanResult?: 'clean' | 'infected' | 'suspicious';
}

// 通知関連型
export interface NotificationPayload {
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    recipients: string[];
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}

// 統計・分析型
export interface StatisticsData {
    period: DateRange;
    metrics: Record<string, number>;
    trends?: TrendData[];
}

export interface TrendData {
    date: Date;
    value: number;
    change?: number;
    changePercent?: number;
}