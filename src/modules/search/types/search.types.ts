export interface SearchFilters {
    appId?: string;
    status?: string[];
    category?: string[];
    assignedTo?: string;
    priority?: string[];
    customerEmail?: string;
    startDate?: Date;
    endDate?: Date;
}

export interface SearchCriteria {
    query: string;
    filters?: SearchFilters;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface FullTextSearchResult {
    id: string;
    title: string;
    content: string;
    type: 'inquiry' | 'response' | 'faq';
    score: number;
    highlights: string[];
    metadata: Record<string, any>;
    createdAt: Date;
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

export interface DateRange {
    startDate?: Date;
    endDate?: Date;
}

export interface SearchMetadata {
    appId?: string;
    category?: string;
    status?: string;
    priority?: string;
    customerEmail?: string;
    assignedTo?: string;
}