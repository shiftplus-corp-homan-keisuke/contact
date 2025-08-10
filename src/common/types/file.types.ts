/**
 * ファイル管理関連の型定義
 */

/**
 * ファイルアップロード設定
 */
export interface FileUploadConfig {
  /** 最大ファイルサイズ（バイト） */
  maxFileSize: number;
  /** 許可されるMIMEタイプ */
  allowedMimeTypes: string[];
  /** 許可されるファイル拡張子 */
  allowedExtensions: string[];
  /** アップロード先ディレクトリ */
  uploadDirectory: string;
  /** ファイル名の最大長 */
  maxFilenameLength: number;
}

/**
 * ファイルメタデータ
 */
export interface FileMetadata {
  /** ファイルID */
  id: string;
  /** ファイル名 */
  filename: string;
  /** 元のファイル名 */
  originalFilename: string;
  /** ファイルサイズ */
  size: number;
  /** MIMEタイプ */
  mimeType: string;
  /** ファイルパス */
  filePath: string;
  /** ファイルハッシュ */
  fileHash?: string;
  /** 問い合わせID */
  inquiryId: string;
  /** アップロードユーザーID */
  uploadedBy: string;
  /** アップロード日時 */
  uploadedAt: Date;
  /** スキャン状態 */
  isScanned: boolean;
  /** スキャン結果 */
  scanResult: FileScanResult;
  /** スキャン日時 */
  scannedAt?: Date;
  /** 説明 */
  description?: string;
  /** ダウンロード回数 */
  downloadCount: number;
  /** 最終ダウンロード日時 */
  lastDownloadedAt?: Date;
  /** 有効期限 */
  expiresAt?: Date;
}

/**
 * ファイルスキャン結果
 */
export enum FileScanResult {
  PENDING = 'pending',
  CLEAN = 'clean',
  INFECTED = 'infected',
  SUSPICIOUS = 'suspicious'
}

/**
 * ファイルバリデーション結果
 */
export interface FileValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラーメッセージ */
  errors: string[];
  /** 警告メッセージ */
  warnings: string[];
}

/**
 * ファイル検索条件
 */
export interface FileSearchCriteria {
  /** 問い合わせID */
  inquiryId?: string;
  /** アップロードユーザーID */
  uploadedBy?: string;
  /** MIMEタイプ */
  mimeType?: string;
  /** スキャン結果 */
  scanResult?: FileScanResult;
  /** アップロード開始日 */
  uploadedAfter?: Date;
  /** アップロード終了日 */
  uploadedBefore?: Date;
  /** ファイル名（部分一致） */
  filename?: string;
  /** 最小ファイルサイズ */
  minSize?: number;
  /** 最大ファイルサイズ */
  maxSize?: number;
  /** 削除されたファイルを含むか */
  includeDeleted?: boolean;
}

/**
 * ファイル統計情報
 */
export interface FileStatistics {
  /** 総ファイル数 */
  totalFiles: number;
  /** 総ファイルサイズ */
  totalSize: number;
  /** アプリ別統計 */
  byApplication: ApplicationFileStats[];
  /** MIMEタイプ別統計 */
  byMimeType: MimeTypeFileStats[];
  /** スキャン結果別統計 */
  byScanResult: ScanResultFileStats[];
  /** 月別統計 */
  byMonth: MonthlyFileStats[];
}

/**
 * アプリ別ファイル統計
 */
export interface ApplicationFileStats {
  /** アプリID */
  appId: string;
  /** アプリ名 */
  appName: string;
  /** ファイル数 */
  fileCount: number;
  /** 総サイズ */
  totalSize: number;
}

/**
 * MIMEタイプ別ファイル統計
 */
export interface MimeTypeFileStats {
  /** MIMEタイプ */
  mimeType: string;
  /** ファイル数 */
  fileCount: number;
  /** 総サイズ */
  totalSize: number;
}

/**
 * スキャン結果別ファイル統計
 */
export interface ScanResultFileStats {
  /** スキャン結果 */
  scanResult: FileScanResult;
  /** ファイル数 */
  fileCount: number;
}

/**
 * 月別ファイル統計
 */
export interface MonthlyFileStats {
  /** 年月 */
  month: string;
  /** ファイル数 */
  fileCount: number;
  /** 総サイズ */
  totalSize: number;
}

/**
 * ファイルダウンロード情報
 */
export interface FileDownloadInfo {
  /** ファイルストリーム */
  stream: NodeJS.ReadableStream;
  /** ファイル名 */
  filename: string;
  /** MIMEタイプ */
  mimeType: string;
  /** ファイルサイズ */
  size: number;
}

/**
 * ファイルアップロード結果
 */
export interface FileUploadResult {
  /** アップロード成功フラグ */
  success: boolean;
  /** ファイルメタデータ */
  file?: FileMetadata;
  /** エラーメッセージ */
  error?: string;
  /** 警告メッセージ */
  warnings?: string[];
}

/**
 * ファイル削除結果
 */
export interface FileDeletionResult {
  /** 削除成功フラグ */
  success: boolean;
  /** 削除されたファイルID */
  fileId: string;
  /** エラーメッセージ */
  error?: string;
}

/**
 * ストレージ使用量情報
 */
export interface StorageUsage {
  /** 使用中のストレージサイズ（バイト） */
  usedSize: number;
  /** 利用可能なストレージサイズ（バイト） */
  availableSize: number;
  /** 総ストレージサイズ（バイト） */
  totalSize: number;
  /** 使用率（パーセント） */
  usagePercentage: number;
  /** アプリ別使用量 */
  byApplication: Array<{
    appId: string;
    appName: string;
    usedSize: number;
    fileCount: number;
  }>;
}

/**
 * ファイルクリーンアップ結果
 */
export interface FileCleanupResult {
  /** クリーンアップされたファイル数 */
  cleanedFileCount: number;
  /** 解放されたストレージサイズ（バイト） */
  freedSize: number;
  /** エラーが発生したファイル数 */
  errorCount: number;
  /** エラーメッセージ */
  errors: string[];
}

/**
 * ファイルアクセス権限
 */
export enum FileAccessPermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin'
}

/**
 * ファイルアクセスログ
 */
export interface FileAccessLog {
  /** ログID */
  id: string;
  /** ファイルID */
  fileId: string;
  /** ユーザーID */
  userId: string;
  /** アクセス種別 */
  action: 'upload' | 'download' | 'view' | 'delete' | 'update';
  /** IPアドレス */
  ipAddress: string;
  /** ユーザーエージェント */
  userAgent: string;
  /** アクセス日時 */
  accessedAt: Date;
  /** 成功フラグ */
  success: boolean;
  /** エラーメッセージ */
  error?: string;
}