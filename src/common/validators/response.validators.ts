/**
 * 回答関連のバリデーション関数
 * 要件2: 問い合わせ・回答管理機能のバリデーション
 */

import { ValidationResult } from '../types/validation.types';

/**
 * 回答データをバリデーション
 */
export function validateResponseData(data: any): ValidationResult {
    const errors = [];

    // 内容の検証（必須項目）
    if (!data.content || data.content.trim().length === 0) {
        errors.push({
            field: 'content',
            message: '回答内容は必須項目です',
            code: 'CONTENT_REQUIRED'
        });
    } else if (data.content.length > 10000) {
        errors.push({
            field: 'content',
            message: '回答内容は10000文字以内で入力してください',
            code: 'CONTENT_TOO_LONG'
        });
    }

    // 公開フラグの検証（任意項目、デフォルトはfalse）
    if (data.isPublic !== undefined && typeof data.isPublic !== 'boolean') {
        errors.push({
            field: 'isPublic',
            message: '公開フラグはboolean値である必要があります',
            code: 'IS_PUBLIC_INVALID'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 回答更新データをバリデーション
 */
export function validateResponseUpdate(update: any): ValidationResult {
    const errors = [];

    // 内容の検証（提供されている場合）
    if (update.content !== undefined) {
        if (!update.content || update.content.trim().length === 0) {
            errors.push({
                field: 'content',
                message: '回答内容は空にできません',
                code: 'CONTENT_EMPTY'
            });
        } else if (update.content.length > 10000) {
            errors.push({
                field: 'content',
                message: '回答内容は10000文字以内で入力してください',
                code: 'CONTENT_TOO_LONG'
            });
        }
    }

    // 公開フラグの検証（提供されている場合）
    if (update.isPublic !== undefined && typeof update.isPublic !== 'boolean') {
        errors.push({
            field: 'isPublic',
            message: '公開フラグはboolean値である必要があります',
            code: 'IS_PUBLIC_INVALID'
        });
    }

    // 少なくとも一つのフィールドが更新されているかチェック
    if (update.content === undefined && update.isPublic === undefined) {
        errors.push({
            field: 'update',
            message: '更新する項目を指定してください',
            code: 'NO_UPDATE_FIELDS'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 回答内容のセキュリティチェック
 * 悪意のあるスクリプトやHTMLタグの検出
 */
export function validateResponseSecurity(content: string): ValidationResult {
    const errors = [];

    // 基本的なXSS攻撃パターンの検出
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b[^>]*>/gi,
        /<object\b[^>]*>/gi,
        /<embed\b[^>]*>/gi
    ];

    for (const pattern of xssPatterns) {
        if (pattern.test(content)) {
            errors.push({
                field: 'content',
                message: '回答内容に許可されていないコードが含まれています',
                code: 'CONTENT_SECURITY_VIOLATION'
            });
            break;
        }
    }

    // SQLインジェクション攻撃パターンの検出
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
        /('|(\\')|(;)|(--)|(\s(OR|AND)\s))/gi
    ];

    for (const pattern of sqlPatterns) {
        if (pattern.test(content)) {
            errors.push({
                field: 'content',
                message: '回答内容に不正なSQLコードが含まれている可能性があります',
                code: 'CONTENT_SQL_INJECTION'
            });
            break;
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 回答内容の品質チェック
 * 最低限の品質基準を満たしているかチェック
 */
export function validateResponseQuality(content: string): ValidationResult {
    const errors = [];
    const warnings = [];

    // 最小文字数チェック
    if (content.trim().length < 10) {
        warnings.push({
            field: 'content',
            message: '回答内容が短すぎる可能性があります（10文字未満）',
            code: 'CONTENT_TOO_SHORT'
        });
    }

    // 単語数チェック
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount < 3) {
        warnings.push({
            field: 'content',
            message: '回答内容の単語数が少ない可能性があります',
            code: 'CONTENT_FEW_WORDS'
        });
    }

    // 同じ文字の連続チェック
    if (/(.)\1{10,}/.test(content)) {
        errors.push({
            field: 'content',
            message: '同じ文字が連続しすぎています',
            code: 'CONTENT_REPEATED_CHARS'
        });
    }

    // 全て大文字チェック
    if (content.length > 50 && content === content.toUpperCase()) {
        warnings.push({
            field: 'content',
            message: '全て大文字で入力されています',
            code: 'CONTENT_ALL_CAPS'
        });
    }

    return {
        isValid: errors.length === 0,
        errors: [...errors, ...warnings]
    };
}

/**
 * 回答の公開可否をチェック
 * 公開に適さない内容が含まれていないかチェック
 */
export function validateResponsePublishability(content: string): ValidationResult {
    const errors = [];

    // 個人情報の可能性がある情報の検出
    const piiPatterns = [
        /\b\d{3}-\d{4}-\d{4}\b/g, // 電話番号
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // メールアドレス
        /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // クレジットカード番号の可能性
        /\b\d{3}-\d{2}-\d{4}\b/g // 社会保障番号の可能性
    ];

    for (const pattern of piiPatterns) {
        if (pattern.test(content)) {
            errors.push({
                field: 'content',
                message: '個人情報が含まれている可能性があるため、公開には適していません',
                code: 'CONTENT_CONTAINS_PII'
            });
            break;
        }
    }

    // 機密情報を示すキーワードの検出
    const confidentialKeywords = [
        'パスワード', 'password', 'secret', '秘密', '機密',
        'api key', 'apikey', 'token', 'トークン',
        '内部', 'internal', 'confidential'
    ];

    const lowerContent = content.toLowerCase();
    for (const keyword of confidentialKeywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
            errors.push({
                field: 'content',
                message: '機密情報が含まれている可能性があるため、公開には適していません',
                code: 'CONTENT_CONTAINS_CONFIDENTIAL'
            });
            break;
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}