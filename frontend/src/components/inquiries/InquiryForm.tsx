'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateInquiryRequest, InquiryPriority, Application } from '@/types/inquiry';
import Button from '@/components/ui/Button';
import { inquiriesApi } from '@/lib/inquiries';

// バリデーションスキーマ
const inquirySchema = z.object({
    title: z.string().min(1, 'タイトルは必須です').max(500, 'タイトルは500文字以内で入力してください'),
    content: z.string().min(1, '内容は必須です'),
    appId: z.string().min(1, 'アプリケーションを選択してください'),
    customerEmail: z.string().email('有効なメールアドレスを入力してください').optional().or(z.literal('')),
    customerName: z.string().optional(),
    category: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

interface InquiryFormProps {
    onSubmit: (data: CreateInquiryRequest) => Promise<void>;
    isLoading?: boolean;
    initialData?: Partial<CreateInquiryRequest>;
}

export default function InquiryForm({ onSubmit, isLoading, initialData }: InquiryFormProps) {
    const [applications, setApplications] = useState<Application[]>([]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<InquiryFormData>({
        resolver: zodResolver(inquirySchema),
        defaultValues: {
            priority: 'medium',
            ...initialData,
        },
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

    const handleFormSubmit = async (data: InquiryFormData) => {
        try {
            const submitData: CreateInquiryRequest = {
                ...data,
                customerEmail: data.customerEmail || undefined,
                customerName: data.customerName || undefined,
                category: data.category || undefined,
                priority: data.priority || 'medium',
            };

            await onSubmit(submitData);
            reset();
        } catch (error) {
            console.error('問い合わせの送信に失敗しました:', error);
        }
    };

    const priorityOptions: { value: InquiryPriority; label: string }[] = [
        { value: 'low', label: '低' },
        { value: 'medium', label: '中' },
        { value: 'high', label: '高' },
        { value: 'urgent', label: '緊急' },
    ];

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* タイトル */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    タイトル <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    {...register('title')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="問い合わせのタイトルを入力してください"
                />
                {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
            </div>

            {/* アプリケーション */}
            <div>
                <label htmlFor="appId" className="block text-sm font-medium text-gray-700">
                    対象アプリケーション <span className="text-red-500">*</span>
                </label>
                <select
                    {...register('appId')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">アプリケーションを選択してください</option>
                    {applications.map((app) => (
                        <option key={app.id} value={app.id}>
                            {app.name}
                        </option>
                    ))}
                </select>
                {errors.appId && (
                    <p className="mt-1 text-sm text-red-600">{errors.appId.message}</p>
                )}
            </div>

            {/* 内容 */}
            <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                    内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                    {...register('content')}
                    rows={6}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="問い合わせの詳細内容を入力してください"
                />
                {errors.content && (
                    <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* 顧客名 */}
                <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                        顧客名
                    </label>
                    <input
                        type="text"
                        {...register('customerName')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="顧客名を入力してください"
                    />
                </div>

                {/* 顧客メール */}
                <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700">
                        顧客メール
                    </label>
                    <input
                        type="email"
                        {...register('customerEmail')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="customer@example.com"
                    />
                    {errors.customerEmail && (
                        <p className="mt-1 text-sm text-red-600">{errors.customerEmail.message}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* カテゴリ */}
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        カテゴリ
                    </label>
                    <input
                        type="text"
                        {...register('category')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="例: 技術的問題、機能要望"
                    />
                </div>

                {/* 優先度 */}
                <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                        優先度
                    </label>
                    <select
                        {...register('priority')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {priorityOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex justify-end space-x-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset()}
                    disabled={isSubmitting || isLoading}
                >
                    リセット
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting || isLoading}
                >
                    問い合わせを作成
                </Button>
            </div>
        </form>
    );
}