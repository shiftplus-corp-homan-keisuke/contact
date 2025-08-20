/**
 * ユーザー関連のバリデーション関数
 * 要件4: ユーザー管理機能のバリデーション
 */

import { ValidationResult } from '../types/validation.types';

/**
 * メールアドレスの形式をバリデーション
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * パスワードの強度をバリデーション
 * - 最低8文字
 * - 大文字・小文字・数字を含む
 */
export function validatePassword(password: string): ValidationResult {
    const errors = [];

    if (!password || password.length < 8) {
        errors.push({
            field: 'password',
            message: 'パスワードは8文字以上である必要があります',
            code: 'PASSWORD_TOO_SHORT'
        });
    }

    if (!/[A-Z]/.test(password)) {
        errors.push({
            field: 'password',
            message: 'パスワードには大文字を含める必要があります',
            code: 'PASSWORD_MISSING_UPPERCASE'
        });
    }

    if (!/[a-z]/.test(password)) {
        errors.push({
            field: 'password',
            message: 'パスワードには小文字を含める必要があります',
            code: 'PASSWORD_MISSING_LOWERCASE'
        });
    }

    if (!/\d/.test(password)) {
        errors.push({
            field: 'password',
            message: 'パスワードには数字を含める必要があります',
            code: 'PASSWORD_MISSING_NUMBER'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * ユーザー作成リクエストをバリデーション
 */
export function validateCreateUserRequest(request: any): ValidationResult {
    const errors = [];

    // メールアドレスの検証
    if (!request.email) {
        errors.push({
            field: 'email',
            message: 'メールアドレスは必須項目です',
            code: 'EMAIL_REQUIRED'
        });
    } else if (!validateEmail(request.email)) {
        errors.push({
            field: 'email',
            message: '有効なメールアドレスを入力してください',
            code: 'EMAIL_INVALID'
        });
    }

    // パスワードの検証
    if (!request.password) {
        errors.push({
            field: 'password',
            message: 'パスワードは必須項目です',
            code: 'PASSWORD_REQUIRED'
        });
    } else {
        const passwordValidation = validatePassword(request.password);
        errors.push(...passwordValidation.errors);
    }

    // 名前の検証
    if (!request.name || request.name.trim().length === 0) {
        errors.push({
            field: 'name',
            message: '名前は必須項目です',
            code: 'NAME_REQUIRED'
        });
    } else if (request.name.length > 255) {
        errors.push({
            field: 'name',
            message: '名前は255文字以内で入力してください',
            code: 'NAME_TOO_LONG'
        });
    }

    // ロールIDの検証
    if (!request.roleId) {
        errors.push({
            field: 'roleId',
            message: 'ロールは必須項目です',
            code: 'ROLE_REQUIRED'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * ユーザー更新リクエストをバリデーション
 */
export function validateUpdateUserRequest(request: any): ValidationResult {
    const errors = [];

    // メールアドレスの検証（提供されている場合）
    if (request.email !== undefined) {
        if (!request.email) {
            errors.push({
                field: 'email',
                message: 'メールアドレスは空にできません',
                code: 'EMAIL_EMPTY'
            });
        } else if (!validateEmail(request.email)) {
            errors.push({
                field: 'email',
                message: '有効なメールアドレスを入力してください',
                code: 'EMAIL_INVALID'
            });
        }
    }

    // 名前の検証（提供されている場合）
    if (request.name !== undefined) {
        if (!request.name || request.name.trim().length === 0) {
            errors.push({
                field: 'name',
                message: '名前は空にできません',
                code: 'NAME_EMPTY'
            });
        } else if (request.name.length > 255) {
            errors.push({
                field: 'name',
                message: '名前は255文字以内で入力してください',
                code: 'NAME_TOO_LONG'
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * ログイン認証情報をバリデーション
 */
export function validateLoginCredentials(credentials: any): ValidationResult {
    const errors = [];

    if (!credentials.email) {
        errors.push({
            field: 'email',
            message: 'メールアドレスは必須項目です',
            code: 'EMAIL_REQUIRED'
        });
    } else if (!validateEmail(credentials.email)) {
        errors.push({
            field: 'email',
            message: '有効なメールアドレスを入力してください',
            code: 'EMAIL_INVALID'
        });
    }

    if (!credentials.password) {
        errors.push({
            field: 'password',
            message: 'パスワードは必須項目です',
            code: 'PASSWORD_REQUIRED'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * ユーザー名の重複チェック用バリデーション
 */
export function validateUserName(name: string): ValidationResult {
    const errors = [];

    if (!name || name.trim().length === 0) {
        errors.push({
            field: 'name',
            message: '名前は必須項目です',
            code: 'NAME_REQUIRED'
        });
        return { isValid: false, errors };
    }

    // 名前の長さチェック
    if (name.length < 2) {
        errors.push({
            field: 'name',
            message: '名前は2文字以上で入力してください',
            code: 'NAME_TOO_SHORT'
        });
    }

    if (name.length > 255) {
        errors.push({
            field: 'name',
            message: '名前は255文字以内で入力してください',
            code: 'NAME_TOO_LONG'
        });
    }

    // 特殊文字のチェック
    const invalidChars = /[<>\"'&]/;
    if (invalidChars.test(name)) {
        errors.push({
            field: 'name',
            message: '名前に使用できない文字が含まれています',
            code: 'NAME_INVALID_CHARS'
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}