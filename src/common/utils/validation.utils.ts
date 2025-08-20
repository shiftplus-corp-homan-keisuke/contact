import { ValidationError } from 'class-validator';

/**
 * バリデーションユーティリティクラス
 */
export class ValidationUtils {
    /**
     * メールアドレスの形式をチェック
     * @param email メールアドレス
     */
    static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * パスワードの強度をチェック
     * @param password パスワード
     * @param minLength 最小文字数（デフォルト: 8）
     */
    static isStrongPassword(password: string, minLength: number = 8): boolean {
        if (password.length < minLength) return false;

        // 大文字、小文字、数字、特殊文字を含むかチェック
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    }

    /**
     * UUIDの形式をチェック
     * @param uuid UUID文字列
     */
    static isValidUuid(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * 電話番号の形式をチェック（日本の電話番号）
     * @param phoneNumber 電話番号
     */
    static isValidPhoneNumber(phoneNumber: string): boolean {
        const phoneRegex = /^(\+81|0)[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}$/;
        return phoneRegex.test(phoneNumber);
    }

    /**
     * URLの形式をチェック
     * @param url URL文字列
     */
    static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 日付文字列の形式をチェック（ISO 8601形式）
     * @param dateString 日付文字列
     */
    static isValidDateString(dateString: string): boolean {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && dateString === date.toISOString();
    }

    /**
     * 文字列の長さをチェック
     * @param str 文字列
     * @param minLength 最小文字数
     * @param maxLength 最大文字数
     */
    static isValidLength(str: string, minLength: number, maxLength: number): boolean {
        return str.length >= minLength && str.length <= maxLength;
    }

    /**
     * 数値が範囲内かチェック
     * @param num 数値
     * @param min 最小値
     * @param max 最大値
     */
    static isInRange(num: number, min: number, max: number): boolean {
        return num >= min && num <= max;
    }

    /**
     * 配列が空でないかチェック
     * @param arr 配列
     */
    static isNotEmptyArray<T>(arr: T[]): boolean {
        return Array.isArray(arr) && arr.length > 0;
    }

    /**
     * オブジェクトが空でないかチェック
     * @param obj オブジェクト
     */
    static isNotEmptyObject(obj: any): boolean {
        return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
    }

    /**
     * class-validatorのエラーを整形
     * @param errors ValidationErrorの配列
     */
    static formatValidationErrors(errors: ValidationError[]): Array<{ field: string; message: string; value?: any }> {
        const result: Array<{ field: string; message: string; value?: any }> = [];

        const processError = (error: ValidationError, parentPath: string = '') => {
            const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

            if (error.constraints) {
                Object.values(error.constraints).forEach(message => {
                    result.push({
                        field: fieldPath,
                        message,
                        value: error.value,
                    });
                });
            }

            if (error.children && error.children.length > 0) {
                error.children.forEach(child => processError(child, fieldPath));
            }
        };

        errors.forEach(error => processError(error));
        return result;
    }

    /**
     * ファイル名の安全性をチェック
     * @param filename ファイル名
     */
    static isSafeFilename(filename: string): boolean {
        // 危険な文字や相対パスを含まないかチェック
        const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
        const relativePath = /\.\./;

        return !dangerousChars.test(filename) && !relativePath.test(filename) && filename.length > 0;
    }

    /**
     * SQLインジェクション攻撃の可能性をチェック
     * @param input 入力文字列
     */
    static hasSqlInjectionRisk(input: string): boolean {
        const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/i;
        const sqlChars = /[';-]/;

        return sqlKeywords.test(input) || sqlChars.test(input);
    }

    /**
     * XSS攻撃の可能性をチェック
     * @param input 入力文字列
     */
    static hasXssRisk(input: string): boolean {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        ];

        return xssPatterns.some(pattern => pattern.test(input));
    }
}