import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FilesRepository } from '../repositories';
import { StorageUsage, CleanupResult } from '../types';

/**
 * ファイルストレージ管理サービス
 * ストレージ使用量監視、自動クリーンアップ、バックアップ・アーカイブ機能を提供
 */
@Injectable()
export class FileStorageService {
    private readonly logger = new Logger(FileStorageService.name);
    private readonly uploadPath: string;
    private readonly archivePath: string;
    private readonly backupPath: string;
    private readonly maxStorageSize: number;
    private readonly cleanupEnabled: boolean;
    private readonly retentionDays: number;

    constructor(
        private readonly filesRepository: FilesRepository,
        private readonly configService: ConfigService,
    ) {
        this.uploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
        this.archivePath = this.configService.get<string>('ARCHIVE_PATH', './archive');
        this.backupPath = this.configService.get<string>('BACKUP_PATH', './backup');
        this.maxStorageSize = this.configService.get<number>('MAX_STORAGE_SIZE', 10 * 1024 * 1024 * 1024); // 10GB
        this.cleanupEnabled = this.configService.get<boolean>('AUTO_CLEANUP_ENABLED', true);
        this.retentionDays = this.configService.get<number>('FILE_RETENTION_DAYS', 90);

        this.ensureDirectories();
    }

    /**
     * ストレージ使用量を監視（毎日午前2時に実行）
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async monitorStorageUsage(): Promise<void> {
        this.logger.log('ストレージ使用量の監視を開始します');

        try {
            const usage = await this.calculateStorageUsage();

            this.logger.log(`現在のストレージ使用量: ${this.formatBytes(usage.totalSize)}`);

            // 使用量が上限を超えている場合の警告
            if (usage.totalSize > this.maxStorageSize) {
                this.logger.warn(
                    `ストレージ使用量が上限を超えています: ${this.formatBytes(usage.totalSize)} / ${this.formatBytes(this.maxStorageSize)}`
                );

                // 自動クリーンアップが有効な場合は実行
                if (this.cleanupEnabled) {
                    await this.performAutoCleanup();
                }
            }

            // 使用量が80%を超えている場合の警告
            const usagePercentage = (usage.totalSize / this.maxStorageSize) * 100;
            if (usagePercentage > 80) {
                this.logger.warn(`ストレージ使用量が80%を超えています: ${usagePercentage.toFixed(1)}%`);
            }

        } catch (error) {
            this.logger.error('ストレージ使用量の監視中にエラーが発生しました:', error);
        }
    }

    /**
     * 自動クリーンアップ（毎週日曜日午前3時に実行）
     */
    @Cron(CronExpression.EVERY_WEEK)
    async performAutoCleanup(): Promise<void> {
        if (!this.cleanupEnabled) {
            this.logger.log('自動クリーンアップが無効のため、スキップします');
            return;
        }

        this.logger.log('自動クリーンアップを開始します');

        try {
            const result = await this.cleanupExpiredFiles(this.retentionDays);

            this.logger.log(
                `自動クリーンアップが完了しました: ${result.deletedFiles}ファイル削除、${this.formatBytes(result.freedSpace)}の容量を解放`
            );

            if (result.errors.length > 0) {
                this.logger.warn(`クリーンアップ中に${result.errors.length}件のエラーが発生しました`);
                result.errors.forEach(error => this.logger.error(error));
            }

        } catch (error) {
            this.logger.error('自動クリーンアップ中にエラーが発生しました:', error);
        }
    }

    /**
     * ストレージ使用量を計算
     */
    async calculateStorageUsage(appId?: string): Promise<StorageUsage> {
        try {
            // データベースから統計を取得
            const dbUsage = await this.filesRepository.calculateStorageUsage(appId);

            // ファイルシステムの実際の使用量を計算
            const actualSize = await this.calculateDirectorySize(this.uploadPath);

            return {
                appId,
                totalFiles: dbUsage.totalFiles,
                totalSize: actualSize, // 実際のファイルサイズを使用
                sizeByType: dbUsage.sizeByType,
                filesByType: dbUsage.filesByType,
                lastUpdated: new Date(),
            };

        } catch (error) {
            this.logger.error('ストレージ使用量の計算中にエラーが発生しました:', error);
            throw error;
        }
    }

    /**
     * 期限切れファイルのクリーンアップ
     */
    async cleanupExpiredFiles(
        retentionDays: number = this.retentionDays,
        dryRun: boolean = false,
        targetScanResults?: Array<'pending' | 'clean' | 'infected' | 'suspicious' | 'error'>
    ): Promise<CleanupResult> {
        const result: CleanupResult = {
            deletedFiles: 0,
            freedSpace: 0,
            errors: [],
            processedAt: new Date(),
        };

        try {
            // 期限切れファイルを取得
            const expiredFiles = await this.filesRepository.findExpiredFiles(retentionDays);

            this.logger.log(`${expiredFiles.length}個の期限切れファイルが見つかりました`);

            for (const file of expiredFiles) {
                // スキャン結果でフィルタリング
                if (targetScanResults && !targetScanResults.includes(file.scanResult)) {
                    continue;
                }

                try {
                    if (!dryRun) {
                        // ファイルをアーカイブに移動
                        await this.archiveFile(file.id, file.filePath);

                        // データベースから物理削除
                        await this.filesRepository.hardDelete(file.id);
                    }

                    result.deletedFiles++;
                    result.freedSpace += file.size;

                } catch (error) {
                    const errorMessage = `ファイル ${file.id} の削除に失敗しました: ${error.message}`;
                    result.errors.push(errorMessage);
                    this.logger.error(errorMessage);
                }
            }

            if (dryRun) {
                this.logger.log(`ドライラン完了: ${result.deletedFiles}ファイル、${this.formatBytes(result.freedSpace)}が削除対象です`);
            } else {
                this.logger.log(`クリーンアップ完了: ${result.deletedFiles}ファイル削除、${this.formatBytes(result.freedSpace)}の容量を解放しました`);
            }

        } catch (error) {
            const errorMessage = `クリーンアップ処理中にエラーが発生しました: ${error.message}`;
            result.errors.push(errorMessage);
            this.logger.error(errorMessage);
        }

        return result;
    }

