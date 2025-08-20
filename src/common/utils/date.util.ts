/**
 * 日付ユーティリティクラス
 */
export class DateUtil {
    /**
     * 現在の日時を取得
     */
    static now(): Date {
        return new Date();
    }

    /**
     * 日付を文字列に変換
     * @param date 日付
     * @param format フォーマット（デフォルト: ISO文字列）
     */
    static toString(date: Date, format: 'iso' | 'date' | 'datetime' = 'iso'): string {
        switch (format) {
            case 'iso':
                return date.toISOString();
            case 'date':
                return date.toISOString().split('T')[0];
            case 'datetime':
                return date.toISOString().replace('T', ' ').substring(0, 19);
            default:
                return date.toISOString();
        }
    }

    /**
     * 文字列を日付に変換
     * @param dateString 日付文字列
     */
    static fromString(dateString: string): Date {
        return new Date(dateString);
    }

    /**
     * 日付に日数を追加
     * @param date 基準日
     * @param days 追加する日数
     */
    static addDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * 日付に時間を追加
     * @param date 基準日
     * @param hours 追加する時間数
     */
    static addHours(date: Date, hours: number): Date {
        const result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
    }

    /**
     * 日付に分を追加
     * @param date 基準日
     * @param minutes 追加する分数
     */
    static addMinutes(date: Date, minutes: number): Date {
        const result = new Date(date);
        result.setMinutes(result.getMinutes() + minutes);
        return result;
    }

    /**
     * 日付の差分を計算（日数）
     * @param date1 日付1
     * @param date2 日付2
     */
    static diffInDays(date1: Date, date2: Date): number {
        const diffTime = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * 日付の差分を計算（時間）
     * @param date1 日付1
     * @param date2 日付2
     */
    static diffInHours(date1: Date, date2: Date): number {
        const diffTime = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60));
    }

    /**
     * 日付の差分を計算（分）
     * @param date1 日付1
     * @param date2 日付2
     */
    static diffInMinutes(date1: Date, date2: Date): number {
        const diffTime = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(diffTime / (1000 * 60));
    }

    /**
     * 日付が範囲内かチェック
     * @param date チェック対象の日付
     * @param startDate 開始日
     * @param endDate 終了日
     */
    static isInRange(date: Date, startDate: Date, endDate: Date): boolean {
        return date >= startDate && date <= endDate;
    }

    /**
     * 月の開始日を取得
     * @param date 基準日
     */
    static getStartOfMonth(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    /**
     * 月の終了日を取得
     * @param date 基準日
     */
    static getEndOfMonth(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    /**
     * 日の開始時刻を取得
     * @param date 基準日
     */
    static getStartOfDay(date: Date): Date {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    /**
     * 日の終了時刻を取得
     * @param date 基準日
     */
    static getEndOfDay(date: Date): Date {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    }

    /**
     * 日付が今日かチェック
     * @param date チェック対象の日付
     */
    static isToday(date: Date): boolean {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    /**
     * 日付が過去かチェック
     * @param date チェック対象の日付
     */
    static isPast(date: Date): boolean {
        return date < new Date();
    }

    /**
     * 日付が未来かチェック
     * @param date チェック対象の日付
     */
    static isFuture(date: Date): boolean {
        return date > new Date();
    }
}