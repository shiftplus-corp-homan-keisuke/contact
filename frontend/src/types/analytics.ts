// 分析・統計関連の型定義
export interface DashboardStats {
    totalInquiries: number;
    newInquiries: number;
    inProgressInquiries: number;
    resolvedInquiries: number;
    averageResponseTime: number; // 時間単位
    satisfactionScore?: number;
}

export interface InquiryTrend {
    date: string;
    count: number;
    resolved: number;
}

export interface CategoryStats {
    category: string;
    count: number;
    percentage: number;
}

export interface AppStats {
    appId: string;
    appName: string;
    count: number;
    percentage: number;
}

export interface ResponseTimeStats {
    period: string;
    averageTime: number;
    targetTime: number;
}

export interface RecentActivity {
    id: string;
    type: 'inquiry_created' | 'inquiry_resolved' | 'response_added';
    title: string;
    description: string;
    timestamp: string;
    inquiryId?: string;
}

export interface PerformanceMetrics {
    totalHandled: number;
    averageResponseTime: number;
    resolutionRate: number;
    customerSatisfaction: number;
}