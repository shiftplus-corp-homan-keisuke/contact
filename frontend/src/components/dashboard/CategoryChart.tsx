'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CategoryStats } from '@/types/analytics';

interface CategoryChartProps {
    data: CategoryStats[];
    isLoading?: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function CategoryChart({ data, isLoading }: CategoryChartProps) {
    if (isLoading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">カテゴリ別分布</h3>
                </div>
                <div className="p-6 text-center text-gray-500">
                    データがありません
                </div>
            </div>
        );
    }

    const renderCustomizedLabel = (props: {
        cx?: number;
        cy?: number;
        midAngle?: number;
        innerRadius?: number;
        outerRadius?: number;
        percent?: number;
    }) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

        if (!cx || !cy || midAngle === undefined || !innerRadius || !outerRadius || !percent || percent < 0.05) {
            return null; // 5%未満は表示しない
        }

        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize={12}
                fontWeight="bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">カテゴリ別分布</h3>
                <p className="text-sm text-gray-500">問い合わせのカテゴリ別割合</p>
            </div>
            <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="count"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name, props) => [
                                `${value}件 (${props.payload.percentage.toFixed(1)}%)`,
                                '件数'
                            ]}
                            labelFormatter={(label) => `カテゴリ: ${label}`}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}