    /**
     * ファイルをアーカイブに移動
     */
    async archiveFile(fileId: string, filePath: string): Promise<string> {
        try {
            // アーカイブファイル名を生成（年月でディレクトリ分け）
            const now = new Date();
            const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const archiveDir = path.join(this.archivePath, yearMonth);

            // アーカイブディレクトリを作成
            await fs.mkdir(archiveDir, { recursive: true });

            const archiveFilePath = path.join(archiveDir, `${fileId}_${path.basename(filePath)}`);

            // ファイルを移動
            await fs.rename(filePath, archiveFilePath);

            this.logger.log(`ファイル ${fileId} をアーカイブしました: ${archiveFilePath}`);

            return archiveFilePath;

        } catch (error) {
            this.logger.error(`ファイル ${fileId} のアーカイブに失敗しました:`, error);
            throw error;
        }
    }

    /**
     * ファイルのバックアップを作成
     */
    async backupFile(fileId: string, filePath: string): Promise<string> {
        try {
            // バックアップファイル名を生成
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-');
            const backupFilePath = path.join(
                this.backupPath,
                `${fileId}_${timestamp}_${path.basename(filePath)}`
            );

            // ファイルをコピー
            await fs.copyFile(filePath, backupFilePath);

            this.logger.log(`ファイル ${fileId} をバックアップしました: ${backupFilePath}`);

            return backupFilePath;

        } catch (error) {
            this.logger.error(`ファイル ${fileId} のバックアップに失敗しました:`, error);
            throw error;
        }
    }

    /**
     * ディレクトリサイズを計算
     */
    private async calculateDirectorySize(dirPath: string): Promise<number> {
        let totalSize = 0;

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    totalSize += await this.calculateDirectorySize(fullPath);
                } else if (entry.isFile()) {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                }
            }

        } catch (error) {
            // ディレクトリが存在しない場合は0を返す
            if (error.code !== 'ENOENT') {
                this.logger.error(`ディレクトリサイズの計算中にエラーが発生しました: ${dirPath}`, error);
            }
        }

        return totalSize;
    }

    /**
     * 必要なディレクトリを作成
     */
    private async ensureDirectories(): Promise<void> {
        const directories = [this.uploadPath, this.archivePath, this.backupPath];

        for (const dir of directories) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                this.logger.log(`ディレクトリを作成しました: ${dir}`);
            }
        }
    }

    /**
     * バイト数を人間が読みやすい形式に変換
     */
    private formatBytes(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
    }

    /**
     * ストレージ健全性チェック
     */
    async performHealthCheck(): Promise<{
        status: 'healthy' | 'warning' | 'critical';
        usage: StorageUsage;
        issues: string[];
        recommendations: string[];
    }> {
        const issues: string[] = [];
        const recommendations: string[] = [];

        try {
            const usage = await this.calculateStorageUsage();
            const usagePercentage = (usage.totalSize / this.maxStorageSize) * 100;

            let status: 'healthy' | 'warning' | 'critical' = 'healthy';

            // 使用量チェック
            if (usagePercentage > 95) {
                status = 'critical';
                issues.push(`ストレージ使用量が95%を超えています (${usagePercentage.toFixed(1)}%)`);
                recommendations.push('緊急にファイルのクリーンアップを実行してください');
            } else if (usagePercentage > 80) {
                status = 'warning';
                issues.push(`ストレージ使用量が80%を超えています (${usagePercentage.toFixed(1)}%)`);
                recommendations.push('ファイルのクリーンアップを検討してください');
            }

            // ディレクトリアクセスチェック
            const directories = [this.uploadPath, this.archivePath, this.backupPath];
            for (const dir of directories) {
                try {
                    await fs.access(dir, fs.constants.R_OK | fs.constants.W_OK);
                } catch {
                    status = 'critical';
                    issues.push(`ディレクトリにアクセスできません: ${dir}`);
                    recommendations.push(`ディレクトリの権限を確認してください: ${dir}`);
                }
            }

            return {
                status,
                usage,
                issues,
                recommendations,
            };

        } catch (error) {
            return {
                status: 'critical',
                usage: {
                    totalFiles: 0,
                    totalSize: 0,
                    sizeByType: {},
                    filesByType: {},
                    lastUpdated: new Date(),
                },
                issues: [`健全性チェック中にエラーが発生しました: ${error.message}`],
                recommendations: ['システム管理者に連絡してください'],
            };
        }
    }

    /**
     * 重複ファイルを検出
     */
    async findDuplicateFiles(): Promise<Array<{
        hash: string;
        files: Array<{ id: string; filePath: string; size: number }>;
        totalSize: number;
        potentialSavings: number;
    }>> {
        // この機能は FilesRepository に重複検出メソッドを追加する必要があります
        // ここでは基本的な構造のみ示します
        return [];
    }
}