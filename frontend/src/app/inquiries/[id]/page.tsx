'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/layout/AdminLayout';
import InquiryStatusBadge from '@/components/inquiries/InquiryStatusBadge';
import InquiryPriorityBadge from '@/components/inquiries/InquiryPriorityBadge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Inquiry } from '@/types/inquiry';
import { inquiriesApi } from '@/lib/inquiries';

export default function InquiryDetailPage() {
    const router = useRouter();
    const params = useParams();
    const inquiryId = params.id as string;

    const [inquiry, setInquiry] = useState<Inquiry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [responseContent, setResponseContent] = useState('');
    const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

    useEffect(() => {
        if (inquiryId) {
            loadInquiry();
        }
    }, [inquiryId]);

    const loadInquiry = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            const data = await inquiriesApi.getInquiry(inquiryId);
            setInquiry(data);
        } catch (err: unknown) {
            const errorMessage = err && typeof err === 'object' && 'message' in err
                ? (err as { message: string }).message
                : '問い合わせの取得に失敗しました';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [inquiryId]);

    const handleAddResponse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!responseContent.trim()) return;

        try {
            setIsSubmittingResponse(true);
            await inquiriesApi.addResponse(inquiryId, responseContent, true);
            setResponseContent('');
            // 問い合わせを再読み込みして最新の回答を表示
            await loadInquiry();
        } catch (err: unknown) {
            const errorMessage = err && typeof err === 'object' && 'message' in err
                ? (err as { message: string }).message
                : '回答の追加に失敗しました';
            setError(errorMessage);
        } finally {
            setIsSubmittingResponse(false);
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-96">
                    <LoadingSpinner size="lg" />
                </div>
            </AdminLayout>
        );
    }

    if (error || !inquiry) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <div className="text-red-600 mb-4">{error || '問い合わせが見つかりませんでした'}</div>
                    <Button onClick={() => router.push('/inquiries')}>
                        問い合わせ一覧に戻る
                    </Button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/inquiries')}
                        >
                            <ArrowLeftIcon className="h-5 w-5 mr-2" />
                            一覧に戻る
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">問い合わせ詳細</h1>
                            <p className="mt-1 text-sm text-gray-600">ID: {inquiry.id}</p>
                        </div>
                    </div>
                    <Button variant="outline">
                        <PencilIcon className="h-5 w-5 mr-2" />
                        編集
                    </Button>
                </div>

                {/* 問い合わせ情報 */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-8">
                        <div className="flex items-center space-x-4 mb-6">
                            <InquiryPriorityBadge priority={inquiry.priority} />
                            <InquiryStatusBadge status={inquiry.status} />
                        </div>

                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            {inquiry.title}
                        </h2>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">アプリケーション</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {inquiry.application?.name || inquiry.appId}
                                </dd>
                            </div>

                            {inquiry.customerName && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">顧客名</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{inquiry.customerName}</dd>
                                </div>
                            )}

                            {inquiry.customerEmail && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">顧客メール</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{inquiry.customerEmail}</dd>
                                </div>
                            )}

                            {inquiry.category && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">カテゴリ</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{inquiry.category}</dd>
                                </div>
                            )}

                            <div>
                                <dt className="text-sm font-medium text-gray-500">作成日時</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {format(new Date(inquiry.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm font-medium text-gray-500">更新日時</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {format(new Date(inquiry.updatedAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                                </dd>
                            </div>
                        </div>

                        <div>
                            <dt className="text-sm font-medium text-gray-500 mb-2">問い合わせ内容</dt>
                            <dd className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                                {inquiry.content}
                            </dd>
                        </div>
                    </div>
                </div>

                {/* 回答一覧 */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            回答履歴 ({inquiry.responses?.length || 0}件)
                        </h3>
                    </div>

                    <div className="px-6 py-4">
                        {inquiry.responses && inquiry.responses.length > 0 ? (
                            <div className="space-y-6">
                                {inquiry.responses.map((response) => (
                                    <div key={response.id} className="border-l-4 border-indigo-500 pl-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-sm font-medium text-gray-900">
                                                {response.user?.name || 'システム'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {format(new Date(response.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {response.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">まだ回答がありません</p>
                        )}
                    </div>
                </div>

                {/* 回答追加フォーム */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">回答を追加</h3>
                    </div>

                    <form onSubmit={handleAddResponse} className="px-6 py-4">
                        <div className="mb-4">
                            <textarea
                                value={responseContent}
                                onChange={(e) => setResponseContent(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="回答内容を入力してください..."
                                required
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isSubmittingResponse}
                                disabled={!responseContent.trim()}
                            >
                                回答を追加
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}