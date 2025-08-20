/**
 * 問い合わせ関連のバリデーション関数
 * 要件1: 問い合わせ登録機能のバリデーション
 * 要件2: 問い合わせ・回答管理機能のバリデーション
 */

import { ValidationResult, ValidationError } from '../types/validation.types';

/**
 * 問い合わせ作成リクエストをバリデーション
 * 要件1.4: 必須項目（タイトル、内容、対象アプリ）のチェック
 */
export function validateCreateInquiryRequest(request: any): ValidationResult {
    const errors = [];

    // タイトルの検証（必須項目）
    if (!request.title || request.title.trim().length === 0) {
        errors.push({
            field: 'title',
            message: 'タイトルは必須項目です',
            code: 'TITLE_REQUIRED'
        });
    } else if (request.title.length > 500) {
        errors.push({
            field: 'title',
            message: 'タイトルは500文字以内で入力してください',
            code: 'TITLE_TOO_LONG'
        });
    }

    // 内容の検証（必須項目）
    if (!request.content || request.content.trim().length === 0) {
        errors.push({
            field: 'content',
            message: '内容は必須項目です',
            code: 'CONTENT_REQUIRED'
        });
    } else if (request.content.length > 10000) {
        errors.push({
            field: 'content',
            message: '内容は10000文字以内で入力してください',
            code: 'CONTENT_TOO_LONG'
        });
    }

    // 対象アプリIDの検証（必須項目）
    if (!request.appId || request.appId.trim().length === 0) {
        errors.push({
            field: 'appId',
            message: '対象アプリは必須項目です',
            code: 'APP_ID_REQUIRED'
        });
    }

    // 顧客メールアドレスの検証（任意項目）
    if (request.customerEmail && !validateEmail(request.customerEmail)) {
        errors.push({
            field: 'customerEmail',
            message: '有効なメールアドレスを入力してください',
            code: 'CUSTOMER_EMAIL_INVALID'
        });
    }

    // 顧客名の検証（任意項目）
    if (request.customerName && request.customerName.length > 255) {
        errors.push({
            field: 'customerName',
            message: '顧客名は255文字以内で入力してください',
            code: 'CUSTOMER_NAME_TOO_LONG'
        });
    }

    // カテゴリの検証（任意項目）
    if (request.category && request.category.length > 100) {
        errors.push({
            field: 'category',
            message: 'カテゴリは100文字以内で入力してください',
            code: 'CATEGORY_TOO_LONG'
        });
    }

    // 優先度の検証（任意項目）
    if (request.priority && !isValidInquiryPriority(request.priority)) {
        errors.push({
            field: 'priority',
            message: '有効な優先度を選択してください',
            code: 'PRIORITY_INVALID'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 問い合わせ更新リクエストをバリデーション
 */
export function validateUpdateInquiryRequest(request: any): ValidationResult {
    const errors = [];

    // タイトルの検証（提供されている場合）
    if (request.title !== undefined) {
        if (!request.title || request.title.trim().length === 0) {
            errors.push({
                field: 'title',
                message: 'タイトルは空にできません',
                code: 'TITLE_EMPTY'
            });
        } else if (request.title.length > 500) {
            errors.push({
                field: 'title',
                message: 'タイトルは500文字以内で入力してください',
                code: 'TITLE_TOO_LONG'
            });
        }
    }

    // 内容の検証（提供されている場合）
    if (request.content !== undefined) {
        if (!request.content || request.content.trim().length === 0) {
            errors.push({
                field: 'content',
                message: '内容は空にできません',
                code: 'CONTENT_EMPTY'
            });
        } else if (request.content.length > 10000) {
            errors.push({
                field: 'content',
                message: '内容は10000文字以内で入力してください',
                code: 'CONTENT_TOO_LONG'
            });
        }
    }

    // ステータスの検証（提供されている場合）
    if (request.status !== undefined && !isValidInquiryStatus(request.status)) {
        errors.push({
            field: 'status',
            message: '有効なステータスを選択してください',
            code: 'STATUS_INVALID'
        });
    }

    // 優先度の検証（提供されている場合）
    if (request.priority !== undefined && !isValidInquiryPriority(request.priority)) {
        errors.push({
            field: 'priority',
            message: '有効な優先度を選択してください',
            code: 'PRIORITY_INVALID'
        });
    }

    // カテゴリの検証（提供されている場合）
    if (request.category !== undefined && request.category.length > 100) {
        errors.push({
            field: 'category',
            message: 'カテゴリは100文字以内で入力してください',
            code: 'CATEGORY_TOO_LONG'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 検索条件をバリデーション
 * 要件8: 検索・フィルタリング機能のバリデーション
 */
export function validateSearchCriteria(criteria: any): ValidationResult {
    const errors = [];

    // 検索クエリの検証
    if (!criteria.query || criteria.query.trim().length === 0) {
        errors.push({
            field: 'query',
            message: '検索クエリは必須項目です',
            code: 'QUERY_REQUIRED'
        });
    } else if (criteria.query.length > 1000) {
        errors.push({
            field: 'query',
            message: '検索クエリは1000文字以内で入力してください',
            code: 'QUERY_TOO_LONG'
        });
    }

    // ページネーションの検証
    if (criteria.page !== undefined && criteria.page < 1) {
        errors.push({
            field: 'page',
            message: 'ページ番号は1以上である必要があります',
            code: 'PAGE_INVALID'
        });
    }

    if (criteria.limit !== undefined) {
        if (criteria.limit < 1) {
            errors.push({
                field: 'limit',
                message: '取得件数は1以上である必要があります',
                code: 'LIMIT_TOO_SMALL'
            });
        } else if (criteria.limit > 100) {
            errors.push({
                field: 'limit',
                message: '取得件数は100以下である必要があります',
                code: 'LIMIT_TOO_LARGE'
            });
        }
    }

    // ソート順の検証
    if (criteria.sortOrder !== undefined && !['asc', 'desc'].includes(criteria.sortOrder)) {
        errors.push({
            field: 'sortOrder',
            message: 'ソート順は asc または desc である必要があります',
            code: 'SORT_ORDER_INVALID'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 問い合わせフィルターをバリデーション
 */
export function validateInquiryFilters(filters: any): ValidationResult {
    const errors = [];

    // ステータスフィルターの検証
    if (filters.status) {
        const invalidStatuses = filters.status.filter(status => !isValidInquiryStatus(status));
        if (invalidStatuses.length > 0) {
            errors.push({
                field: 'status',
                message: `無効なステータスが含まれています: ${invalidStatuses.join(', ')}`,
                code: 'STATUS_FILTER_INVALID'
            });
        }
    }

    // 優先度フィルターの検証
    if (filters.priority) {
        const invalidPriorities = filters.priority.filter(priority => !isValidInquiryPriority(priority));
        if (invalidPriorities.length > 0) {
            errors.push({
                field: 'priority',
                message: `無効な優先度が含まれています: ${invalidPriorities.join(', ')}`,
                code: 'PRIORITY_FILTER_INVALID'
            });
        }
    }

    // 日付範囲の検証
    if (filters.dateRange) {
        if (filters.dateRange.startDate > filters.dateRange.endDate) {
            errors.push({
                field: 'dateRange',
                message: '開始日は終了日より前である必要があります',
                code: 'DATE_RANGE_INVALID'
            });
        }
    }

    // 顧客メールアドレスの検証
    if (filters.customerEmail && !validateEmail(filters.customerEmail)) {
        errors.push({
            field: 'customerEmail',
            message: '有効なメールアドレスを入力してください',
            code: 'CUSTOMER_EMAIL_INVALID'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 問い合わせステータスの有効性をチェック
 */
export function isValidInquiryStatus(status: string): boolean {
    return ['new', 'in_progress', 'pending', 'resolved', 'closed'].includes(status);
}

/**
 * 問い合わせ優先度の有効性をチェック
 */
export function isValidInquiryPriority(priority: string): boolean {
    return ['low', 'medium', 'high', 'urgent'].includes(priority);
}

/**
 * メールアドレスの形式をバリデーション
 */
function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * UUIDの形式をバリデーション
 */
export function validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}