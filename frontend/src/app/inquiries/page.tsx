'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/layout/AdminLayout';
import InquiryList from '@/components/inquiries/InquiryList';
import InquiryFilters from '@/components/inquiries/InquiryFilters';
import Button from '@/components/ui/Button';
import { Inquiry, InquiryFilters as IInquiryFilters, SearchCriteria } from '@/types/inquiry';
import { inquiriesApi } from '@/lib/inquiries';

export default function InquiriesPage() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<IInquiryFilters>({});
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    useEffect(() => {
        loadInquiries();
    }, [filters, pagination.page, searchQuery]);

    const loadInquiries = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');

            const criteria: SearchCriteria = {
                query: searchQuery || undefined,
                filters,
                page: pagination.page,
                limit: pagination.limit,
                sortBy: 'createdAt',
                sortOrder: 'desc',
            };

            const result = await inquiriesApi.getInquiries(criteria);
            setInquiries(result.items);
            setPagination(prev => ({
                ...prev,
                total: result.total,
                totalPages: result.totalPages,
            }));
        } catch (err: unknown) {
            const errorMessage = err && typeof err === 'object' && 'message' in err
                ? (err as { message: string }).message
                : '問い合わせの取得に失敗しました';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [filters, pagination.page, pagination.limit, searchQuery]);

    const handleFiltersChange = (newFilters: IInquiryFilters) => {
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        loadInquiries();
    };

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">問い合わせ管理</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            問い合わせの一覧表示、検索、フィルタリングができます
                        </p>
                    </div>
                    <Link href="/inquiries/new">
                        <Button variant="primary">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            新規問い合わせ
                        </Button>
                    </Link>
                </div>

                {/* 検索バー */}
                <div className="bg-white shadow rounded-lg">
                    <div className="p-6">
                        <form onSubmit={handleSearchSubmit} className="flex space-x-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="問い合わせを検索..."
                                    />
                                </div>
                            </div>
                            <Button type="submit" variant="primary">
                                検索
                            </Button>
                        </form>
                    </div>
                </div>

                {/* フィルター */}
                <InquiryFilters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                />

                {/* エラー表示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="text-sm text-red-700">{error}</div>
                    </div>
                )}

                {/* 結果サマリー */}
                {!isLoading && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    {pagination.total}件中 {((pagination.page - 1) * pagination.limit) + 1}-
                                    {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
                                </div>
                                {pagination.totalPages > 1 && (
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page <= 1}
                                        >
                                            前へ
                                        </Button>
                                        <span className="px-3 py-1 text-sm text-gray-700">
                                            {pagination.page} / {pagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page >= pagination.totalPages}
                                        >
                                            次へ
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 問い合わせ一覧 */}
                <InquiryList inquiries={inquiries} isLoading={isLoading} />
            </div>
        </AdminLayout>
    );
}