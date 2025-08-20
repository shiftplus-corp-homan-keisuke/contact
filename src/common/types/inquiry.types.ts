/**
 * 問い合わせ関連の型定義
 * 要件1: 問い合わせ登録機能
 * 要件2: 問い合わせ・回答管理機能
 */

import { User } from './user.types';

export type InquiryStatus = 'new' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type InquiryPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Inquiry {
    id: string;
    appId: string;
    title: string;
    content: string;
    status: InquiryStatus;
    priority: InquiryPriority;
    category?: string;
    customerEmail?: string;
    customerName?: string;
    assignedTo?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateInquiryRequest {
    title: string;
    content: string;
    appId: string;
    customerEmail?: string;
    customerName?: string;
    category?: string;
    priority?: InquiryPriority;
}

export interface UpdateInquiryRequest {
    title?: string;
    content?: string;
    status?: InquiryStatus;
    priority?: InquiryPriority;
    category?: string;
    assignedTo?: string;
}

export interface InquiryDetail extends Inquiry {
    app: Application;
    assignedUser?: User;
    responses: InquiryResponse[];
    statusHistory: StatusHistory[];
}

// 循環参照を避けるための基本的なResponse型
export interface InquiryResponse {
    id: string;
    inquiryId: string;
    userId: string;
    content: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface InquiryHistory {
    id: string;
    inquiryId: string;
    fieldName: string;
    oldValue: string | null;
    newValue: string;
    changedBy: string;
    changedAt: Date;
}

export interface StatusHistory {
    id: string;
    inquiryId: string;
    oldStatus: InquiryStatus | null;
    newStatus: InquiryStatus;
    changedBy: string;
    comment?: string;
    changedAt: Date;
}

// 検索・フィルタリング関連
export interface InquiryFilters {
    appId?: string;
    status?: InquiryStatus[];
    category?: string[];
    assignedTo?: string;
    dateRange?: DateRange;
    priority?: InquiryPriority[];
    customerEmail?: string;
}

export interface SearchCriteria {
    query: string;
    filters?: InquiryFilters;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

// アプリケーション関連
export interface Application {
    id: string;
    name: string;
    description?: string;
    apiKey?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateApplicationRequest {
    name: string;
    description?: string;
}

export interface UpdateApplicationRequest {
    name?: string;
    description?: string;
    isActive?: boolean;
}