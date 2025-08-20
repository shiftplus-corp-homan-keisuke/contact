'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, LoginCredentials, AuthContextType, AuthResult } from '@/types/auth';
import { apiClient } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // ページ読み込み時に認証状態を確認
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setIsLoading(false);
                return;
            }

            // トークンが有効かどうかを確認
            const response = await apiClient.get<User>('/auth/me');
            if (response.success && response.data) {
                setUser(response.data);
            } else {
                // トークンが無効な場合はクリア
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
            }
        } catch (error) {
            console.error('認証状態の確認に失敗しました:', error);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            setIsLoading(true);
            const response = await apiClient.post<AuthResult>('/auth/login', credentials);

            if (response.success && response.data) {
                const { user, accessToken, refreshToken } = response.data;

                // トークンを保存
                apiClient.setToken(accessToken);
                apiClient.setRefreshToken(refreshToken);

                setUser(user);
            } else {
                throw new Error(response.error?.message || 'ログインに失敗しました');
            }
        } catch (error: unknown) {
            console.error('ログインエラー:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        login,
        logout,
        isLoading,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}