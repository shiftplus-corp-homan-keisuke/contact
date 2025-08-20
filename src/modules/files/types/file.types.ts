/**
 * ファイル管理関連の型定義
 */

// ファイルアップロード要求
export interface FileUploadRequest {
    filename: string;
    originalName: string;
    buffer: Buffer;
    mimeType: string;
    size: number;
    inquiryId: string;
    uploadedBy: string;
    metadata?: Record<string, any>;
}

// ファイルメタデータ
export interface FileMetadata {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    fileHash: string;
    inquiryId: string;
    uploadedBy: string;
    isScanned: boolean;
    scanResult: 'pending' | 'clean' | 'infected' | 'suspicious' | 'error';
    scanDetails?: string;
    scannedAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

// ファイルデータ（ダウンロード用）
export interface FileData {
    metadata: FileMetadata;
    buffer: Buffer;
}

// ファイルバリデーション結果
export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

// ファイルスキャン結果
export interface FileScanResult {
    fileId: string;
    result: 'clean' | 'infected' | 'suspicious' | 'error';
    details?: string;
    scannedAt: Date;
    threats?: string[];
}

// ストレージ使用量
export interface StorageUsage {
    appId?: string;
    totalFiles: number;
    totalSize: number;
    sizeByType: Record<string, number>;
    filesByType: Record<string, number>;
    lastUpdated: Date;
}

// クリーンアップ結果
export interface CleanupResult {
    deletedFiles: number;
    freedSpace: number;
    errors: string[];
    processedAt: Date;
}

// ファイルフィルター
export interface FileFilters {
    inquiryId?: string;
    uploadedBy?: string;
    mimeType?: string;
    scanResult?: 'pending' | 'clean' | 'infected' | 'suspicious' | 'error';
    isDeleted?: boolean;
    dateRange?: {
        start: Date;
        end: Date;
    };
    sizeRange?: {
        min: number;
        max: number;
    };
}

// ファイル設定
export interface FileConfig {
    maxFileSize: number; // バイト単位
    allowedMimeTypes: string[];
    uploadPath: string;
    virusScanEnabled: boolean;
    autoCleanupEnabled: boolean;
    cleanupRetentionDays: number;
}

// ファイルアクセスログ
export interface FileAccessLogData {
    fileId: string;
    userId?: string;
    action: 'upload' | 'download' | 'view' | 'delete' | 'scan';
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
    metadata?: Record<string, any>;
}

// ファイル統計
export interface FileStatistics {
    totalFiles: number;
    totalSize: number;
    filesByStatus: Record<string, number>;
    filesByType: Record<string, number>;
    uploadsByDay: Array<{
        date: string;
        count: number;
        size: number;
    }>;
    topUploaders: Array<{
        userId: string;
        userName: string;
        fileCount: number;
        totalSize: number;
    }>;
}