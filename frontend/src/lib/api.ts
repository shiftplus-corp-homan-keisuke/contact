// API クライアント設定
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, ApiError } from '@/types/api';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // リクエストインターセプター（認証トークンの自動付与）
        this.client.interceptors.request.use(
            (config) => {
                const token = this.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // レスポンスインターセプター（エラーハンドリング）
        this.client.interceptors.response.use(
            (response: AxiosResponse<ApiResponse>) => {
                return response;
            },
            (error) => {
                if (error.response?.status === 401) {
                    // 認証エラーの場合、ログアウト処理
                    this.removeToken();
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );
    }

    private getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('accessToken');
        }
        return null;
    }

    private removeToken(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    }

    public setToken(token: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', token);
        }
    }

    public setRefreshToken(token: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('refreshToken', token);
        }
    }

    // GET リクエスト
    async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.get<ApiResponse<T>>(url, { params });
            return response.data;
        } catch (error: unknown) {
            throw this.handleError(error);
        }
    }

    // POST リクエスト
    async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.post<ApiResponse<T>>(url, data);
            return response.data;
        } catch (error: unknown) {
            throw this.handleError(error);
        }
    }

    // PUT リクエスト
    async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.put<ApiResponse<T>>(url, data);
            return response.data;
        } catch (error: unknown) {
            throw this.handleError(error);
        }
    }

    // DELETE リクエスト
    async delete<T>(url: string): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.delete<ApiResponse<T>>(url);
            return response.data;
        } catch (error: unknown) {
            throw this.handleError(error);
        }
    }

    private handleError(error: unknown): ApiError {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { error?: ApiError } } };
            if (axiosError.response?.data?.error) {
                return axiosError.response.data.error;
            }
        }

        const errorMessage = error && typeof error === 'object' && 'message' in error
            ? (error as { message: string }).message
            : 'ネットワークエラーが発生しました';

        return {
            code: 'NETWORK_ERROR',
            message: errorMessage,
        };
    }
}

export const apiClient = new ApiClient();