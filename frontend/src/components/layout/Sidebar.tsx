'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    InboxIcon,
    QuestionMarkCircleIcon,
    ChartBarIcon,
    DocumentTextIcon,
    FolderIcon,
    CogIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

interface NavigationItem {
    name: string;
    href: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    permission?: string;
}

const navigation: NavigationItem[] = [
    { name: 'ダッシュボード', href: '/dashboard', icon: HomeIcon },
    { name: '問い合わせ管理', href: '/inquiries', icon: InboxIcon },
    { name: 'FAQ管理', href: '/faqs', icon: QuestionMarkCircleIcon },
    { name: '分析・レポート', href: '/analytics', icon: ChartBarIcon },
    { name: 'テンプレート', href: '/templates', icon: DocumentTextIcon },
    { name: 'ファイル管理', href: '/files', icon: FolderIcon },
    { name: 'ユーザー管理', href: '/users', icon: UsersIcon, permission: 'admin' },
    { name: '設定', href: '/settings', icon: CogIcon },
];

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

export default function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    // 権限チェック
    const hasPermission = (permission?: string) => {
        if (!permission) return true;
        if (!user?.role?.permissions) return false;
        return user.role.permissions.includes(permission) || user.role.name === 'admin';
    };

    const filteredNavigation = navigation.filter(item => hasPermission(item.permission));

    return (
        <div className="flex flex-col w-64 bg-gray-800">
            <div className="flex items-center h-16 px-4 bg-gray-900">
                <h1 className="text-xl font-semibold text-white">
                    問い合わせ管理システム
                </h1>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
                {filteredNavigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={classNames(
                                isActive
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                                'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                            )}
                        >
                            <item.icon
                                className={classNames(
                                    isActive ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300',
                                    'mr-3 flex-shrink-0 h-6 w-6'
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}