'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { InquiryFilters as IInquiryFilters, InquiryStatus, InquiryPriority, Application } from '@/types/inquiry';
import Button from '@/components/ui/Button';
import { inquiriesApi } from '@/lib/inquiries';

interface InquiryFiltersProps {
    filters: IInquiryFilters;
    onFiltersChange: (filters: IInquiryFilters) => void;
}

export default function InquiryFilters({ filters, onFiltersChange }: InquiryFiltersProps) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    const { register, handleSubmit, reset } = useForm<IInquiryFilters>({
        defaultValues: filters,
    });

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = async () => {
        try {
            const apps = await inquiriesApi.getApplications();
            setApplications(apps);
        } catch (error) {
            console.error('アプリケーション一覧の取得に失敗しました:', error);
        }
    };

    const onSubmit = (data: IInquiryFilters) => {
        // 空の値を除外
        const cleanedData: IInquiryFilters = {};

        if (data.appId) cleanedData.appId = data.appId;
        if (data.status && data.status.length > 0) cleanedData.status = data.status;
        if (data.category && data.category.length > 0) cleanedData.category = data.category;
        if (data.assignedTo) cleanedData.assignedTo = data.assignedTo;
        if (data.priority && data.priority.length > 0) cleanedData.priority = data.priority;
        if (data.customerEmail) cleanedData.customerEmail = data.customerEmail;

        onFiltersChange(cleanedData);
    };

    const handleReset = () => {
        reset({});
        onFiltersChange({});
    };

    const statusOptions: { value: InquiryStatus; label: string }[] = [
        { value: 'new', label: '新規' },
        { value: 'in_progress', label: '対応中' },
        { value: 'pending', label: '保留' },
        { value: 'resolved', label: '解決済み' },
        { value: 'closed', label: 'クローズ' },
    ];

    const priorityOptions: { value: InquiryPriority; label: string }[] = [
        { value: 'low', label: '低' },
        { value: 'medium', label: '中' },
        { value: 'high', label: '高' },
        { value: 'urgent', label: '緊急' },
    ];

    return (
        <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">フィルター</h3>
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                        {isExpanded ? '閉じる' : '詳細フィルター'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* アプリケーション */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            アプリケーション
                        </label>
                        <select
                            {...register('appId')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">すべて</option>
                            {applications.map((app) => (
                                <option key={app.id} value={app.id}>
                                    {app.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ステータス */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ステータス
                        </label>
                        <select
                            {...register('status')}
                            multiple
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 優先度 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            優先度
                        </label>
                        <select
                            {...register('priority')}
                            multiple
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {priorityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* 顧客メール */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                顧客メール
                            </label>
                            <input
                                type="email"
                                {...register('customerEmail')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="顧客のメールアドレス"
                            />
                        </div>

                        {/* 担当者 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                担当者
                            </label>
                            <input
                                type="text"
                                {...register('assignedTo')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="担当者ID"
                            />
                        </div>
                    </div>
                )}

                <div className="mt-6 flex space-x-3">
                    <Button type="submit" variant="primary">
                        フィルター適用
                    </Button>
                    <Button type="button" variant="outline" onClick={handleReset}>
                        リセット
                    </Button>
                </div>
            </form>
        </div>
    );
}