// 問い合わせ管理API
import { apiClient } from './api';
import {
    Inquiry,
    CreateInquiryRequest,
    UpdateInquiryRequest,
    SearchCriteria,
    Application
} from '@/types/inquiry';
import { PaginatedResult } from '@/types/api';

export const inquiriesApi = {
    // 問い合わせ一覧取得
    async getInquiries(criteria: SearchCriteria = {}): Promise<PaginatedResult<Inquiry>> {
        const response = await apiClient.get<PaginatedResult<Inquiry>>('/inquiries', criteria);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || '問い合わせの取得に失敗しました');
    },

    // 問い合わせ詳細取得
    async getInquiry(id: string): Promise<Inquiry> {
        const response = await apiClient.get<Inquiry>(`/inquiries/${id}`);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || '問い合わせの取得に失敗しました');
    },

    // 問い合わせ作成
    async createInquiry(data: CreateInquiryRequest): Promise<Inquiry> {
        const response = await apiClient.post<Inquiry>('/inquiries', data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || '問い合わせの作成に失敗しました');
    },

    // 問い合わせ更新
    async updateInquiry(id: string, data: UpdateInquiryRequest): Promise<Inquiry> {
        const response = await apiClient.put<Inquiry>(`/inquiries/${id}`, data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || '問い合わせの更新に失敗しました');
    },

    // アプリケーション一覧取得
    async getApplications(): Promise<Application[]> {
        const response = await apiClient.get<Application[]>('/applications');
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'アプリケーション一覧の取得に失敗しました');
    },

    // 回答追加
    async addResponse(inquiryId: string, content: string, isPublic: boolean = false): Promise<void> {
        const response = await apiClient.post(`/inquiries/${inquiryId}/responses`, {
            content,
            isPublic,
        });
        if (!response.success) {
            throw new Error(response.error?.message || '回答の追加に失敗しました');
        }
    },
};