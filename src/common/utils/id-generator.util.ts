import { v4 as uuidv4 } from 'uuid';

/**
 * ID生成ユーティリティクラス
 */
export class IdGenerator {
    /**
     * UUID v4を生成
     */
    static generateUuid(): string {
        return uuidv4();
    }

    /**
     * プレフィックス付きIDを生成
     * @param prefix プレフィックス
     * @returns プレフィックス付きID
     */
    static generatePrefixedId(prefix: string): string {
        return `${prefix}_${uuidv4()}`;
    }

    /**
     * 問い合わせIDを生成
     */
    static generateInquiryId(): string {
        return this.generatePrefixedId('inq');
    }

    /**
     * 回答IDを生成
     */
    static generateResponseId(): string {
        return this.generatePrefixedId('res');
    }

    /**
     * FAQ IDを生成
     */
    static generateFaqId(): string {
        return this.generatePrefixedId('faq');
    }

    /**
     * ユーザーIDを生成
     */
    static generateUserId(): string {
        return this.generatePrefixedId('usr');
    }

    /**
     * APIキーを生成
     */
    static generateApiKey(): string {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2);
        return `ak_${timestamp}_${randomPart}`;
    }

    /**
     * ファイルIDを生成
     */
    static generateFileId(): string {
        return this.generatePrefixedId('file');
    }

    /**
     * 通知IDを生成
     */
    static generateNotificationId(): string {
        return this.generatePrefixedId('notif');
    }

    /**
     * テンプレートIDを生成
     */
    static generateTemplateId(): string {
        return this.generatePrefixedId('tmpl');
    }
}