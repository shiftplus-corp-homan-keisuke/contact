'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { InquiryTrend } from '@/types/analytics';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface InquiryTrendChartProps {
    data: InquiryTrend[];
    isLoading?: boolean;
}

export default function InquiryTrendChart({ data, isLoading }: InquiryTrendChartProps) {
    if (isLoading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    const chartData = data.map(item => ({
        ...item,
        date: format(new Date(item.date), 'MM/dd', { locale: ja }),
    }));

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">問い合わせトレンド</h3>
                <p className="text-sm text-gray-500">過去30日間の問い合わせ数と解決数の推移</p>
            </div>
            <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            labelFormatter={(label) => `日付: ${label}`}
                            formatter={(value, name) => [
                                value,
                                name === 'count' ? '問い合わせ数' : '解決数'
                            ]}
                        />
                        <Legend
                            formatter={(value) => value === 'count' ? '問い合わせ数' : '解決数'}
                        />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="resolved"
                            stroke="#10B981"
                            strokeWidth={2}
                            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}