import { randomBytes } from 'crypto';

/**
 * 一意のIDを生成するユーティリティクラス
 */
export class IdGenerator {
  /**
   * 問い合わせ用の一意IDを生成
   * 形式: INQ-YYYYMMDD-XXXXXX
   */
  static generateInquiryId(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = randomBytes(3).toString('hex').toUpperCase();
    return `INQ-${dateStr}-${randomStr}`;
  }

  /**
   * APIキー用のランダム文字列を生成
   */
  static generateApiKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * セッション用のランダム文字列を生成
   */
  static generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * 指定された長さのランダム文字列を生成
   */
  static generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}