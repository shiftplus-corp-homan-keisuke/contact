// 分析・統計API
import { apiClient } from './api';
import {
    DashboardStats,
    InquiryTrend,
    CategoryStats,
    AppStats,
    RecentActivity,
    PerformanceMetrics
} from '@/types/analytics';

export const analyticsApi = {
    // ダッシュボード統計取得
    async getDashboardStats(): Promise<DashboardStats> {
        const response = await apiClient.get<DashboardStats>('/analytics/dashboard');
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || '統計データの取得に失敗しました');
    },

    // 問い合わせトレンド取得
    async getInquiryTrend(days: number = 30): Promise<InquiryTrend[]> {
        const response = await apiClient.get<InquiryTrend[]>('/analytics/trend', { days });
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'トレンドデータの取得に失敗しました');
    },

    // カテゴリ別統計取得
    async getCategoryStats(): Promise<CategoryStats[]> {
        const response = await apiClient.get<CategoryStats[]>('/analytics/categories');
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'カテゴリ統計の取得に失敗しました');
    },

    // アプリ別統計取得
    async getAppStats(): Promise<AppStats[]> {
        const response = await apiClient.get<AppStats[]>('/analytics/apps');
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'アプリ統計の取得に失敗しました');
    },

    // 最近のアクティビティ取得
    async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
        const response = await apiClient.get<RecentActivity[]>('/analytics/activity', { limit });
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || '最近のアクティビティの取得に失敗しました');
    },

    // パフォーマンス指標取得
    async getPerformanceMetrics(period: string = '30d'): Promise<PerformanceMetrics> {
        const response = await apiClient.get<PerformanceMetrics>('/analytics/performance', { period });
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'パフォーマンス指標の取得に失敗しました');
    },
};