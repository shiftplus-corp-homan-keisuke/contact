import { Injectable } from '@nestjs/common';
import { FileValidationResult } from '../types';

/**
 * ファイルバリデーター
 * ファイルのアップロード前検証を行う
 */
@Injectable()
export class FileValidator {
    // 許可されるMIMEタイプ
    private readonly allowedMimeTypes = [
        // 画像
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',

        // ドキュメント
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',

        // テキスト
        'text/plain',
        'text/csv',
        'application/json',
        'application/xml',
        'text/xml',

        // アーカイブ
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',

        // その他
        'application/octet-stream',
    ];

    // 最大ファイルサイズ（50MB）
    private readonly maxFileSize = 50 * 1024 * 1024;

    // 危険なファイル拡張子
    private readonly dangerousExtensions = [
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
        '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.run', '.bin',
        '.sh', '.ps1', '.psm1', '.psd1', '.ps1xml', '.psc1', '.psc2',
    ];

    /**
     * ファイルの基本バリデーション
     */
    validateFile(
        filename: string,
        mimeType: string,
        size: number,
        buffer?: Buffer
    ): FileValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // ファイル名チェック
        if (!filename || filename.trim().length === 0) {
            errors.push('ファイル名が指定されていません');
        }

        if (filename.length > 255) {
            errors.push('ファイル名が長すぎます（255文字以内）');
        }

        // 危険な文字のチェック
        const dangerousChars = /[<>:"|?*\x00-\x1f]/;
        if (dangerousChars.test(filename)) {
            errors.push('ファイル名に使用できない文字が含まれています');
        }

        // 危険な拡張子のチェック
        const extension = this.getFileExtension(filename);
        if (this.dangerousExtensions.includes(extension.toLowerCase())) {
            errors.push(`実行可能ファイル（${extension}）はアップロードできません`);
        }

        // MIMEタイプチェック
        if (!mimeType) {
            errors.push('ファイルタイプが不明です');
        } else if (!this.allowedMimeTypes.includes(mimeType)) {
            errors.push(`サポートされていないファイルタイプです: ${mimeType}`);
        }

        // ファイルサイズチェック
        if (size <= 0) {
            errors.push('ファイルサイズが不正です');
        } else if (size > this.maxFileSize) {
            errors.push(`ファイルサイズが大きすぎます（最大${this.formatFileSize(this.maxFileSize)}）`);
        }

        // バッファーの整合性チェック
        if (buffer && buffer.length !== size) {
            errors.push('ファイルサイズとデータサイズが一致しません');
        }

        // 警告の生成
        if (size > 10 * 1024 * 1024) { // 10MB以上
            warnings.push('大きなファイルです。アップロードに時間がかかる場合があります');
        }

        if (mimeType === 'application/octet-stream') {
            warnings.push('ファイルタイプを自動判定できませんでした');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    /**
     * ファイル名の重複チェック用の正規化
     */
    normalizeFilename(filename: string): string {
        // 危険な文字を除去
        let normalized = filename.replace(/[<>:"|?*\x00-\x1f]/g, '_');

        // 連続するアンダースコアを単一に
        normalized = normalized.replace(/_+/g, '_');

        // 先頭・末尾のアンダースコアを除去
        normalized = normalized.replace(/^_+|_+$/g, '');

        // 空になった場合のデフォルト名
        if (!normalized) {
            normalized = 'unnamed_file';
        }

        return normalized;
    }

    /**
     * ファイル拡張子の取得
     */
    private getFileExtension(filename: string): string {
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
    }

    /**
     * ファイルサイズの人間が読みやすい形式への変換
     */
    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${Math.round(size * 100) / 100}${units[unitIndex]}`;
    }

    /**
     * MIMEタイプから推奨拡張子を取得
     */
    getRecommendedExtension(mimeType: string): string {
        const mimeToExt: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'text/plain': '.txt',
            'text/csv': '.csv',
            'application/json': '.json',
            'application/zip': '.zip',
        };

        return mimeToExt[mimeType] || '';
    }

    /**
     * 許可されているMIMEタイプの一覧を取得
     */
    getAllowedMimeTypes(): string[] {
        return [...this.allowedMimeTypes];
    }

    /**
     * 最大ファイルサイズを取得
     */
    getMaxFileSize(): number {
        return this.maxFileSize;
    }
}