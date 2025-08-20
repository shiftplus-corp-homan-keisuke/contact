import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { FilesRepository } from '../repositories';
import { FileValidator } from '../validators';
import {
    FileUploadRequest,
    FileMetadata,
    FileData,
    FileFilters,
    FileStatistics,
    FileAccessLogData
} from '../types';

/**
 * ファイル管理サービス
 * ファイルのアップロード、ダウンロード、メタデータ管理を行う
 */
@Injectable()
export class FilesService {
    private readonly uploadPath: string;

    constructor(
        private readonly filesRepository: FilesRepository,
        private readonly fileValidator: FileValidator,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.uploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
        this.ensureUploadDirectory();
    }

    /**
     * ファイルをアップロード
     */
    async uploadFile(uploadRequest: FileUploadRequest): Promise<FileMetadata> {
        // バリデーション
        const validation = this.fileValidator.validateFile(
            uploadRequest.originalName,
            uploadRequest.mimeType,
            uploadRequest.size,
            uploadRequest.buffer
        );

        if (!validation.isValid) {
            throw new BadRequestException({
                message: 'ファイルバリデーションエラー',
                errors: validation.errors,
            });
        }

        // ファイルハッシュを計算
        const fileHash = this.calculateFileHash(uploadRequest.buffer);

        // 重複チェック
        const existingFile = await this.filesRepository.findByHash(fileHash);
        if (existingFile) {
            // 既存ファイルのメタデータを返す（重複アップロード防止）
            await this.logFileAccess({
                fileId: existingFile.id,
                userId: uploadRequest.uploadedBy,
                action: 'upload',
                success: true,
                metadata: { duplicate: true },
            });

            return this.mapToFileMetadata(existingFile);
        }

        // ファイル名を正規化
        const normalizedFilename = this.fileValidator.normalizeFilename(uploadRequest.originalName);
        const uniqueFilename = await this.generateUniqueFilename(normalizedFilename);
        const filePath = path.join(this.uploadPath, uniqueFilename);

        try {
            // ファイルを保存
            await fs.writeFile(filePath, uploadRequest.buffer);

            // データベースに記録
            const fileEntity = await this.filesRepository.create({
                filename: uniqueFilename,
                originalName: uploadRequest.originalName,
                filePath: filePath,
                mimeType: uploadRequest.mimeType,
                size: uploadRequest.size,
                fileHash,
                inquiryId: uploadRequest.inquiryId,
                uploadedBy: uploadRequest.uploadedBy,
                metadata: uploadRequest.metadata,
                scanResult: 'pending',
            });

            // アクセスログを記録
            await this.logFileAccess({
                fileId: fileEntity.id,
                userId: uploadRequest.uploadedBy,
                action: 'upload',
                success: true,
            });

            // イベントを発行（ウイルススキャン用）
            this.eventEmitter.emit('file.uploaded', {
                fileId: fileEntity.id,
                filePath: filePath,
                mimeType: uploadRequest.mimeType,
            });

            return this.mapToFileMetadata(fileEntity);

        } catch (error) {
            // ファイル保存に失敗した場合、作成されたファイルを削除
            try {
                await fs.unlink(filePath);
            } catch (unlinkError) {
                // ファイル削除エラーは無視
            }

            // アクセスログを記録
            await this.logFileAccess({
                fileId: null,
                userId: uploadRequest.uploadedBy,
                action: 'upload',
                success: false,
                failureReason: error.message,
            });

            throw new BadRequestException('ファイルの保存に失敗しました');
        }
    }

    /**
     * ファイルをダウンロード
     */
    async downloadFile(fileId: string, userId?: string): Promise<FileData> {
        const file = await this.filesRepository.findById(fileId);
        if (!file) {
            throw new NotFoundException('ファイルが見つかりません');
        }

        if (file.scanResult === 'infected') {
            throw new ForbiddenException('感染ファイルのダウンロードは禁止されています');
        }

        try {
            const buffer = await fs.readFile(file.filePath);

            // アクセスログを記録
            await this.logFileAccess({
                fileId: file.id,
                userId,
                action: 'download',
                success: true,
            });

            return {
                metadata: this.mapToFileMetadata(file),
                buffer,
            };

        } catch (error) {
            // アクセスログを記録
            await this.logFileAccess({
                fileId: file.id,
                userId,
                action: 'download',
                success: false,
                failureReason: error.message,
            });

            throw new NotFoundException('ファイルの読み込みに失敗しました');
        }
    }

