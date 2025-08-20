'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
    InboxIcon,
    CheckCircleIcon,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { RecentActivity as IRecentActivity } from '@/types/analytics';

interface RecentActivityProps {
    activities: IRecentActivity[];
    isLoading?: boolean;
}

const activityIcons = {
    inquiry_created: InboxIcon,
    inquiry_resolved: CheckCircleIcon,
    response_added: ChatBubbleLeftRightIcon,
};

const activityColors = {
    inquiry_created: 'text-blue-500',
    inquiry_resolved: 'text-green-500',
    response_added: 'text-indigo-500',
};

export default function RecentActivity({ activities, isLoading }: RecentActivityProps) {
    if (isLoading) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">最近のアクティビティ</h3>
                </div>
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex space-x-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">最近のアクティビティ</h3>
                </div>
                <div className="p-6 text-center text-gray-500">
                    最近のアクティビティはありません
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">最近のアクティビティ</h3>
                <p className="text-sm text-gray-500">システム内の最新の活動状況</p>
            </div>
            <div className="p-6">
                <div className="flow-root">
                    <ul className="-mb-8">
                        {activities.map((activity, index) => {
                            const Icon = activityIcons[activity.type];
                            const isLast = index === activities.length - 1;

                            return (
                                <li key={activity.id}>
                                    <div className="relative pb-8">
                                        {!isLast && (
                                            <span
                                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <div className="relative flex space-x-3">
                                            <div>
                                                <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${activityColors[activity.type]} bg-gray-100`}>
                                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                <div>
                                                    <p className="text-sm text-gray-900">
                                                        {activity.inquiryId ? (
                                                            <Link
                                                                href={`/inquiries/${activity.inquiryId}`}
                                                                className="font-medium hover:text-indigo-600"
                                                            >
                                                                {activity.title}
                                                            </Link>
                                                        ) : (
                                                            <span className="font-medium">{activity.title}</span>
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {activity.description}
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                    <time dateTime={activity.timestamp}>
                                                        {format(new Date(activity.timestamp), 'MM/dd HH:mm', { locale: ja })}
                                                    </time>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
}