'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const { isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        // 認証されていない場合はログインページにリダイレクト
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* サイドバー */}
            <Sidebar />

            {/* メインコンテンツエリア */}
            <div className="flex-1 flex flex-col">
                {/* ヘッダー */}
                <Header />

                {/* メインコンテンツ */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}