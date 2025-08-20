'use client';

import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

export default function Header() {
    const { user, logout } = useAuth();

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-6">
                <div className="flex items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        管理画面
                    </h2>
                </div>

                <div className="flex items-center space-x-4">
                    {/* 通知アイコン */}
                    <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        <span className="sr-only">通知を表示</span>
                        <BellIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    {/* ユーザーメニュー */}
                    <Menu as="div" className="relative">
                        <div>
                            <Menu.Button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                <span className="sr-only">ユーザーメニューを開く</span>
                                <div className="flex items-center space-x-3">
                                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-gray-900">
                                            {user?.name || 'ユーザー'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {user?.role?.name || ''}
                                        </div>
                                    </div>
                                </div>
                            </Menu.Button>
                        </div>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <Menu.Item>
                                    {({ active }) => (
                                        <a
                                            href="/profile"
                                            className={classNames(
                                                active ? 'bg-gray-100' : '',
                                                'block px-4 py-2 text-sm text-gray-700'
                                            )}
                                        >
                                            プロフィール
                                        </a>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <a
                                            href="/settings"
                                            className={classNames(
                                                active ? 'bg-gray-100' : '',
                                                'block px-4 py-2 text-sm text-gray-700'
                                            )}
                                        >
                                            設定
                                        </a>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={logout}
                                            className={classNames(
                                                active ? 'bg-gray-100' : '',
                                                'block w-full text-left px-4 py-2 text-sm text-gray-700'
                                            )}
                                        >
                                            ログアウト
                                        </button>
                                    )}
                                </Menu.Item>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>
            </div>
        </header>
    );
}