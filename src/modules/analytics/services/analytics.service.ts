import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { Application } from '../../inquiries/entities/application.entity';
import {
    InquiryStatistics,
    ResponseTimeAnalytics,
    AnalyticsFilters,
    DashboardData,
    CategoryStats,
    AppStats,
    StatusStats,
    PriorityStats,
    HourlyStats,
    DailyStats,
    TrendData
} from '../types/analytics.types';

/**
 * 分析サービス
 * 問い合わせデータの統計分析を提供
 */
@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(Response)
        private readonly responseRepository: Repository<Response>,
        @InjectRepository(Application)
        private readonly applicationRepository: Repository<Application>,
    ) { }

    /**
     * 基本統計情報を取得
     */
    async getInquiryStatistics(filters: AnalyticsFilters = {}): Promise<InquiryStatistics> {
        this.logger.log('基本統計情報を取得中', { filters });

        const queryBuilder = this.inquiryRepository.createQueryBuilder('inquiry')
            .leftJoinAndSelect('inquiry.app', 'app')
            .leftJoinAndSelect('inquiry.responses', 'responses');

        // フィルター適用
        this.applyFilters(queryBuilder, filters);

        const inquiries = await queryBuilder.getMany();
        const totalInquiries = inquiries.length;

        if (totalInquiries === 0) {
            return this.getEmptyStatistics();
        }

        // ステータス別集計
        const statusCounts = this.groupByStatus(inquiries);

        // カテゴリ別集計
        const categoryBreakdown = await this.getCategoryBreakdown(inquiries);

        // アプリ別集計
        const appBreakdown = await this.getAppBreakdown(inquiries);

        // 優先度別集計
        const priorityBreakdown = this.getPriorityBreakdown(inquiries);

        // 応答時間計算
        const { averageResponseTime, averageResolutionTime } = this.calculateResponseTimes(inquiries);

        const statistics: InquiryStatistics = {
            totalInquiries,
            newInquiries: statusCounts.new || 0,
            inProgressInquiries: statusCounts.in_progress || 0,
            resolvedInquiries: statusCounts.resolved || 0,
            closedInquiries: statusCounts.closed || 0,
            averageResponseTime,
            averageResolutionTime,
            categoryBreakdown,
            appBreakdown,
            statusBreakdown: this.convertToStatusStats(statusCounts, totalInquiries),
            priorityBreakdown,
        };

        this.logger.log('基本統計情報を取得完了', { totalInquiries });
        return statistics;
    }

    /**
     * 応答時間分析を取得
     */
    async getResponseTimeAnalytics(filters: AnalyticsFilters = {}): Promise<ResponseTimeAnalytics> {
        this.logger.log('応答時間分析を取得中', { filters });

        const queryBuilder = this.inquiryRepository.createQueryBuilder('inquiry')
            .leftJoinAndSelect('inquiry.responses', 'responses')
            .leftJoinAndSelect('inquiry.app', 'app');

        this.applyFilters(queryBuilder, filters);

        const inquiries = await queryBuilder.getMany();

        const responseTimes = this.extractResponseTimes(inquiries);
        const resolutionTimes = this.extractResolutionTimes(inquiries);

        const analytics: ResponseTimeAnalytics = {
            averageFirstResponse: this.calculateAverage(responseTimes),
            averageResolution: this.calculateAverage(resolutionTimes),
            medianFirstResponse: this.calculateMedian(responseTimes),
            medianResolution: this.calculateMedian(resolutionTimes),
            responseTimeByHour: await this.getResponseTimeByHour(inquiries),
            responseTimeByDay: await this.getResponseTimeByDay(inquiries, filters),
            responseTimeByCategory: this.getResponseTimeByCategory(inquiries),
        };

        this.logger.log('応答時間分析を取得完了');
        return analytics;
    }

    /**
     * ダッシュボードデータを取得
     */
    async getDashboardData(filters: AnalyticsFilters = {}): Promise<DashboardData> {
        this.logger.log('ダッシュボードデータを取得中', { filters });

        const [statistics, responseTimeAnalytics] = await Promise.all([
            this.getInquiryStatistics(filters),
            this.getResponseTimeAnalytics(filters),
        ]);

        const recentTrends = await this.getRecentTrends(filters);
        const topCategories = statistics.categoryBreakdown.slice(0, 5);
        const topApps = statistics.appBreakdown.slice(0, 5);

        const dashboardData: DashboardData = {
            statistics,
            responseTimeAnalytics,
            recentTrends,
            topCategories,
            topApps,
        };

        this.logger.log('ダッシュボードデータを取得完了');
        return dashboardData;
    }

    /**
     * 最近のトレンドデータを取得
     */
    private async getRecentTrends(filters: AnalyticsFilters): Promise<TrendData[]> {
        const endDate = filters.endDate || new Date();
        const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30日前

        const queryBuilder = this.inquiryRepository.createQueryBuilder('inquiry')
            .select('DATE(inquiry.createdAt)', 'date')
            .addSelect('COUNT(*)', 'count')
            .where('inquiry.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
            .groupBy('DATE(inquiry.createdAt)')
            .orderBy('date', 'ASC');

        const results = await queryBuilder.getRawMany();

        return results.map(result => ({
            date: result.date,
            value: parseInt(result.count),
            metric: 'inquiry_count',
        }));
    }

    /**
     * フィルターをクエリビルダーに適用
     */
    private applyFilters(queryBuilder: any, filters: AnalyticsFilters): void {
        if (filters.startDate && filters.endDate) {
            queryBuilder.andWhere('inquiry.createdAt BETWEEN :startDate AND :endDate', {
                startDate: filters.startDate,
                endDate: filters.endDate,
            });
        }

        if (filters.appIds && filters.appIds.length > 0) {
            queryBuilder.andWhere('inquiry.appId IN (:...appIds)', { appIds: filters.appIds });
        }

        if (filters.categories && filters.categories.length > 0) {
            queryBuilder.andWhere('inquiry.category IN (:...categories)', { categories: filters.categories });
        }

        if (filters.statuses && filters.statuses.length > 0) {
            queryBuilder.andWhere('inquiry.status IN (:...statuses)', { statuses: filters.statuses });
        }

        if (filters.priorities && filters.priorities.length > 0) {
            queryBuilder.andWhere('inquiry.priority IN (:...priorities)', { priorities: filters.priorities });
        }

        if (filters.assignedTo && filters.assignedTo.length > 0) {
            queryBuilder.andWhere('inquiry.assignedTo IN (:...assignedTo)', { assignedTo: filters.assignedTo });
        }
    }

    /**
     * ステータス別にグループ化
     */
    private groupByStatus(inquiries: Inquiry[]): Record<string, number> {
        return inquiries.reduce((acc, inquiry) => {
            acc[inquiry.status] = (acc[inquiry.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    /**
     * カテゴリ別統計を取得
     */
    private async getCategoryBreakdown(inquiries: Inquiry[]): Promise<CategoryStats[]> {
        const categoryMap = new Map<string, { count: number; responseTimes: number[] }>();

        inquiries.forEach(inquiry => {
            const category = inquiry.category || 'その他';
            if (!categoryMap.has(category)) {
                categoryMap.set(category, { count: 0, responseTimes: [] });
            }

            const categoryData = categoryMap.get(category)!;
            categoryData.count++;

            // 初回応答時間を計算
            const firstResponse = inquiry.responses?.[0];
            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                categoryData.responseTimes.push(responseTime);
            }
        });

        const totalInquiries = inquiries.length;
        const categoryStats: CategoryStats[] = [];

        categoryMap.forEach((data, category) => {
            categoryStats.push({
                category,
                count: data.count,
                percentage: (data.count / totalInquiries) * 100,
                averageResponseTime: data.responseTimes.length > 0
                    ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
                    : 0,
            });
        });

        return categoryStats.sort((a, b) => b.count - a.count);
    }

    /**
     * アプリ別統計を取得
     */
    private async getAppBreakdown(inquiries: Inquiry[]): Promise<AppStats[]> {
        const appMap = new Map<string, {
            appName: string;
            count: number;
            responseTimes: number[];
            resolutionTimes: number[]
        }>();

        inquiries.forEach(inquiry => {
            const appId = inquiry.appId;
            const appName = inquiry.app?.name || 'Unknown App';

            if (!appMap.has(appId)) {
                appMap.set(appId, { appName, count: 0, responseTimes: [], resolutionTimes: [] });
            }

            const appData = appMap.get(appId)!;
            appData.count++;

            // 応答時間と解決時間を計算
            const firstResponse = inquiry.responses?.[0];
            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                appData.responseTimes.push(responseTime);
            }

            if (inquiry.status === 'resolved' || inquiry.status === 'closed') {
                const resolutionTime = (inquiry.updatedAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                appData.resolutionTimes.push(resolutionTime);
            }
        });

        const totalInquiries = inquiries.length;
        const appStats: AppStats[] = [];

        appMap.forEach((data, appId) => {
            appStats.push({
                appId,
                appName: data.appName,
                count: data.count,
                percentage: (data.count / totalInquiries) * 100,
                averageResponseTime: data.responseTimes.length > 0
                    ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
                    : 0,
                averageResolutionTime: data.resolutionTimes.length > 0
                    ? data.resolutionTimes.reduce((sum, time) => sum + time, 0) / data.resolutionTimes.length
                    : 0,
            });
        });

        return appStats.sort((a, b) => b.count - a.count);
    }

    /**
     * 優先度別統計を取得
     */
    private getPriorityBreakdown(inquiries: Inquiry[]): PriorityStats[] {
        const priorityMap = new Map<string, { count: number; responseTimes: number[] }>();

        inquiries.forEach(inquiry => {
            const priority = inquiry.priority || 'medium';
            if (!priorityMap.has(priority)) {
                priorityMap.set(priority, { count: 0, responseTimes: [] });
            }

            const priorityData = priorityMap.get(priority)!;
            priorityData.count++;

            const firstResponse = inquiry.responses?.[0];
            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                priorityData.responseTimes.push(responseTime);
            }
        });

        const totalInquiries = inquiries.length;
        const priorityStats: PriorityStats[] = [];

        priorityMap.forEach((data, priority) => {
            priorityStats.push({
                priority,
                count: data.count,
                percentage: (data.count / totalInquiries) * 100,
                averageResponseTime: data.responseTimes.length > 0
                    ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
                    : 0,
            });
        });

        return priorityStats.sort((a, b) => b.count - a.count);
    }

    /**
     * ステータス統計に変換
     */
    private convertToStatusStats(statusCounts: Record<string, number>, total: number): StatusStats[] {
        return Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count,
            percentage: (count / total) * 100,
        }));
    }

    /**
     * 応答時間を計算
     */
    private calculateResponseTimes(inquiries: Inquiry[]): { averageResponseTime: number; averageResolutionTime: number } {
        const responseTimes: number[] = [];
        const resolutionTimes: number[] = [];

        inquiries.forEach(inquiry => {
            const firstResponse = inquiry.responses?.[0];
            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                responseTimes.push(responseTime);
            }

            if (inquiry.status === 'resolved' || inquiry.status === 'closed') {
                const resolutionTime = (inquiry.updatedAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                resolutionTimes.push(resolutionTime);
            }
        });

        return {
            averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
            averageResolutionTime: resolutionTimes.length > 0 ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length : 0,
        };
    }

    /**
     * 応答時間を抽出
     */
    private extractResponseTimes(inquiries: Inquiry[]): number[] {
        return inquiries
            .filter(inquiry => inquiry.responses && inquiry.responses.length > 0)
            .map(inquiry => {
                const firstResponse = inquiry.responses[0];
                return (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
            });
    }

    /**
     * 解決時間を抽出
     */
    private extractResolutionTimes(inquiries: Inquiry[]): number[] {
        return inquiries
            .filter(inquiry => inquiry.status === 'resolved' || inquiry.status === 'closed')
            .map(inquiry => (inquiry.updatedAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60));
    }

    /**
     * 平均値を計算
     */
    private calculateAverage(values: number[]): number {
        if (values.length === 0) return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    /**
     * 中央値を計算
     */
    private calculateMedian(values: number[]): number {
        if (values.length === 0) return 0;

        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        } else {
            return sorted[middle];
        }
    }

    /**
     * 時間別応答時間を取得
     */
    private async getResponseTimeByHour(inquiries: Inquiry[]): Promise<HourlyStats[]> {
        const hourlyMap = new Map<number, { responseTimes: number[]; count: number }>();

        inquiries.forEach(inquiry => {
            const hour = inquiry.createdAt.getHours();
            if (!hourlyMap.has(hour)) {
                hourlyMap.set(hour, { responseTimes: [], count: 0 });
            }

            const hourData = hourlyMap.get(hour)!;
            hourData.count++;

            const firstResponse = inquiry.responses?.[0];
            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                hourData.responseTimes.push(responseTime);
            }
        });

        const hourlyStats: HourlyStats[] = [];
        for (let hour = 0; hour < 24; hour++) {
            const data = hourlyMap.get(hour) || { responseTimes: [], count: 0 };
            hourlyStats.push({
                hour,
                averageResponseTime: data.responseTimes.length > 0
                    ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
                    : 0,
                inquiryCount: data.count,
            });
        }

        return hourlyStats;
    }

    /**
     * 日別応答時間を取得
     */
    private async getResponseTimeByDay(inquiries: Inquiry[], filters: AnalyticsFilters): Promise<DailyStats[]> {
        const dailyMap = new Map<string, {
            responseTimes: number[];
            inquiryCount: number;
            resolvedCount: number
        }>();

        inquiries.forEach(inquiry => {
            const date = inquiry.createdAt.toISOString().split('T')[0];
            if (!dailyMap.has(date)) {
                dailyMap.set(date, { responseTimes: [], inquiryCount: 0, resolvedCount: 0 });
            }

            const dayData = dailyMap.get(date)!;
            dayData.inquiryCount++;

            if (inquiry.status === 'resolved' || inquiry.status === 'closed') {
                dayData.resolvedCount++;
            }

            const firstResponse = inquiry.responses?.[0];
            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                dayData.responseTimes.push(responseTime);
            }
        });

        const dailyStats: DailyStats[] = [];
        dailyMap.forEach((data, date) => {
            dailyStats.push({
                date,
                averageResponseTime: data.responseTimes.length > 0
                    ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
                    : 0,
                inquiryCount: data.inquiryCount,
                resolvedCount: data.resolvedCount,
            });
        });

        return dailyStats.sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * カテゴリ別応答時間を取得
     */
    private getResponseTimeByCategory(inquiries: Inquiry[]): any[] {
        const categoryMap = new Map<string, { responseTimes: number[]; resolutionTimes: number[] }>();

        inquiries.forEach(inquiry => {
            const category = inquiry.category || 'その他';
            if (!categoryMap.has(category)) {
                categoryMap.set(category, { responseTimes: [], resolutionTimes: [] });
            }

            const categoryData = categoryMap.get(category)!;

            const firstResponse = inquiry.responses?.[0];
            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                categoryData.responseTimes.push(responseTime);
            }

            if (inquiry.status === 'resolved' || inquiry.status === 'closed') {
                const resolutionTime = (inquiry.updatedAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                categoryData.resolutionTimes.push(resolutionTime);
            }
        });

        const categoryStats: any[] = [];
        categoryMap.forEach((data, category) => {
            categoryStats.push({
                category,
                averageResponseTime: data.responseTimes.length > 0
                    ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
                    : 0,
                averageResolutionTime: data.resolutionTimes.length > 0
                    ? data.resolutionTimes.reduce((sum, time) => sum + time, 0) / data.resolutionTimes.length
                    : 0,
            });
        });

        return categoryStats;
    }

    /**
     * 空の統計データを返す
     */
    private getEmptyStatistics(): InquiryStatistics {
        return {
            totalInquiries: 0,
            newInquiries: 0,
            inProgressInquiries: 0,
            resolvedInquiries: 0,
            closedInquiries: 0,
            averageResponseTime: 0,
            averageResolutionTime: 0,
            categoryBreakdown: [],
            appBreakdown: [],
            statusBreakdown: [],
            priorityBreakdown: [],
        };
    }
}