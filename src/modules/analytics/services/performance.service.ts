import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { User } from '../../users/entities/user.entity';
import {
    UserPerformance,
    TeamPerformance,
    SLACompliance,
    SLAViolation,
    CategorySLACompliance,
    PrioritySLACompliance,
    TrendAnalysis,
    TrendDataPoint,
    AnalyticsFilters,
    WorkloadDistribution
} from '../types/analytics.types';

/**
 * パフォーマンス分析サービス
 * ユーザー・チーム別パフォーマンス分析、SLA監視機能を提供
 */
@Injectable()
export class PerformanceService {
    private readonly logger = new Logger(PerformanceService.name);

    // SLA目標時間（時間単位）
    private readonly SLA_TARGETS = {
        urgent: 1,    // 1時間
        high: 4,      // 4時間
        medium: 24,   // 24時間
        low: 72,      // 72時間
    };

    constructor(
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(Response)
        private readonly responseRepository: Repository<Response>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    /**
     * ユーザー別パフォーマンス分析を取得
     */
    async getUserPerformance(userId: string, filters: AnalyticsFilters = {}): Promise<UserPerformance> {
        this.logger.log(`ユーザーパフォーマンス分析を取得中: ${userId}`, { filters });

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error(`ユーザーが見つかりません: ${userId}`);
        }

        const queryBuilder = this.inquiryRepository.createQueryBuilder('inquiry')
            .leftJoinAndSelect('inquiry.responses', 'responses')
            .where('inquiry.assignedTo = :userId', { userId });

        this.applyFilters(queryBuilder, filters);

        const inquiries = await queryBuilder.getMany();
        const totalInquiries = inquiries.length;

        if (totalInquiries === 0) {
            return this.getEmptyUserPerformance(userId, user.name);
        }

        const resolvedInquiries = inquiries.filter(
            inquiry => inquiry.status === 'resolved' || inquiry.status === 'closed'
        ).length;

        const { averageResponseTime, averageResolutionTime } = this.calculateResponseTimes(inquiries);
        const resolutionRate = (resolvedInquiries / totalInquiries) * 100;
        const workload = this.calculateWorkload(totalInquiries);
        const efficiency = this.calculateEfficiency(resolutionRate, averageResponseTime, averageResolutionTime);

        const performance: UserPerformance = {
            userId,
            userName: user.name,
            totalInquiries,
            resolvedInquiries,
            averageResponseTime,
            averageResolutionTime,
            resolutionRate,
            workload,
            efficiency,
        };

        this.logger.log(`ユーザーパフォーマンス分析を取得完了: ${userId}`, {
            totalInquiries,
            resolutionRate: Math.round(resolutionRate * 100) / 100
        });

        return performance;
    }

    /**
     * チーム別パフォーマンス分析を取得
     */
    async getTeamPerformance(teamId: string, filters: AnalyticsFilters = {}): Promise<TeamPerformance> {
        this.logger.log(`チームパフォーマンス分析を取得中: ${teamId}`, { filters });

        // チームメンバーを取得（実際の実装では、チームテーブルから取得）
        const teamMembers = await this.userRepository.find({
            // 仮の実装：全ユーザーを取得（実際にはチームIDでフィルタリング）
        });

        if (teamMembers.length === 0) {
            throw new Error(`チームメンバーが見つかりません: ${teamId}`);
        }

        // 各メンバーのパフォーマンスを取得
        const memberPerformances = await Promise.all(
            teamMembers.map(member => this.getUserPerformance(member.id, filters))
        );

        // チーム全体の統計を計算
        const totalInquiries = memberPerformances.reduce((sum, perf) => sum + perf.totalInquiries, 0);
        const resolvedInquiries = memberPerformances.reduce((sum, perf) => sum + perf.resolvedInquiries, 0);

        const averageResponseTime = memberPerformances.length > 0
            ? memberPerformances.reduce((sum, perf) => sum + perf.averageResponseTime, 0) / memberPerformances.length
            : 0;

        const averageResolutionTime = memberPerformances.length > 0
            ? memberPerformances.reduce((sum, perf) => sum + perf.averageResolutionTime, 0) / memberPerformances.length
            : 0;

        const resolutionRate = totalInquiries > 0 ? (resolvedInquiries / totalInquiries) * 100 : 0;
        const teamEfficiency = memberPerformances.length > 0
            ? memberPerformances.reduce((sum, perf) => sum + perf.efficiency, 0) / memberPerformances.length
            : 0;

        const workloadDistribution = this.calculateWorkloadDistribution(memberPerformances);

        const teamPerformance: TeamPerformance = {
            teamId,
            teamName: `Team ${teamId}`, // 実際の実装ではチーム名を取得
            members: memberPerformances,
            totalInquiries,
            resolvedInquiries,
            averageResponseTime,
            averageResolutionTime,
            resolutionRate,
            teamEfficiency,
            workloadDistribution,
        };

        this.logger.log(`チームパフォーマンス分析を取得完了: ${teamId}`, {
            memberCount: memberPerformances.length,
            totalInquiries,
            teamEfficiency: Math.round(teamEfficiency * 100) / 100
        });

        return teamPerformance;
    }

