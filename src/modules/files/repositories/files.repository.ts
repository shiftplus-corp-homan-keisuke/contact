import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Between, In } from 'typeorm';
import { File, FileAccessLog } from '../entities';
import { FileFilters, FileStatistics, FileAccessLogData } from '../types';

/**
 * ファイルリポジトリ
 * ファイルエンティティのデータアクセス層
 */
@Injectable()
export class FilesRepository {
    constructor(
        @InjectRepository(File)
        private readonly fileRepository: Repository<File>,
        @InjectRepository(FileAccessLog)
        private readonly accessLogRepository: Repository<FileAccessLog>,
    ) { }

    /**
     * ファイルを作成
     */
    async create(fileData: Partial<File>): Promise<File> {
        const file = this.fileRepository.create(fileData);
        return await this.fileRepository.save(file);
    }

    /**
     * IDでファイルを取得
     */
    async findById(id: string): Promise<File | null> {
        return await this.fileRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['inquiry', 'uploader'],
        });
    }

    /**
     * ファイルハッシュでファイルを検索
     */
    async findByHash(fileHash: string): Promise<File | null> {
        return await this.fileRepository.findOne({
            where: { fileHash, isDeleted: false },
        });
    }

    /**
     * 問い合わせIDでファイル一覧を取得
     */
    async findByInquiryId(inquiryId: string): Promise<File[]> {
        return await this.fileRepository.find({
            where: { inquiryId, isDeleted: false },
            relations: ['uploader'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * フィルター条件でファイルを検索
     */
    async findWithFilters(
        filters: FileFilters,
        page: number = 1,
        limit: number = 20
    ): Promise<{ files: File[]; total: number }> {
        const queryBuilder = this.createFilterQuery(filters);

        // ページネーション
        const offset = (page - 1) * limit;
        queryBuilder.skip(offset).take(limit);

        // 並び順
        queryBuilder.orderBy('file.createdAt', 'DESC');

        const [files, total] = await queryBuilder.getManyAndCount();

        return { files, total };
    }

    /**
     * ファイルを更新
     */
    async update(id: string, updates: Partial<File>): Promise<File | null> {
        await this.fileRepository.update(id, {
            ...updates,
            updatedAt: new Date(),
        });
        return await this.findById(id);
    }

    /**
     * ファイルを論理削除
     */
    async softDelete(id: string, deletedBy: string, reason?: string): Promise<boolean> {
        const updateData: any = {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
        };

        if (reason) {
            updateData.metadata = { deleteReason: reason };
        }

        const result = await this.fileRepository.update(id, updateData);
        return result.affected > 0;
    }

    /**
     * ファイルを物理削除
     */
    async hardDelete(id: string): Promise<boolean> {
        const result = await this.fileRepository.delete(id);
        return result.affected > 0;
    }

    /**
     * スキャン待ちファイルを取得
     */
    async findPendingScanFiles(limit: number = 10): Promise<File[]> {
        return await this.fileRepository.find({
            where: {
                scanResult: 'pending',
                isDeleted: false
            },
            order: { createdAt: 'ASC' },
            take: limit,
        });
    }

    /**
     * 期限切れファイルを取得
     */
    async findExpiredFiles(retentionDays: number): Promise<File[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        return await this.fileRepository.find({
            where: {
                createdAt: Between(new Date('1970-01-01'), cutoffDate),
                isDeleted: false,
            },
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * ストレージ使用量を計算
     */
    async calculateStorageUsage(appId?: string): Promise<{
        totalFiles: number;
        totalSize: number;
        sizeByType: Record<string, number>;
        filesByType: Record<string, number>;
    }> {
        const queryBuilder = this.fileRepository
            .createQueryBuilder('file')
            .leftJoin('file.inquiry', 'inquiry')
            .where('file.isDeleted = :isDeleted', { isDeleted: false });

        if (appId) {
            queryBuilder.andWhere('inquiry.appId = :appId', { appId });
        }

        // 総計を取得
        const totalResult = await queryBuilder
            .select([
                'COUNT(file.id) as totalFiles',
                'COALESCE(SUM(file.size), 0) as totalSize'
            ])
            .getRawOne();

        // タイプ別集計を取得
        const typeResults = await queryBuilder
            .select([
                'file.mimeType',
                'COUNT(file.id) as fileCount',
                'COALESCE(SUM(file.size), 0) as totalSize'
            ])
            .groupBy('file.mimeType')
            .getRawMany();

        const sizeByType: Record<string, number> = {};
        const filesByType: Record<string, number> = {};

        typeResults.forEach(result => {
            const mimeType = result.file_mimeType || 'unknown';
            sizeByType[mimeType] = parseInt(result.totalSize);
            filesByType[mimeType] = parseInt(result.fileCount);
        });

        return {
            totalFiles: parseInt(totalResult.totalFiles),
            totalSize: parseInt(totalResult.totalSize),
            sizeByType,
            filesByType,
        };
    }

    /**
     * ファイル統計を取得
     */
    async getFileStatistics(
        startDate?: Date,
        endDate?: Date,
        groupBy: 'day' | 'week' | 'month' = 'day'
    ): Promise<FileStatistics> {
        const queryBuilder = this.fileRepository
            .createQueryBuilder('file')
            .leftJoin('file.uploader', 'uploader')
            .where('file.isDeleted = :isDeleted', { isDeleted: false });

        if (startDate) {
            queryBuilder.andWhere('file.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            queryBuilder.andWhere('file.createdAt <= :endDate', { endDate });
        }

        // 基本統計
        const basicStats = await queryBuilder
            .select([
                'COUNT(file.id) as totalFiles',
                'COALESCE(SUM(file.size), 0) as totalSize'
            ])
            .getRawOne();

        // ステータス別統計
        const statusStats = await queryBuilder
            .select([
                'file.scanResult',
                'COUNT(file.id) as count'
            ])
            .groupBy('file.scanResult')
            .getRawMany();

        // タイプ別統計
        const typeStats = await queryBuilder
            .select([
                'file.mimeType',
                'COUNT(file.id) as count'
            ])
            .groupBy('file.mimeType')
            .getRawMany();

        // 日別アップロード統計
        const dateFormat = this.getDateFormat(groupBy);
        const uploadsByDay = await queryBuilder
            .select([
                `DATE_TRUNC('${groupBy}', file.createdAt) as date`,
                'COUNT(file.id) as count',
                'COALESCE(SUM(file.size), 0) as size'
            ])
            .groupBy(`DATE_TRUNC('${groupBy}', file.createdAt)`)
            .orderBy(`DATE_TRUNC('${groupBy}', file.createdAt)`, 'ASC')
            .getRawMany();

        // トップアップローダー
        const topUploaders = await queryBuilder
            .select([
                'uploader.id as userId',
                'uploader.name as userName',
                'COUNT(file.id) as fileCount',
                'COALESCE(SUM(file.size), 0) as totalSize'
            ])
            .groupBy('uploader.id, uploader.name')
            .orderBy('COUNT(file.id)', 'DESC')
            .limit(10)
            .getRawMany();

        // 結果の整形
        const filesByStatus: Record<string, number> = {};
        statusStats.forEach(stat => {
            filesByStatus[stat.file_scanResult] = parseInt(stat.count);
        });

        const filesByType: Record<string, number> = {};
        typeStats.forEach(stat => {
            filesByType[stat.file_mimeType || 'unknown'] = parseInt(stat.count);
        });

        return {
            totalFiles: parseInt(basicStats.totalFiles),
            totalSize: parseInt(basicStats.totalSize),
            filesByStatus,
            filesByType,
            uploadsByDay: uploadsByDay.map(item => ({
                date: item.date,
                count: parseInt(item.count),
                size: parseInt(item.size),
            })),
            topUploaders: topUploaders.map(item => ({
                userId: item.userId,
                userName: item.userName,
                fileCount: parseInt(item.fileCount),
                totalSize: parseInt(item.totalSize),
            })),
        };
    }

    /**
     * アクセスログを記録
     */
    async logAccess(logData: FileAccessLogData): Promise<FileAccessLog> {
        const log = this.accessLogRepository.create(logData);
        return await this.accessLogRepository.save(log);
    }

    /**
     * ファイルのアクセスログを取得
     */
    async getAccessLogs(
        fileId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ logs: FileAccessLog[]; total: number }> {
        const [logs, total] = await this.accessLogRepository.findAndCount({
            where: { fileId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { logs, total };
    }

    /**
     * フィルター用クエリビルダーを作成
     */
    private createFilterQuery(filters: FileFilters): SelectQueryBuilder<File> {
        const queryBuilder = this.fileRepository
            .createQueryBuilder('file')
            .leftJoinAndSelect('file.uploader', 'uploader')
            .leftJoinAndSelect('file.inquiry', 'inquiry');

        // 削除フラグ
        if (filters.isDeleted !== undefined) {
            queryBuilder.andWhere('file.isDeleted = :isDeleted', {
                isDeleted: filters.isDeleted
            });
        } else {
            queryBuilder.andWhere('file.isDeleted = :isDeleted', {
                isDeleted: false
            });
        }

        // 問い合わせID
        if (filters.inquiryId) {
            queryBuilder.andWhere('file.inquiryId = :inquiryId', {
                inquiryId: filters.inquiryId
            });
        }

        // アップロードユーザー
        if (filters.uploadedBy) {
            queryBuilder.andWhere('file.uploadedBy = :uploadedBy', {
                uploadedBy: filters.uploadedBy
            });
        }

        // MIMEタイプ
        if (filters.mimeType) {
            queryBuilder.andWhere('file.mimeType = :mimeType', {
                mimeType: filters.mimeType
            });
        }

        // スキャン結果
        if (filters.scanResult) {
            queryBuilder.andWhere('file.scanResult = :scanResult', {
                scanResult: filters.scanResult
            });
        }

        // 日付範囲
        if (filters.dateRange) {
            queryBuilder.andWhere('file.createdAt BETWEEN :startDate AND :endDate', {
                startDate: filters.dateRange.start,
                endDate: filters.dateRange.end,
            });
        }

        // サイズ範囲
        if (filters.sizeRange) {
            queryBuilder.andWhere('file.size BETWEEN :minSize AND :maxSize', {
                minSize: filters.sizeRange.min,
                maxSize: filters.sizeRange.max,
            });
        }

        return queryBuilder;
    }

    /**
     * グループ化用の日付フォーマットを取得
     */
    private getDateFormat(groupBy: 'day' | 'week' | 'month'): string {
        switch (groupBy) {
            case 'day':
                return 'YYYY-MM-DD';
            case 'week':
                return 'YYYY-"W"WW';
            case 'month':
                return 'YYYY-MM';
            default:
                return 'YYYY-MM-DD';
        }
    }
}