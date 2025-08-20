// 問い合わせ関連の型定義
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
    createdAt: string;
    updatedAt: string;
    application?: Application;
    responses?: Response[];
}

export interface Application {
    id: string;
    name: string;
    description?: string;
}

export interface Response {
    id: string;
    inquiryId: string;
    userId: string;
    content: string;
    isPublic: boolean;
    createdAt: string;
    user?: {
        id: string;
        name: string;
    };
}

export type InquiryStatus = 'new' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type InquiryPriority = 'low' | 'medium' | 'high' | 'urgent';

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

export interface InquiryFilters {
    appId?: string;
    status?: InquiryStatus[];
    category?: string[];
    assignedTo?: string;
    dateRange?: {
        start: string;
        end: string;
    };
    priority?: InquiryPriority[];
    customerEmail?: string;
}

export interface SearchCriteria {
    query?: string;
    filters?: InquiryFilters;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    [key: string]: unknown;
}