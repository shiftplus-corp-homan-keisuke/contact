export interface FAQFilters {
    appId?: string;
    category?: string;
    isPublished?: boolean;
    tags?: string[];
    search?: string;
}

export interface FAQAnalytics {
    totalFAQs: number;
    publishedFAQs: number;
    categoriesCount: number;
    mostViewedFAQs: Array<{
        id: string;
        question: string;
        viewCount: number;
    }>;
    categoryBreakdown: Array<{
        category: string;
        count: number;
    }>;
}

export interface FAQGenerationOptions {
    minClusterSize: number;
    maxClusters: number;
    similarityThreshold: number;
    dateRange?: {
        startDate: Date;
        endDate: Date;
    };
    categories?: string[];
}

export interface FAQCluster {
    id: string;
    inquiryIds: string[];
    representativeQuestion: string;
    suggestedAnswer: string;
    similarity: number;
    category?: string;
}