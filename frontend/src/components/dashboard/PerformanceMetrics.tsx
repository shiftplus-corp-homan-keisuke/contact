'use client';

import React from 'react';
import { PerformanceMetrics as IPerformanceMetrics } from '@/types/analytics';

interface PerformanceMetricsProps {
    metrics: IPerformanceMetrics | null;
    isLoading?: boolean;
}

export default function PerformanceMetrics({ metrics, isLoading }: PerformanceMetricsProps) {
    if (isLoading) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">パフォーマンス指標</h3>
                </div>
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex justify-between">
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">パフォーマンス指標</h3>
                </div>
                <div className="p-6 text-center text-gray-500">
                    データがありません
                </div>
            </div>
        );
    }

    const formatTime = (hours: number) => {
        if (hours < 1) {
            return `${Math.round(hours * 60)}分`;
        }
        return `${hours.toFixed(1)}時間`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getProgressColor = (score: number) => {
        if (score >= 90) return 'bg-green-500';
        if (score >= 70) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">パフォーマンス指標</h3>
                <p className="text-sm text-gray-500">過去30日間のパフォーマンス</p>
            </div>
            <div className="p-6 space-y-6">
                {/* 処理件数 */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">処理件数</span>
                        <span className="text-sm font-semibold text-gray-900">
                            {metrics.totalHandled}件
                        </span>
                    </div>
                </div>

                {/* 平均対応時間 */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">平均対応時間</span>
                        <span className="text-sm font-semibold text-gray-900">
                            {formatTime(metrics.averageResponseTime)}
                        </span>
                    </div>
                </div>

                {/* 解決率 */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">解決率</span>
                        <span className={`text-sm font-semibold ${getScoreColor(metrics.resolutionRate)}`}>
                            {metrics.resolutionRate.toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${getProgressColor(metrics.resolutionRate)}`}
                            style={{ width: `${metrics.resolutionRate}%` }}
                        />
                    </div>
                </div>

                {/* 顧客満足度 */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">顧客満足度</span>
                        <span className={`text-sm font-semibold ${getScoreColor(metrics.customerSatisfaction)}`}>
                            {metrics.customerSatisfaction.toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${getProgressColor(metrics.customerSatisfaction)}`}
                            style={{ width: `${metrics.customerSatisfaction}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}