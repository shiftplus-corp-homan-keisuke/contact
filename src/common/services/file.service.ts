import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { File } from '../entities/file.entity';
import { FileRepository } from '../repositories/file.repository';
import { 
  FileMetadata, 
  FileUploadConfig, 
  FileValidationResult, 
  FileSearchCriteria,
  FileScanResult,
  FileStatistics,
  FileDownloadInfo,
  FileUploadResult,
  FileDeletionResult,
  StorageUsage,
  FileCleanupResult
} from '../types/file.types';
import { PaginatedResult } from '../types';

/**
 * ファイル管理サービス
 * ファイルのアップロード、ダウンロード、管理機能を提供
 */
@Injectable()
export class FileService {
  private readonly uploadConfig: FileUploadConfig;

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly configService: ConfigService,
  ) {
    // 設定の初期化
    this.uploadConfig = {
      maxFileSize: this.configService.get<number>('FILE_MAX_SIZE', 10 * 1024 * 1024), // 10MB
      allowedMimeTypes: this.configService.get<string>('FILE_ALLOWED_MIME_TYPES', 
        'image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ).split(','),
      allowedExtensions: this.configService.get<string>('FILE_ALLOWED_EXTENSIONS',
        '.jpg,.jpeg,.png,.gif,.pdf,.txt,.doc,.docx'
      ).split(','),
      uploadDirectory: this.configService.get<string>('FILE_UPLOAD_DIR', './uploads'),
      maxFilenameLength: this.configService.get<number>('FILE_MAX_FILENAME_LENGTH', 255)
    };
  }

  /**
   * ファイルをアップロード
   */
  async uploadFile(
    file: Express.Multer.File,
    inquiryId: string,
    uploadedBy: string,
    description?: string
  ): Promise<FileUploadResult> {
    try {
      // バリデーション
      const validation = await this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          warnings: validation.warnings
        };
      }

      // ファイルハッシュを計算
      const fileHash = await this.calculateFileHash(file.buffer);

      // 重複チェック
      const existingFile = await this.fileRepository.findByFileHash(fileHash);
      if (existingFile) {
        return {
          success: false,
          error: '同じファイルが既にアップロードされています',
          warnings: [`既存ファイル: ${existingFile.filename}`]
        };
      }

      // ファイル保存
      const savedFilePath = await this.saveFile(file, fileHash);

      // データベースに保存
      const fileEntity = this.fileRepository.create({
        filename: this.generateUniqueFilename(file.originalname),
        originalFilename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        filePath: savedFilePath,
        fileHash,
        inquiryId,
        uploadedBy,
        description,
        scanResult: FileScanResult.PENDING,
        isScanned: false
      });

      const savedFile = await this.fileRepository.save(fileEntity);

      return {
        success: true,
        file: this.mapToFileMetadata(savedFile)
      };

    } catch (error) {
      throw new InternalServerErrorException(
        `ファイルアップロードに失敗しました: ${error.message}`
      );
    }
  }

  /**
   * ファイルをダウンロード
   */
  async downloadFile(fileId: string, userId: string): Promise<FileDownloadInfo> {
    const file = await this.fileRepository.findById(fileId);
    if (!file || file.isDeleted) {
      throw new NotFoundException('ファイルが見つかりません');
    }

    // スキャン結果チェック
    if (file.scanResult === FileScanResult.INFECTED) {
      throw new BadRequestException('このファイルは感染しているためダウンロードできません');
    }

    // ファイルの存在確認
    try {
      await fs.access(file.filePath);
    } catch {
      throw new NotFoundException('ファイルが見つかりません');
    }

    // ダウンロード回数を増加
    await this.fileRepository.incrementDownloadCount(fileId);

    // ファイルストリームを作成
    const stream = require('fs').createReadStream(file.filePath);

    return {
      stream,
      filename: file.originalFilename,
      mimeType: file.mimeType,
      size: file.size
    };
  }

  /**
   * ファイル情報を取得
   */
  async getFile(fileId: string): Promise<FileMetadata> {
    const file = await this.fileRepository.findById(fileId);
    if (!file || file.isDeleted) {
      throw new NotFoundException('ファイルが見つかりません');
    }

    return this.mapToFileMetadata(file);
  }

  /**
   * 問い合わせに関連するファイル一覧を取得
   */
  async getFilesByInquiry(inquiryId: string): Promise<FileMetadata[]> {
    const files = await this.fileRepository.findByInquiryId(inquiryId);
    return files.map(file => this.mapToFileMetadata(file));
  }

  /**
   * ファイルを検索
   */
  async searchFiles(
    criteria: FileSearchCriteria,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<FileMetadata>> {
    const result = await this.fileRepository.searchFiles(criteria, page, limit);
    
    return {
      ...result,
      items: result.items.map(file => this.mapToFileMetadata(file))
    };
  }

  /**
   * ファイルを更新
   */
  async updateFile(
    fileId: string,
    updates: { description?: string; expiresAt?: Date },
    updatedBy: string
  ): Promise<FileMetadata> {
    const file = await this.fileRepository.findById(fileId);
    if (!file || file.isDeleted) {
      throw new NotFoundException('ファイルが見つかりません');
    }

    // 更新
    Object.assign(file, updates);
    const updatedFile = await this.fileRepository.save(file);

    return this.mapToFileMetadata(updatedFile);
  }

  /**
   * ファイルを削除
   */
  async deleteFile(fileId: string, deletedBy: string): Promise<FileDeletionResult> {
    try {
      const file = await this.fileRepository.findById(fileId);
      if (!file || file.isDeleted) {
        throw new NotFoundException('ファイルが見つかりません');
      }

      // 論理削除
      await this.fileRepository.softDelete(fileId, deletedBy);

      // 物理ファイルの削除（オプション）
      try {
        await fs.unlink(file.filePath);
      } catch (error) {
        // ファイル削除エラーはログに記録するが、処理は継続
        console.warn(`物理ファイルの削除に失敗: ${file.filePath}`, error);
      }

      return {
        success: true,
        fileId
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      return {
        success: false,
        fileId,
        error: `ファイル削除に失敗しました: ${error.message}`
      };
    }
  }

  /**
   * ファイル統計情報を取得
   */
  async getFileStatistics(): Promise<FileStatistics> {
    return this.fileRepository.getFileStatistics();
  }

  /**
   * ストレージ使用量を取得
   */
  async getStorageUsage(): Promise<StorageUsage> {
    const stats = await this.fileRepository.getFileStatistics();
    const byApplication = await this.fileRepository.getStorageUsageByApp();

    // 利用可能容量の計算（設定から取得、デフォルトは100GB）
    const totalSize = this.configService.get<number>('STORAGE_TOTAL_SIZE', 100 * 1024 * 1024 * 1024);
    const usedSize = stats.totalSize;
    const availableSize = totalSize - usedSize;
    const usagePercentage = (usedSize / totalSize) * 100;

    return {
      usedSize,
      availableSize,
      totalSize,
      usagePercentage,
      byApplication
    };
  }

  /**
   * 期限切れファイルをクリーンアップ
   */
  async cleanupExpiredFiles(): Promise<FileCleanupResult> {
    const expiredFiles = await this.fileRepository.findExpiredFiles();
    let cleanedFileCount = 0;
    let freedSize = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const file of expiredFiles) {
      try {
        // 論理削除
        await this.fileRepository.softDelete(file.id, 'system');
        
        // 物理ファイル削除
        try {
          await fs.unlink(file.filePath);
          freedSize += file.size;
        } catch (fsError) {
          console.warn(`物理ファイル削除失敗: ${file.filePath}`, fsError);
        }

        cleanedFileCount++;
      } catch (error) {
        errorCount++;
        errors.push(`ファイル ${file.filename} の削除に失敗: ${error.message}`);
      }
    }

    return {
      cleanedFileCount,
      freedSize,
      errorCount,
      errors
    };
  }

  /**
   * ファイルバリデーション
   */
  private async validateFile(file: Express.Multer.File): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ファイルサイズチェック
    if (file.size > this.uploadConfig.maxFileSize) {
      errors.push(`ファイルサイズが上限（${this.formatFileSize(this.uploadConfig.maxFileSize)}）を超えています`);
    }

    // MIMEタイプチェック
    if (!this.uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`許可されていないファイル形式です: ${file.mimetype}`);
    }

    // ファイル拡張子チェック
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!this.uploadConfig.allowedExtensions.includes(fileExtension)) {
      errors.push(`許可されていないファイル拡張子です: ${fileExtension}`);
    }

    // ファイル名長チェック
    if (file.originalname.length > this.uploadConfig.maxFilenameLength) {
      errors.push(`ファイル名が長すぎます（最大${this.uploadConfig.maxFilenameLength}文字）`);
    }

    // 空ファイルチェック
    if (file.size === 0) {
      errors.push('空のファイルはアップロードできません');
    }

    // 警告: 大きなファイル
    if (file.size > this.uploadConfig.maxFileSize * 0.8) {
      warnings.push('ファイルサイズが大きいため、処理に時間がかかる場合があります');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * ファイルハッシュを計算
   */
  private async calculateFileHash(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * ユニークなファイル名を生成
   */
  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    return `${baseName}_${timestamp}_${random}${extension}`;
  }

  /**
   * ファイルを保存
   */
  private async saveFile(file: Express.Multer.File, fileHash: string): Promise<string> {
    // アップロードディレクトリの作成
    await fs.mkdir(this.uploadConfig.uploadDirectory, { recursive: true });

    // 年月でサブディレクトリを作成
    const now = new Date();
    const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const subDir = path.join(this.uploadConfig.uploadDirectory, yearMonth);
    await fs.mkdir(subDir, { recursive: true });

    // ファイルパスを生成
    const filename = `${fileHash}${path.extname(file.originalname)}`;
    const filePath = path.join(subDir, filename);

    // ファイルを保存
    await fs.writeFile(filePath, file.buffer);

    return filePath;
  }

  /**
   * FileエンティティをFileMetadataに変換
   */
  private mapToFileMetadata(file: File): FileMetadata {
    return {
      id: file.id,
      filename: file.filename,
      originalFilename: file.originalFilename,
      size: file.size,
      mimeType: file.mimeType,
      filePath: file.filePath,
      fileHash: file.fileHash,
      inquiryId: file.inquiryId,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
      isScanned: file.isScanned,
      scanResult: file.scanResult,
      scannedAt: file.scannedAt,
      description: file.description,
      downloadCount: file.downloadCount,
      lastDownloadedAt: file.lastDownloadedAt,
      expiresAt: file.expiresAt
    };
  }

  /**
   * ファイルサイズをフォーマット
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}