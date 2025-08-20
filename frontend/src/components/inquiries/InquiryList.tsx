'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Inquiry } from '@/types/inquiry';
import InquiryStatusBadge from './InquiryStatusBadge';
import InquiryPriorityBadge from './InquiryPriorityBadge';

interface InquiryListProps {
    inquiries: Inquiry[];
    isLoading?: boolean;
}

export default function InquiryList({ inquiries, isLoading }: InquiryListProps) {
    if (isLoading) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex space-x-4">
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                                <div className="w-20 h-6 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (inquiries.length === 0) {
        return (
            <div className="bg-white shadow rounded-lg">
                <div className="p-6 text-center">
                    <p className="text-gray-500">問い合わせが見つかりませんでした。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200">
                {inquiries.map((inquiry) => (
                    <li key={inquiry.id}>
                        <Link
                            href={`/inquiries/${inquiry.id}`}
                            className="block hover:bg-gray-50 px-6 py-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-3">
                                        <InquiryPriorityBadge priority={inquiry.priority} />
                                        <InquiryStatusBadge status={inquiry.status} />
                                    </div>

                                    <div className="mt-2">
                                        <h3 className="text-sm font-medium text-gray-900 truncate">
                                            {inquiry.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate mt-1">
                                            {inquiry.content}
                                        </p>
                                    </div>

                                    <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                                        <span>{inquiry.application?.name || inquiry.appId}</span>
                                        {inquiry.customerName && (
                                            <span>顧客: {inquiry.customerName}</span>
                                        )}
                                        {inquiry.category && (
                                            <span>カテゴリ: {inquiry.category}</span>
                                        )}
                                        <span>
                                            作成日: {format(new Date(inquiry.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 ml-4">
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">
                                            更新: {format(new Date(inquiry.updatedAt), 'MM/dd HH:mm', { locale: ja })}
                                        </div>
                                        {inquiry.responses && inquiry.responses.length > 0 && (
                                            <div className="text-xs text-indigo-600 mt-1">
                                                回答 {inquiry.responses.length}件
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}