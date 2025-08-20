'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/layout/AdminLayout';
import InquiryForm from '@/components/inquiries/InquiryForm';
import Button from '@/components/ui/Button';
import { CreateInquiryRequest } from '@/types/inquiry';
import { inquiriesApi } from '@/lib/inquiries';

export default function NewInquiryPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const handleSubmit = async (data: CreateInquiryRequest) => {
        try {
            setIsLoading(true);
            setError('');

            const inquiry = await inquiriesApi.createInquiry(data);

            // 作成成功後、詳細ページに遷移
            router.push(`/inquiries/${inquiry.id}`);
        } catch (err: unknown) {
            const errorMessage = err && typeof err === 'object' && 'message' in err
                ? (err as { message: string }).message
                : '問い合わせの作成に失敗しました';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* ヘッダー */}
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-2" />
                        戻る
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">新規問い合わせ作成</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            新しい問い合わせを作成します
                        </p>
                    </div>
                </div>

                {/* エラー表示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="text-sm text-red-700">{error}</div>
                    </div>
                )}

                {/* フォーム */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-8">
                        <InquiryForm
                            onSubmit={handleSubmit}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}