    /**
     * ファイルメタデータを取得
     */
    async getFileMetadata(fileId: string, userId?: string): Promise<FileMetadata> {
        const file = await this.filesRepository.findById(fileId);
        if (!file) {
            throw new NotFoundException('ファイルが見つかりません');
        }

        // アクセスログを記録
        await this.logFileAccess({
            fileId: file.id,
            userId,
            action: 'view',
            success: true,
        });

        return this.mapToFileMetadata(file);
    }

    /**
     * 問い合わせに関連するファイル一覧を取得
     */
    async getFilesByInquiry(inquiryId: string, userId?: string): Promise<FileMetadata[]> {
        const files = await this.filesRepository.findByInquiryId(inquiryId);

        // アクセスログを記録（バッチ処理）
        if (userId && files.length > 0) {
            const logPromises = files.map(file =>
                this.logFileAccess({
                    fileId: file.id,
                    userId,
                    action: 'view',
                    success: true,
                    metadata: { batchView: true },
                })
            );
            await Promise.all(logPromises);
        }

        return files.map(file => this.mapToFileMetadata(file));
    }

    /**
     * ファイルを検索
     */
    async searchFiles(
        filters: FileFilters,
        page: number = 1,
        limit: number = 20,
        userId?: string
    ): Promise<{ files: FileMetadata[]; total: number; page: number; limit: number }> {
        const { files, total } = await this.filesRepository.findWithFilters(filters, page, limit);

        return {
            files: files.map(file => this.mapToFileMetadata(file)),
            total,
            page,
            limit,
        };
    }

    /**
     * ファイルを削除
     */
    async deleteFile(fileId: string, userId: string, reason?: string): Promise<void> {
        const file = await this.filesRepository.findById(fileId);
        if (!file) {
            throw new NotFoundException('ファイルが見つかりません');
        }

        try {
            // 論理削除
            await this.filesRepository.softDelete(fileId, userId, reason);

            // アクセスログを記録
            await this.logFileAccess({
                fileId: file.id,
                userId,
                action: 'delete',
                success: true,
                metadata: { reason },
            });

            // イベントを発行
            this.eventEmitter.emit('file.deleted', {
                fileId: file.id,
                filePath: file.filePath,
                deletedBy: userId,
                reason,
            });

        } catch (error) {
            // アクセスログを記録
            await this.logFileAccess({
                fileId: file.id,
                userId,
                action: 'delete',
                success: false,
                failureReason: error.message,
            });

            throw new BadRequestException('ファイルの削除に失敗しました');
        }
    }

    /**
     * ファイル統計を取得
     */
    async getFileStatistics(
        startDate?: Date,
        endDate?: Date,
        groupBy: 'day' | 'week' | 'month' = 'day'
    ): Promise<FileStatistics> {
        return await this.filesRepository.getFileStatistics(startDate, endDate, groupBy);
    }

    /**
     * ファイルハッシュを計算
     */
    private calculateFileHash(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * 一意なファイル名を生成
     */
    private async generateUniqueFilename(originalFilename: string): Promise<string> {
        const extension = path.extname(originalFilename);
        const basename = path.basename(originalFilename, extension);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);

        return `${basename}_${timestamp}_${random}${extension}`;
    }

    /**
     * アップロードディレクトリの存在確認・作成
     */
    private async ensureUploadDirectory(): Promise<void> {
        try {
            await fs.access(this.uploadPath);
        } catch {
            await fs.mkdir(this.uploadPath, { recursive: true });
        }
    }

    /**
     * ファイルアクセスログを記録
     */
    private async logFileAccess(logData: FileAccessLogData): Promise<void> {
        try {
            await this.filesRepository.logAccess(logData);
        } catch (error) {
            // ログ記録エラーは無視（メイン処理に影響させない）
            console.error('Failed to log file access:', error);
        }
    }

    /**
     * エンティティをメタデータに変換
     */
    private mapToFileMetadata(file: any): FileMetadata {
        return {
            id: file.id,
            filename: file.filename,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            fileHash: file.fileHash,
            inquiryId: file.inquiryId,
            uploadedBy: file.uploadedBy,
            isScanned: file.isScanned,
            scanResult: file.scanResult,
            scanDetails: file.scanDetails,
            scannedAt: file.scannedAt,
            isDeleted: file.isDeleted,
            deletedAt: file.deletedAt,
            deletedBy: file.deletedBy,
            metadata: file.metadata,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        };
    }
}