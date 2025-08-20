'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    InboxIcon,
    ClockIcon,
    CheckCircleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/layout/AdminLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import InquiryTrendChart from '@/components/dashboard/InquiryTrendChart';
import CategoryChart from '@/components/dashboard/CategoryChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import PerformanceMetrics from '@/components/dashboard/PerformanceMetrics';
import {
    DashboardStats,
    InquiryTrend,
    CategoryStats,
    RecentActivity as IRecentActivity,
    PerformanceMetrics as IPerformanceMetrics
} from '@/types/analytics';
import { analyticsApi } from '@/lib/analytics';

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [trendData, setTrendData] = useState<InquiryTrend[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryStats[]>([]);
    const [recentActivity, setRecentActivity] = useState<IRecentActivity[]>([]);
    const [performanceMetrics, setPerformanceMetrics] = useState<IPerformanceMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');

    const loadDashboardData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');

            // 並列でデータを取得
            const [
                statsData,
                trendResponse,
                categoryResponse,
                activityResponse,
                metricsResponse,
            ] = await Promise.allSettled([
                analyticsApi.getDashboardStats(),
                analyticsApi.getInquiryTrend(30),
                analyticsApi.getCategoryStats(),
                analyticsApi.getRecentActivity(10),
                analyticsApi.getPerformanceMetrics('30d'),
            ]);

            // 成功したデータのみ設定
            if (statsData.status === 'fulfilled') {
                setStats(statsData.value);
            }
            if (trendResponse.status === 'fulfilled') {
                setTrendData(trendResponse.value);
            }
            if (categoryResponse.status === 'fulfilled') {
                setCategoryData(categoryResponse.value);
            }
            if (activityResponse.status === 'fulfilled') {
                setRecentActivity(activityResponse.value);
            }
            if (metricsResponse.status === 'fulfilled') {
                setPerformanceMetrics(metricsResponse.value);
            }

            // エラーがあった場合は最初のエラーを表示
            const failedRequest = [statsData, trendResponse, categoryResponse, activityResponse, metricsResponse]
                .find(result => result.status === 'rejected');

            if (failedRequest && failedRequest.status === 'rejected') {
                console.warn('一部のデータの取得に失敗しました:', failedRequest.reason);
            }

        } catch (err: unknown) {
            const errorMessage = err && typeof err === 'object' && 'message' in err
                ? (err as { message: string }).message
                : 'ダッシュボードデータの取得に失敗しました';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();

        // 5分ごとにデータを更新
        const interval = setInterval(loadDashboardData, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [loadDashboardData]);

    const formatTime = (hours: number) => {
        if (hours < 1) {
            return `${Math.round(hours * 60)}分`;
        }
        return `${hours.toFixed(1)}時間`;
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            問い合わせ管理システムの概要を確認できます
                        </p>
                    </div>
                    <button
                        onClick={loadDashboardData}
                        disabled={isLoading}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isLoading ? '更新中...' : '更新'}
                    </button>
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="text-sm text-red-700">{error}</div>
                    </div>
                )}

                {/* 統計カード */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="新規問い合わせ"
                        value={stats?.newInquiries ?? (isLoading ? '...' : '0')}
                        icon={<InboxIcon className="h-5 w-5 text-white" />}
                        color="blue"
                    />
                    <StatsCard
                        title="対応中"
                        value={stats?.inProgressInquiries ?? (isLoading ? '...' : '0')}
                        icon={<ClockIcon className="h-5 w-5 text-white" />}
                        color="yellow"
                    />
                    <StatsCard
                        title="解決済み"
                        value={stats?.resolvedInquiries ?? (isLoading ? '...' : '0')}
                        icon={<CheckCircleIcon className="h-5 w-5 text-white" />}
                        color="green"
                    />
                    <StatsCard
                        title="平均対応時間"
                        value={stats ? formatTime(stats.averageResponseTime) : (isLoading ? '...' : '0分')}
                        icon={<ChartBarIcon className="h-5 w-5 text-white" />}
                        color="indigo"
                    />
                </div>

                {/* チャートエリア */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <InquiryTrendChart data={trendData} isLoading={isLoading} />
                    <CategoryChart data={categoryData} isLoading={isLoading} />
                </div>

                {/* 下部エリア */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <RecentActivity activities={recentActivity} isLoading={isLoading} />
                    </div>
                    <div>
                        <PerformanceMetrics metrics={performanceMetrics} isLoading={isLoading} />
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}