import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as archiver from 'archiver';
import { FileRepository } from '../../../common/repositories/file.repository';
import { FileService } from './file.service';
import { 
  StorageUsage, 
  FileCleanupResult,
  FileStatistics
} from '../../../common/types/file.types';

/**
 * ファイルストレージ管理サービス
 * ストレージ使用量監視、自動クリーンアップ、バックアップ・アーカイブ機能を提供
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDirectory: string;
  private readonly archiveDirectory: string;
  private readonly backupDirectory: string;
  private readonly maxStorageSize: number;
  private readonly cleanupThresholdDays: number;
  private readonly archiveThresholdDays: number;

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly fileService: FileService,
    private readonly configService: ConfigService,
  ) {
    this.uploadDirectory = this.configService.get<string>('FILE_UPLOAD_DIR', './uploads');
    this.archiveDirectory = this.configService.get<string>('FILE_ARCHIVE_DIR', './archives');
    this.backupDirectory = this.configService.get<string>('FILE_BACKUP_DIR', './backups');
    this.maxStorageSize = this.configService.get<number>('STORAGE_MAX_SIZE', 100 * 1024 * 1024 * 1024); // 100GB
    this.cleanupThresholdDays = this.configService.get<number>('FILE_CLEANUP_THRESHOLD_DAYS', 365); // 1年
    this.archiveThresholdDays = this.configService.get<number>('FILE_ARCHIVE_THRESHOLD_DAYS', 180); // 6ヶ月
  }

  /**
   * ストレージ使用量を監視
   */
  async monitorStorageUsage(): Promise<StorageUsage> {
    try {
      this.logger.log('ストレージ使用量監視を開始');

      // データベースからファイル統計を取得
      const stats = await this.fileRepository.getFileStatistics();
      const byApplication = await this.fileRepository.getStorageUsageByApp();

      // 物理ストレージ使用量を計算
      const physicalUsage = await this.calculatePhysicalStorageUsage();

      const storageUsage: StorageUsage = {
        usedSize: stats.totalSize,
        availableSize: this.maxStorageSize - stats.totalSize,
        totalSize: this.maxStorageSize,
        usagePercentage: (stats.totalSize / this.maxStorageSize) * 100,
        byApplication
      };

      // 使用量が閾値を超えた場合の警告
      if (storageUsage.usagePercentage > 80) {
        this.logger.warn(
          `ストレージ使用量が80%を超えました: ${storageUsage.usagePercentage.toFixed(2)}%`
        );
      }

      if (storageUsage.usagePercentage > 95) {
        this.logger.error(
          `ストレージ使用量が95%を超えました: ${storageUsage.usagePercentage.toFixed(2)}%`
        );
        // 緊急クリーンアップを実行
        await this.emergencyCleanup();
      }

      this.logger.log(`ストレージ使用量監視完了: ${storageUsage.usagePercentage.toFixed(2)}%`);
      return storageUsage;

    } catch (error) {
      this.logger.error(`ストレージ使用量監視エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 物理ストレージ使用量を計算
   */
  private async calculatePhysicalStorageUsage(): Promise<{
    uploadDirSize: number;
    archiveDirSize: number;
    backupDirSize: number;
    totalPhysicalSize: number;
  }> {
    const uploadDirSize = await this.getDirectorySize(this.uploadDirectory);
    const archiveDirSize = await this.getDirectorySize(this.archiveDirectory);
    const backupDirSize = await this.getDirectorySize(this.backupDirectory);

    return {
      uploadDirSize,
      archiveDirSize,
      backupDirSize,
      totalPhysicalSize: uploadDirSize + archiveDirSize + backupDirSize
    };
  }

  /**
   * ディレクトリサイズを計算
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      await fs.access(dirPath);
      const files = await this.getAllFiles(dirPath);
      let totalSize = 0;

      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          totalSize += stats.size;
        } catch (error) {
          this.logger.warn(`ファイルサイズ取得エラー: ${file}`, error);
        }
      }

      return totalSize;
    } catch (error) {
      // ディレクトリが存在しない場合は0を返す
      return 0;
    }
  }

  /**
   * ディレクトリ内の全ファイルを再帰的に取得
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn(`ディレクトリ読み取りエラー: ${dirPath}`, error);
    }

    return files;
  }

  /**
   * 自動クリーンアップを実行
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performAutomaticCleanup(): Promise<FileCleanupResult> {
    this.logger.log('自動クリーンアップを開始');

    try {
      // 期限切れファイルのクリーンアップ
      const expiredCleanup = await this.fileService.cleanupExpiredFiles();

      // 古いファイルのクリーンアップ
      const oldFilesCleanup = await this.cleanupOldFiles();

      // 孤立ファイルのクリーンアップ
      const orphanedCleanup = await this.cleanupOrphanedFiles();

      const totalResult: FileCleanupResult = {
        cleanedFileCount: expiredCleanup.cleanedFileCount + oldFilesCleanup.cleanedFileCount + orphanedCleanup.cleanedFileCount,
        freedSize: expiredCleanup.freedSize + oldFilesCleanup.freedSize + orphanedCleanup.freedSize,
        errorCount: expiredCleanup.errorCount + oldFilesCleanup.errorCount + orphanedCleanup.errorCount,
        errors: [...expiredCleanup.errors, ...oldFilesCleanup.errors, ...orphanedCleanup.errors]
      };

      this.logger.log(
        `自動クリーンアップ完了: ${totalResult.cleanedFileCount}個のファイルを削除、${this.formatFileSize(totalResult.freedSize)}を解放`
      );

      return totalResult;

    } catch (error) {
      this.logger.error(`自動クリーンアップエラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 古いファイルをクリーンアップ
   */
  private async cleanupOldFiles(): Promise<FileCleanupResult> {
    const oldFiles = await this.fileRepository.findOldFiles(this.cleanupThresholdDays, 100);
    let cleanedFileCount = 0;
    let freedSize = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const file of oldFiles) {
      try {
        // 論理削除
        await this.fileRepository.softDelete(file.id, 'system');
        
        // 物理ファイル削除
        try {
          await fs.unlink(file.filePath);
          freedSize += file.size;
        } catch (fsError) {
          this.logger.warn(`物理ファイル削除失敗: ${file.filePath}`, fsError);
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
   * 孤立ファイル（データベースに記録がない物理ファイル）をクリーンアップ
   */
  private async cleanupOrphanedFiles(): Promise<FileCleanupResult> {
    let cleanedFileCount = 0;
    let freedSize = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      const physicalFiles = await this.getAllFiles(this.uploadDirectory);
      
      for (const physicalFile of physicalFiles) {
        try {
          // ファイルパスからデータベースレコードを検索
          const dbFile = await this.fileRepository.findOne({
            filePath: physicalFile
          } as any);

          if (!dbFile) {
            // データベースに記録がない孤立ファイル
            const stats = await fs.stat(physicalFile);
            await fs.unlink(physicalFile);
            
            cleanedFileCount++;
            freedSize += stats.size;
            
            this.logger.log(`孤立ファイルを削除: ${physicalFile}`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`孤立ファイル処理エラー ${physicalFile}: ${error.message}`);
        }
      }

    } catch (error) {
      this.logger.error(`孤立ファイルクリーンアップエラー: ${error.message}`);
      errorCount++;
      errors.push(`孤立ファイルクリーンアップエラー: ${error.message}`);
    }

    return {
      cleanedFileCount,
      freedSize,
      errorCount,
      errors
    };
  }

  /**
   * 緊急クリーンアップ（ストレージ使用量が95%を超えた場合）
   */
  private async emergencyCleanup(): Promise<void> {
    this.logger.warn('緊急クリーンアップを実行');

    // より積極的なクリーンアップ（30日以上古いファイル）
    const emergencyFiles = await this.fileRepository.findOldFiles(30, 200);
    
    for (const file of emergencyFiles) {
      try {
        await this.fileRepository.softDelete(file.id, 'system-emergency');
        
        try {
          await fs.unlink(file.filePath);
        } catch (fsError) {
          this.logger.warn(`緊急クリーンアップ - 物理ファイル削除失敗: ${file.filePath}`);
        }
      } catch (error) {
        this.logger.error(`緊急クリーンアップエラー: ${error.message}`);
      }
    }
  }

  /**
   * ファイルをアーカイブ
   */
  @Cron(CronExpression.EVERY_WEEK)
  async archiveOldFiles(): Promise<{
    archivedFileCount: number;
    archiveSize: number;
    archiveFilePath: string;
  }> {
    this.logger.log('古いファイルのアーカイブを開始');

    try {
      // アーカイブ対象のファイルを取得
      const filesToArchive = await this.fileRepository.findOldFiles(this.archiveThresholdDays, 1000);
      
      if (filesToArchive.length === 0) {
        this.logger.log('アーカイブ対象のファイルがありません');
        return {
          archivedFileCount: 0,
          archiveSize: 0,
          archiveFilePath: ''
        };
      }

      // アーカイブディレクトリを作成
      await fs.mkdir(this.archiveDirectory, { recursive: true });

      // アーカイブファイル名を生成
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveFileName = `archive_${timestamp}.zip`;
      const archiveFilePath = path.join(this.archiveDirectory, archiveFileName);

      // ZIPアーカイブを作成
      const archiveSize = await this.createZipArchive(filesToArchive, archiveFilePath);

      // アーカイブ後、元ファイルを削除
      for (const file of filesToArchive) {
        try {
          await this.fileRepository.softDelete(file.id, 'system-archive');
          await fs.unlink(file.filePath);
        } catch (error) {
          this.logger.warn(`アーカイブ後のファイル削除エラー: ${file.filePath}`, error);
        }
      }

      this.logger.log(
        `ファイルアーカイブ完了: ${filesToArchive.length}個のファイルを${archiveFileName}にアーカイブ`
      );

      return {
        archivedFileCount: filesToArchive.length,
        archiveSize,
        archiveFilePath
      };

    } catch (error) {
      this.logger.error(`ファイルアーカイブエラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ZIPアーカイブを作成
   */
  private async createZipArchive(files: any[], archiveFilePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(archiveFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      let totalSize = 0;

      output.on('close', () => {
        totalSize = archive.pointer();
        resolve(totalSize);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // ファイルをアーカイブに追加
      for (const file of files) {
        try {
          const relativePath = path.relative(this.uploadDirectory, file.filePath);
          archive.file(file.filePath, { name: relativePath });
        } catch (error) {
          this.logger.warn(`アーカイブ追加エラー: ${file.filePath}`, error);
        }
      }

      archive.finalize();
    });
  }

  /**
   * バックアップを作成
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async createBackup(): Promise<{
    backupFilePath: string;
    backupSize: number;
    fileCount: number;
  }> {
    this.logger.log('バックアップ作成を開始');

    try {
      // バックアップディレクトリを作成
      await fs.mkdir(this.backupDirectory, { recursive: true });

      // バックアップファイル名を生成
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const backupFileName = `backup_${timestamp}.zip`;
      const backupFilePath = path.join(this.backupDirectory, backupFileName);

      // 既存のバックアップファイルがある場合はスキップ
      try {
        await fs.access(backupFilePath);
        this.logger.log(`本日のバックアップは既に存在します: ${backupFileName}`);
        const stats = await fs.stat(backupFilePath);
        return {
          backupFilePath,
          backupSize: stats.size,
          fileCount: 0
        };
      } catch {
        // ファイルが存在しない場合は続行
      }

      // アクティブなファイルを取得
      const activeFiles = await this.fileRepository.find({
        where: { isDeleted: false },
        take: 10000 // 大量のファイルがある場合の制限
      });

      if (activeFiles.length === 0) {
        this.logger.log('バックアップ対象のファイルがありません');
        return {
          backupFilePath: '',
          backupSize: 0,
          fileCount: 0
        };
      }

      // バックアップアーカイブを作成
      const backupSize = await this.createZipArchive(activeFiles, backupFilePath);

      // 古いバックアップファイルを削除（30日以上古い）
      await this.cleanupOldBackups();

      this.logger.log(
        `バックアップ作成完了: ${activeFiles.length}個のファイルを${backupFileName}にバックアップ (${this.formatFileSize(backupSize)})`
      );

      return {
        backupFilePath,
        backupSize,
        fileCount: activeFiles.length
      };

    } catch (error) {
      this.logger.error(`バックアップ作成エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 古いバックアップファイルを削除
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupFiles = await fs.readdir(this.backupDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30日前

      for (const fileName of backupFiles) {
        if (fileName.startsWith('backup_') && fileName.endsWith('.zip')) {
          const filePath = path.join(this.backupDirectory, fileName);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            this.logger.log(`古いバックアップファイルを削除: ${fileName}`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`古いバックアップファイル削除エラー: ${error.message}`);
    }
  }

  /**
   * ストレージ統計レポートを生成
   */
  async generateStorageReport(): Promise<{
    storageUsage: StorageUsage;
    fileStatistics: FileStatistics;
    physicalUsage: any;
    recommendations: string[];
  }> {
    const storageUsage = await this.monitorStorageUsage();
    const fileStatistics = await this.fileRepository.getFileStatistics();
    const physicalUsage = await this.calculatePhysicalStorageUsage();

    // 推奨事項を生成
    const recommendations: string[] = [];
    
    if (storageUsage.usagePercentage > 80) {
      recommendations.push('ストレージ使用量が80%を超えています。古いファイルのクリーンアップを検討してください。');
    }
    
    if (physicalUsage.totalPhysicalSize > storageUsage.usedSize * 1.2) {
      recommendations.push('物理ストレージとデータベース記録に大きな差があります。孤立ファイルのクリーンアップを実行してください。');
    }
    
    if (fileStatistics.byMimeType.some(item => item.mimeType.includes('image') && item.totalSize > 100 * 1024 * 1024)) {
      recommendations.push('画像ファイルが大きな容量を占めています。画像圧縮やアーカイブを検討してください。');
    }

    return {
      storageUsage,
      fileStatistics,
      physicalUsage,
      recommendations
    };
  }

  /**
   * ファイルサイズをフォーマット
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}