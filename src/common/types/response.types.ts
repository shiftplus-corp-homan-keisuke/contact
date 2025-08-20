/**
 * 回答関連の型定義
 * 要件2: 問い合わせ・回答管理機能
 */

import { User } from './user.types';
import { Inquiry } from './inquiry.types';

export interface Response {
    id: string;
    inquiryId: string;
    userId: string;
    content: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ResponseData {
    content: string;
    isPublic?: boolean;
}

export interface ResponseUpdate {
    content?: string;
    isPublic?: boolean;
}

export interface ResponseDetail extends Response {
    user: User;
    inquiry: Inquiry;
    history: ResponseHistory[];
}

export interface ResponseHistory {
    id: string;
    responseId: string;
    oldContent: string | null;
    newContent: string;
    changedBy: string;
    changedAt: Date;
}

// 共通レスポンス型（APIレスポンス用）
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
}

export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

export interface ResponseMeta {
    timestamp: Date;
    requestId: string;
    version: string;
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// 検索結果型
export interface SearchResult<T> {
    items: T[];
    total: number;
    searchTime: number;
    query: string;
}