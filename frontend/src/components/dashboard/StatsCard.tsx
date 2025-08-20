import React from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    change?: {
        value: number;
        type: 'increase' | 'decrease';
    };
    icon?: React.ReactNode;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'indigo';
}

const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500',
};

export default function StatsCard({
    title,
    value,
    change,
    icon,
    color = 'indigo'
}: StatsCardProps) {
    return (
        <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
                <div className="flex items-center">
                    {icon && (
                        <div className="flex-shrink-0">
                            <div className={`w-8 h-8 ${colorClasses[color]} rounded-md flex items-center justify-center`}>
                                {icon}
                            </div>
                        </div>
                    )}
                    <div className={`${icon ? 'ml-5' : ''} w-0 flex-1`}>
                        <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                                {title}
                            </dt>
                            <dd className="flex items-baseline">
                                <div className="text-2xl font-semibold text-gray-900">
                                    {value}
                                </div>
                                {change && (
                                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {change.type === 'increase' ? '↗' : '↘'}
                                        {Math.abs(change.value)}%
                                    </div>
                                )}
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
}