    /**
     * SLA達成率監視を取得
     */
    async getSLACompliance(filters: AnalyticsFilters = {}): Promise<SLACompliance> {
        this.logger.log('SLA達成率監視を取得中', { filters });

        const queryBuilder = this.inquiryRepository.createQueryBuilder('inquiry')
            .leftJoinAndSelect('inquiry.responses', 'responses');

        this.applyFilters(queryBuilder, filters);

        const inquiries = await queryBuilder.getMany();
        const totalInquiries = inquiries.length;

        if (totalInquiries === 0) {
            return this.getEmptySLACompliance();
        }

        const violations: SLAViolation[] = [];
        let slaCompliantInquiries = 0;
        let totalResponseTime = 0;
        let responseTimeCount = 0;

        inquiries.forEach(inquiry => {
            const firstResponse = inquiry.responses?.[0];
            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                const slaTarget = this.SLA_TARGETS[inquiry.priority as keyof typeof this.SLA_TARGETS] || this.SLA_TARGETS.medium;

                totalResponseTime += responseTime;
                responseTimeCount++;

                if (responseTime <= slaTarget) {
                    slaCompliantInquiries++;
                } else {
                    violations.push({
                        inquiryId: inquiry.id,
                        title: inquiry.title,
                        priority: inquiry.priority,
                        category: inquiry.category || 'その他',
                        responseTime,
                        slaTarget,
                        violationTime: responseTime - slaTarget,
                        assignedTo: inquiry.assignedTo,
                    });
                }
            }
        });

        const complianceRate = totalInquiries > 0 ? (slaCompliantInquiries / totalInquiries) * 100 : 0;
        const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

        const complianceByCategory = await this.getSLAComplianceByCategory(inquiries);
        const complianceByPriority = await this.getSLAComplianceByPriority(inquiries);

        const slaCompliance: SLACompliance = {
            totalInquiries,
            slaCompliantInquiries,
            complianceRate,
            averageResponseTime,
            slaTarget: this.SLA_TARGETS.medium, // デフォルト目標
            violations: violations.sort((a, b) => b.violationTime - a.violationTime), // 違反時間の降順
            complianceByCategory,
            complianceByPriority,
        };

        this.logger.log('SLA達成率監視を取得完了', {
            totalInquiries,
            complianceRate: Math.round(complianceRate * 100) / 100,
            violationCount: violations.length
        });

