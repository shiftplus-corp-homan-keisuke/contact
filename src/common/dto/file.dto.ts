import { IsString, IsUUID, IsOptional, IsNumber, IsBoolean, IsEnum, IsDateString, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * ファイルアップロード用DTO
 */
export class FileUploadDto {
  @ApiProperty({ description: 'アップロードするファイル', type: 'string', format: 'binary' })
  file: Express.Multer.File;

  @ApiProperty({ description: '関連する問い合わせID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4', { message: '有効な問い合わせIDを指定してください' })
  inquiryId: string;

  @ApiPropertyOptional({ description: 'ファイルの説明', maxLength: 500 })
  @IsOptional()
  @IsString({ message: '説明は文字列で入力してください' })
  @MaxLength(500, { message: '説明は500文字以内で入力してください' })
  description?: string;
}

/**
 * ファイル情報レスポンス用DTO
 */
export class FileResponseDto {
  @ApiProperty({ description: 'ファイルID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'ファイル名', example: 'document.pdf' })
  filename: string;

  @ApiProperty({ description: '元のファイル名', example: 'original_document.pdf' })
  originalFilename: string;

  @ApiProperty({ description: 'ファイルサイズ（バイト）', example: 1024000 })
  size: number;

  @ApiProperty({ description: 'MIMEタイプ', example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ description: '関連する問い合わせID', example: '123e4567-e89b-12d3-a456-426614174000' })
  inquiryId: string;

  @ApiProperty({ description: 'アップロードしたユーザーID', example: '123e4567-e89b-12d3-a456-426614174000' })
  uploadedBy: string;

  @ApiProperty({ description: 'アップロード日時', example: '2024-01-01T00:00:00Z' })
  uploadedAt: Date;

  @ApiProperty({ description: 'ウイルススキャン済みフラグ', example: true })
  isScanned: boolean;

  @ApiProperty({ 
    description: 'スキャン結果', 
    enum: ['clean', 'infected', 'suspicious', 'pending'],
    example: 'clean'
  })
  scanResult: 'clean' | 'infected' | 'suspicious' | 'pending';

  @ApiPropertyOptional({ description: 'スキャン日時', example: '2024-01-01T00:00:00Z' })
  scannedAt?: Date;

  @ApiPropertyOptional({ description: 'ファイルの説明' })
  description?: string;

  @ApiProperty({ description: 'ダウンロード回数', example: 5 })
  downloadCount: number;

  @ApiPropertyOptional({ description: '最終ダウンロード日時', example: '2024-01-01T00:00:00Z' })
  lastDownloadedAt?: Date;

  @ApiPropertyOptional({ description: '有効期限', example: '2024-12-31T23:59:59Z' })
  expiresAt?: Date;

  @ApiProperty({ description: '作成日時', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '更新日時', example: '2024-01-01T00:00:00Z' })
  updatedAt: Date;
}

/**
 * ファイル検索用DTO
 */
export class FileSearchDto {
  @ApiPropertyOptional({ description: '問い合わせID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID('4', { message: '有効な問い合わせIDを指定してください' })
  inquiryId?: string;

  @ApiPropertyOptional({ description: 'アップロードしたユーザーID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID('4', { message: '有効なユーザーIDを指定してください' })
  uploadedBy?: string;

  @ApiPropertyOptional({ description: 'MIMEタイプ', example: 'application/pdf' })
  @IsOptional()
  @IsString({ message: 'MIMEタイプは文字列で指定してください' })
  mimeType?: string;

  @ApiPropertyOptional({ 
    description: 'スキャン結果', 
    enum: ['clean', 'infected', 'suspicious', 'pending']
  })
  @IsOptional()
  @IsEnum(['clean', 'infected', 'suspicious', 'pending'], { 
    message: 'スキャン結果は clean, infected, suspicious, pending のいずれかを指定してください' 
  })
  scanResult?: 'clean' | 'infected' | 'suspicious' | 'pending';

  @ApiPropertyOptional({ description: 'アップロード開始日', example: '2024-01-01' })
  @IsOptional()
  @IsDateString({}, { message: '有効な日付形式で入力してください' })
  uploadedAfter?: string;

  @ApiPropertyOptional({ description: 'アップロード終了日', example: '2024-12-31' })
  @IsOptional()
  @IsDateString({}, { message: '有効な日付形式で入力してください' })
  uploadedBefore?: string;

  @ApiPropertyOptional({ description: 'ファイル名での検索', example: 'document' })
  @IsOptional()
  @IsString({ message: 'ファイル名は文字列で指定してください' })
  @MaxLength(255, { message: 'ファイル名は255文字以内で指定してください' })
  filename?: string;

  @ApiPropertyOptional({ description: '最小ファイルサイズ（バイト）', example: 1024 })
  @IsOptional()
  @IsNumber({}, { message: '最小ファイルサイズは数値で指定してください' })
  @Min(0, { message: '最小ファイルサイズは0以上で指定してください' })
  @Transform(({ value }) => parseInt(value))
  minSize?: number;

  @ApiPropertyOptional({ description: '最大ファイルサイズ（バイト）', example: 10485760 })
  @IsOptional()
  @IsNumber({}, { message: '最大ファイルサイズは数値で指定してください' })
  @Min(0, { message: '最大ファイルサイズは0以上で指定してください' })
  @Transform(({ value }) => parseInt(value))
  maxSize?: number;

  @ApiPropertyOptional({ description: 'ページ番号', example: 1, default: 1 })
  @IsOptional()
  @IsNumber({}, { message: 'ページ番号は数値で指定してください' })
  @Min(1, { message: 'ページ番号は1以上で指定してください' })
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: '1ページあたりの件数', example: 20, default: 20 })
  @IsOptional()
  @IsNumber({}, { message: '1ページあたりの件数は数値で指定してください' })
  @Min(1, { message: '1ページあたりの件数は1以上で指定してください' })
  @Max(100, { message: '1ページあたりの件数は100以下で指定してください' })
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

/**
 * ファイル更新用DTO
 */
export class FileUpdateDto {
  @ApiPropertyOptional({ description: 'ファイルの説明', maxLength: 500 })
  @IsOptional()
  @IsString({ message: '説明は文字列で入力してください' })
  @MaxLength(500, { message: '説明は500文字以内で入力してください' })
  description?: string;

  @ApiPropertyOptional({ description: '有効期限', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString({}, { message: '有効な日付形式で入力してください' })
  expiresAt?: string;
}

/**
 * ファイルダウンロード用DTO
 */
export class FileDownloadDto {
  @ApiProperty({ description: 'ファイルID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4', { message: '有効なファイルIDを指定してください' })
  fileId: string;
}

/**
 * ファイル削除用DTO
 */
export class FileDeleteDto {
  @ApiProperty({ description: 'ファイルID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4', { message: '有効なファイルIDを指定してください' })
  fileId: string;

  @ApiPropertyOptional({ description: '削除理由', maxLength: 500 })
  @IsOptional()
  @IsString({ message: '削除理由は文字列で入力してください' })
  @MaxLength(500, { message: '削除理由は500文字以内で入力してください' })
  reason?: string;
}

/**
 * ファイル統計情報用DTO
 */
export class FileStatsDto {
  @ApiProperty({ description: '総ファイル数', example: 150 })
  totalFiles: number;

  @ApiProperty({ description: '総ファイルサイズ（バイト）', example: 1073741824 })
  totalSize: number;

  @ApiProperty({ description: 'アプリ別統計' })
  byApplication: Array<{
    appId: string;
    appName: string;
    fileCount: number;
    totalSize: number;
  }>;

  @ApiProperty({ description: 'MIMEタイプ別統計' })
  byMimeType: Array<{
    mimeType: string;
    fileCount: number;
    totalSize: number;
  }>;

  @ApiProperty({ description: 'スキャン結果別統計' })
  byScanResult: Array<{
    scanResult: string;
    fileCount: number;
  }>;

  @ApiProperty({ description: '月別アップロード統計' })
  byMonth: Array<{
    month: string;
    fileCount: number;
    totalSize: number;
  }>;
}

/**
 * ファイルバリデーション結果用DTO
 */
export class FileValidationResultDto {
  @ApiProperty({ description: 'バリデーション結果', example: true })
  isValid: boolean;

  @ApiProperty({ description: 'エラーメッセージ配列' })
  errors: string[];

  @ApiProperty({ description: '警告メッセージ配列' })
  warnings: string[];
}
/**

 * ファイルアクセスログ用DTO
 */
export class FileAccessLogDto {
  @ApiProperty({ description: 'ログID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'ファイルID', example: '123e4567-e89b-12d3-a456-426614174000' })
  fileId: string;

  @ApiProperty({ description: 'ユーザーID', example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ 
    description: 'アクセス種別', 
    enum: ['upload', 'download', 'view', 'delete', 'update'],
    example: 'download'
  })
  action: 'upload' | 'download' | 'view' | 'delete' | 'update';

  @ApiPropertyOptional({ description: 'IPアドレス', example: '192.168.1.1' })
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'ユーザーエージェント' })
  userAgent?: string;

  @ApiProperty({ description: 'アクセス日時', example: '2024-01-01T00:00:00Z' })
  accessedAt: Date;

  @ApiProperty({ description: '成功フラグ', example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'エラーメッセージ' })
  error?: string;
}

/**
 * ファイルスキャン結果用DTO
 */
export class FileScanResultDto {
  @ApiProperty({ description: 'ファイルID', example: '123e4567-e89b-12d3-a456-426614174000' })
  fileId: string;

  @ApiProperty({ 
    description: 'スキャン結果', 
    enum: ['clean', 'infected', 'suspicious', 'pending'],
    example: 'clean'
  })
  scanResult: 'clean' | 'infected' | 'suspicious' | 'pending';

  @ApiProperty({ description: 'スキャン日時', example: '2024-01-01T00:00:00Z' })
  scannedAt: Date;

  @ApiPropertyOptional({ description: 'スキャン詳細' })
  scanDetails?: string;
}

/**
 * ファイルアクセス統計用DTO
 */
export class FileAccessStatsDto {
  @ApiProperty({ description: '総アクセス数', example: 150 })
  totalAccess: number;

  @ApiProperty({ description: 'ダウンロード数', example: 100 })
  downloadCount: number;

  @ApiProperty({ description: '閲覧数', example: 50 })
  viewCount: number;

  @ApiPropertyOptional({ description: '最終アクセス日時', example: '2024-01-01T00:00:00Z' })
  lastAccessed?: Date;

  @ApiProperty({ description: 'トップユーザー' })
  topUsers: Array<{
    userId: string;
    accessCount: number;
  }>;
}

/**
 * セキュリティレポート用DTO
 */
export class SecurityReportDto {
  @ApiProperty({ description: '総スキャン数', example: 1000 })
  totalScans: number;

  @ApiProperty({ description: 'クリーンファイル数', example: 950 })
  cleanFiles: number;

  @ApiProperty({ description: '感染ファイル数', example: 5 })
  infectedFiles: number;

  @ApiProperty({ description: '疑わしいファイル数', example: 45 })
  suspiciousFiles: number;

  @ApiProperty({ description: 'トップ脅威' })
  topThreats: Array<{
    threat: string;
    count: number;
  }>;

  @ApiProperty({ description: 'アクセス違反数', example: 25 })
  accessViolations: number;

  @ApiProperty({ description: '疑わしいユーザー' })
  suspiciousUsers: Array<{
    userId: string;
    violations: number;
  }>;
}

/**
 * 疑わしいアクティビティ検出結果用DTO
 */
export class SuspiciousActivityDto {
  @ApiProperty({ description: '疑わしいアクティビティフラグ', example: false })
  isSuspicious: boolean;

  @ApiPropertyOptional({ description: '理由' })
  reason?: string;

  @ApiPropertyOptional({ description: '詳細情報' })
  details?: any;
}/**

 * ストレージ使用量用DTO
 */
export class StorageUsageDto {
  @ApiProperty({ description: '使用中のストレージサイズ（バイト）', example: 1073741824 })
  usedSize: number;

  @ApiProperty({ description: '利用可能なストレージサイズ（バイト）', example: 99 * 1024 * 1024 * 1024 })
  availableSize: number;

  @ApiProperty({ description: '総ストレージサイズ（バイト）', example: 100 * 1024 * 1024 * 1024 })
  totalSize: number;

  @ApiProperty({ description: '使用率（パーセント）', example: 1.0 })
  usagePercentage: number;

  @ApiProperty({ description: 'アプリ別使用量' })
  byApplication: Array<{
    appId: string;
    appName: string;
    usedSize: number;
    fileCount: number;
  }>;
}

/**
 * ファイルクリーンアップ結果用DTO
 */
export class FileCleanupResultDto {
  @ApiProperty({ description: 'クリーンアップされたファイル数', example: 50 })
  cleanedFileCount: number;

  @ApiProperty({ description: '解放されたストレージサイズ（バイト）', example: 104857600 })
  freedSize: number;

  @ApiProperty({ description: 'エラーが発生したファイル数', example: 2 })
  errorCount: number;

  @ApiProperty({ description: 'エラーメッセージ' })
  errors: string[];
}

/**
 * ファイルアーカイブ結果用DTO
 */
export class FileArchiveResultDto {
  @ApiProperty({ description: 'アーカイブされたファイル数', example: 100 })
  archivedFileCount: number;

  @ApiProperty({ description: 'アーカイブサイズ（バイト）', example: 52428800 })
  archiveSize: number;

  @ApiProperty({ description: 'アーカイブファイルパス', example: '/archives/archive_2024-01-01.zip' })
  archiveFilePath: string;
}

/**
 * バックアップ結果用DTO
 */
export class BackupResultDto {
  @ApiProperty({ description: 'バックアップファイルパス', example: '/backups/backup_2024-01-01.zip' })
  backupFilePath: string;

  @ApiProperty({ description: 'バックアップサイズ（バイト）', example: 1073741824 })
  backupSize: number;

  @ApiProperty({ description: 'バックアップされたファイル数', example: 500 })
  fileCount: number;
}

/**
 * ストレージレポート用DTO
 */
export class StorageReportDto {
  @ApiProperty({ description: 'ストレージ使用量', type: StorageUsageDto })
  storageUsage: StorageUsageDto;

  @ApiProperty({ description: 'ファイル統計', type: FileStatsDto })
  fileStatistics: FileStatsDto;

  @ApiProperty({ description: '物理使用量' })
  physicalUsage: {
    uploadDirSize: number;
    archiveDirSize: number;
    backupDirSize: number;
    totalPhysicalSize: number;
  };

  @ApiProperty({ description: '推奨事項' })
  recommendations: string[];
}