        return slaCompliance;
    }

    /**
     * トレンド分析を取得
     */
    async getTrendAnalysis(metric: string, period: 'daily' | 'weekly' | 'monthly', filters: AnalyticsFilters = {}): Promise<TrendAnalysis> {
        this.logger.log(`トレンド分析を取得中: ${metric} (${period})`, { filters });

        const endDate = filters.endDate || new Date();
        const startDate = filters.startDate || this.getStartDateForPeriod(period, endDate);

        let data: TrendDataPoint[] = [];

        switch (metric) {
            case 'inquiry_count':
                data = await this.getInquiryCountTrend(startDate, endDate, period, filters);
                break;
            case 'response_time':
                data = await this.getResponseTimeTrend(startDate, endDate, period, filters);
                break;
            case 'resolution_rate':
                data = await this.getResolutionRateTrend(startDate, endDate, period, filters);
                break;
            case 'sla_compliance':
                data = await this.getSLAComplianceTrend(startDate, endDate, period, filters);
                break;
            default:
                throw new Error(`サポートされていないメトリック: ${metric}`);
        }

        const { trend, changePercentage } = this.calculateTrend(data);

        const trendAnalysis: TrendAnalysis = {
            metric,
            period,
            data,
            trend,
            changePercentage,
        };

        this.logger.log(`トレンド分析を取得完了: ${metric}`, {
            dataPoints: data.length,
            trend,
            changePercentage: Math.round(changePercentage * 100) / 100
        });

        return trendAnalysis;
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
    }

    /**
     * 応答時間を計算
     */
    private calculateResponseTimes(inquiries: any[]): { averageResponseTime: number; averageResolutionTime: number } {
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
     * ワークロードを計算
     */
    private calculateWorkload(totalInquiries: number): 'low' | 'medium' | 'high' {
        if (totalInquiries < 10) return 'low';
        if (totalInquiries < 30) return 'medium';
        return 'high';
    }

    /**
     * 効率性スコアを計算
     */
    private calculateEfficiency(resolutionRate: number, averageResponseTime: number, averageResolutionTime: number): number {
        // 解決率 (40%), 応答時間 (30%), 解決時間 (30%) の重み付け
        const resolutionScore = Math.min(resolutionRate, 100);
        const responseScore = averageResponseTime > 0 ? Math.max(0, 100 - (averageResponseTime * 5)) : 100;
        const resolutionTimeScore = averageResolutionTime > 0 ? Math.max(0, 100 - (averageResolutionTime * 2)) : 100;

        return Math.round((resolutionScore * 0.4 + responseScore * 0.3 + resolutionTimeScore * 0.3) * 100) / 100;
    }

    /**
     * ワークロード分布を計算
     */
    private calculateWorkloadDistribution(performances: UserPerformance[]): WorkloadDistribution {
        const distribution = { low: 0, medium: 0, high: 0 };

        performances.forEach(perf => {
            distribution[perf.workload]++;
        });

        const total = performances.length;
        return {
            low: total > 0 ? (distribution.low / total) * 100 : 0,
            medium: total > 0 ? (distribution.medium / total) * 100 : 0,
            high: total > 0 ? (distribution.high / total) * 100 : 0,
        };
    }

    /**
     * カテゴリ別SLA達成率を取得
     */
    private async getSLAComplianceByCategory(inquiries: any[]): Promise<CategorySLACompliance[]> {
        const categoryMap = new Map<string, { total: number; compliant: number; responseTimes: number[] }>();

        inquiries.forEach(inquiry => {
            const category = inquiry.category || 'その他';
            const firstResponse = inquiry.responses?.[0];

            if (!categoryMap.has(category)) {
                categoryMap.set(category, { total: 0, compliant: 0, responseTimes: [] });
            }

            const categoryData = categoryMap.get(category)!;
            categoryData.total++;

            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                const slaTarget = this.SLA_TARGETS[inquiry.priority as keyof typeof this.SLA_TARGETS] || this.SLA_TARGETS.medium;

                categoryData.responseTimes.push(responseTime);

                if (responseTime <= slaTarget) {
                    categoryData.compliant++;
                }
            }
        });

        const compliance: CategorySLACompliance[] = [];
        categoryMap.forEach((data, category) => {
            compliance.push({
                category,
                totalInquiries: data.total,
                compliantInquiries: data.compliant,
                complianceRate: data.total > 0 ? (data.compliant / data.total) * 100 : 0,
                averageResponseTime: data.responseTimes.length > 0
                    ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
                    : 0,
                slaTarget: this.SLA_TARGETS.medium,
            });
        });

        return compliance.sort((a, b) => b.complianceRate - a.complianceRate);
    }

    /**
     * 優先度別SLA達成率を取得
     */
    private async getSLAComplianceByPriority(inquiries: any[]): Promise<PrioritySLACompliance[]> {
        const priorityMap = new Map<string, { total: number; compliant: number; responseTimes: number[]; slaTarget: number }>();

        inquiries.forEach(inquiry => {
            const priority = inquiry.priority || 'medium';
            const firstResponse = inquiry.responses?.[0];
            const slaTarget = this.SLA_TARGETS[priority as keyof typeof this.SLA_TARGETS] || this.SLA_TARGETS.medium;

            if (!priorityMap.has(priority)) {
                priorityMap.set(priority, { total: 0, compliant: 0, responseTimes: [], slaTarget });
            }

            const priorityData = priorityMap.get(priority)!;
            priorityData.total++;

            if (firstResponse) {
                const responseTime = (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
                priorityData.responseTimes.push(responseTime);

                if (responseTime <= slaTarget) {
                    priorityData.compliant++;
                }
            }
        });

        const compliance: PrioritySLACompliance[] = [];
        priorityMap.forEach((data, priority) => {
            compliance.push({
                priority,
                totalInquiries: data.total,
                compliantInquiries: data.compliant,
                complianceRate: data.total > 0 ? (data.compliant / data.total) * 100 : 0,
                averageResponseTime: data.responseTimes.length > 0
                    ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
                    : 0,
                slaTarget: data.slaTarget,
            });
        });

        return compliance.sort((a, b) => b.complianceRate - a.complianceRate);
    }

    /**
     * 期間の開始日を取得
     */
    private getStartDateForPeriod(period: 'daily' | 'weekly' | 'monthly', endDate: Date): Date {
        const start = new Date(endDate);

        switch (period) {
            case 'daily':
                start.setDate(start.getDate() - 30); // 30日前
                break;
            case 'weekly':
                start.setDate(start.getDate() - 84); // 12週前
                break;
            case 'monthly':
                start.setMonth(start.getMonth() - 12); // 12ヶ月前
                break;
        }

        return start;
    }

    /**
     * 問い合わせ件数トレンドを取得
     */
    private async getInquiryCountTrend(startDate: Date, endDate: Date, period: string, filters: AnalyticsFilters): Promise<TrendDataPoint[]> {
        const queryBuilder = this.inquiryRepository.createQueryBuilder('inquiry')
            .select('DATE(inquiry.createdAt)', 'date')
            .addSelect('COUNT(*)', 'count')
            .where('inquiry.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
            .groupBy('DATE(inquiry.createdAt)')
            .orderBy('date', 'ASC');

        this.applyFilters(queryBuilder, filters);

        const results = await queryBuilder.getRawMany();

        return results.map(result => ({
            date: result.date,
            value: parseInt(result.count),
        }));
    }

    /**
     * 応答時間トレンドを取得
     */
    private async getResponseTimeTrend(startDate: Date, endDate: Date, period: string, filters: AnalyticsFilters): Promise<TrendDataPoint[]> {
        // 簡略化された実装
        const data: TrendDataPoint[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            data.push({
                date: current.toISOString().split('T')[0],
                value: Math.random() * 10 + 2, // ダミーデータ
            });
            current.setDate(current.getDate() + 1);
        }

        return data;
    }

    /**
     * 解決率トレンドを取得
     */
    private async getResolutionRateTrend(startDate: Date, endDate: Date, period: string, filters: AnalyticsFilters): Promise<TrendDataPoint[]> {
        // 簡略化された実装
        const data: TrendDataPoint[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            data.push({
                date: current.toISOString().split('T')[0],
                value: Math.random() * 20 + 70, // 70-90%のダミーデータ
            });
            current.setDate(current.getDate() + 1);
        }

        return data;
    }

    /**
     * SLA達成率トレンドを取得
     */
    private async getSLAComplianceTrend(startDate: Date, endDate: Date, period: string, filters: AnalyticsFilters): Promise<TrendDataPoint[]> {
        // 簡略化された実装
        const data: TrendDataPoint[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            data.push({
                date: current.toISOString().split('T')[0],
                value: Math.random() * 30 + 60, // 60-90%のダミーデータ
            });
            current.setDate(current.getDate() + 1);
        }

        return data;
    }

    /**
     * トレンドを計算
     */
    private calculateTrend(data: TrendDataPoint[]): { trend: 'increasing' | 'decreasing' | 'stable'; changePercentage: number } {
        if (data.length < 2) {
            return { trend: 'stable', changePercentage: 0 };
        }

        const firstValue = data[0].value;
        const lastValue = data[data.length - 1].value;
        const changePercentage = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

        let trend: 'increasing' | 'decreasing' | 'stable';
        if (Math.abs(changePercentage) < 5) {
            trend = 'stable';
        } else if (changePercentage > 0) {
            trend = 'increasing';
        } else {
            trend = 'decreasing';
        }

        return { trend, changePercentage };
    }

    /**
     * 空のユーザーパフォーマンスを返す
     */
    private getEmptyUserPerformance(userId: string, userName: string): UserPerformance {
        return {
            userId,
            userName,
            totalInquiries: 0,
            resolvedInquiries: 0,
            averageResponseTime: 0,
            averageResolutionTime: 0,
            resolutionRate: 0,
            workload: 'low',
            efficiency: 0,
        };
    }

    /**
     * 空のSLA達成率を返す
     */
    private getEmptySLACompliance(): SLACompliance {
        return {
            totalInquiries: 0,
            slaCompliantInquiries: 0,
            complianceRate: 0,
            averageResponseTime: 0,
            slaTarget: this.SLA_TARGETS.medium,
            violations: [],
            complianceByCategory: [],
            complianceByPriority: [],
        };
    }
}