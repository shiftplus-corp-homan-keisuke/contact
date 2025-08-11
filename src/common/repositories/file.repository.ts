import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { File } from '../entities/file.entity';
import { BaseRepository } from './base.repository';
import { FileSearchCriteria, FileScanResult, FileStatistics } from '../types/file.types';
import { PaginatedResult } from '../types';

/**
 * ファイルリポジトリ
 * ファイルエンティティのデータアクセス層
 */
@Injectable()
export class FileRepository extends BaseRepository<File> {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {
    super(fileRepository);
  }

  /**
   * 問い合わせIDでファイルを検索
   */
  async findByInquiryId(inquiryId: string, includeDeleted = false): Promise<File[]> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .where('file.inquiryId = :inquiryId', { inquiryId });

    if (!includeDeleted) {
      queryBuilder.andWhere('file.isDeleted = :isDeleted', { isDeleted: false });
    }

    return queryBuilder
      .orderBy('file.uploadedAt', 'DESC')
      .getMany();
  }

  /**
   * ファイルハッシュで重複チェック
   */
  async findByFileHash(fileHash: string): Promise<File | null> {
    return this.fileRepository.findOne({
      where: { 
        fileHash,
        isDeleted: false
      }
    });
  }

  /**
   * 条件に基づくファイル検索（ページネーション付き）
   */
  async searchFiles(
    criteria: FileSearchCriteria,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<File>> {
    const queryBuilder = this.buildSearchQuery(criteria);
    
    // ページネーション
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // 結果取得
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  /**
   * 検索クエリビルダーを構築
   */
  private buildSearchQuery(criteria: FileSearchCriteria): SelectQueryBuilder<File> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.inquiry', 'inquiry')
      .leftJoinAndSelect('file.uploader', 'uploader');

    // 削除されたファイルを含むかどうか
    if (!criteria.includeDeleted) {
      queryBuilder.where('file.isDeleted = :isDeleted', { isDeleted: false });
    }

    // 問い合わせID
    if (criteria.inquiryId) {
      queryBuilder.andWhere('file.inquiryId = :inquiryId', { 
        inquiryId: criteria.inquiryId 
      });
    }

    // アップロードユーザーID
    if (criteria.uploadedBy) {
      queryBuilder.andWhere('file.uploadedBy = :uploadedBy', { 
        uploadedBy: criteria.uploadedBy 
      });
    }

    // MIMEタイプ
    if (criteria.mimeType) {
      queryBuilder.andWhere('file.mimeType = :mimeType', { 
        mimeType: criteria.mimeType 
      });
    }

    // スキャン結果
    if (criteria.scanResult) {
      queryBuilder.andWhere('file.scanResult = :scanResult', { 
        scanResult: criteria.scanResult 
      });
    }

    // アップロード日時範囲
    if (criteria.uploadedAfter) {
      queryBuilder.andWhere('file.uploadedAt >= :uploadedAfter', { 
        uploadedAfter: criteria.uploadedAfter 
      });
    }

    if (criteria.uploadedBefore) {
      queryBuilder.andWhere('file.uploadedAt <= :uploadedBefore', { 
        uploadedBefore: criteria.uploadedBefore 
      });
    }

    // ファイル名（部分一致）
    if (criteria.filename) {
      queryBuilder.andWhere('file.filename ILIKE :filename', { 
        filename: `%${criteria.filename}%` 
      });
    }

    // ファイルサイズ範囲
    if (criteria.minSize !== undefined) {
      queryBuilder.andWhere('file.size >= :minSize', { 
        minSize: criteria.minSize 
      });
    }

    if (criteria.maxSize !== undefined) {
      queryBuilder.andWhere('file.size <= :maxSize', { 
        maxSize: criteria.maxSize 
      });
    }

    return queryBuilder.orderBy('file.uploadedAt', 'DESC');
  }

  /**
   * ファイル統計情報を取得
   */
  async getFileStatistics(): Promise<FileStatistics> {
    // 基本統計
    const basicStats = await this.fileRepository
      .createQueryBuilder('file')
      .select([
        'COUNT(file.id) as totalFiles',
        'SUM(file.size) as totalSize'
      ])
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    // アプリ別統計
    const byApplication = await this.fileRepository
      .createQueryBuilder('file')
      .leftJoin('file.inquiry', 'inquiry')
      .leftJoin('inquiry.application', 'app')
      .select([
        'app.id as appId',
        'app.name as appName',
        'COUNT(file.id) as fileCount',
        'SUM(file.size) as totalSize'
      ])
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('app.id, app.name')
      .getRawMany();

    // MIMEタイプ別統計
    const byMimeType = await this.fileRepository
      .createQueryBuilder('file')
      .select([
        'file.mimeType as mimeType',
        'COUNT(file.id) as fileCount',
        'SUM(file.size) as totalSize'
      ])
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('file.mimeType')
      .orderBy('COUNT(file.id)', 'DESC')
      .getRawMany();

    // スキャン結果別統計
    const byScanResult = await this.fileRepository
      .createQueryBuilder('file')
      .select([
        'file.scanResult as scanResult',
        'COUNT(file.id) as fileCount'
      ])
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('file.scanResult')
      .getRawMany();

    // 月別統計（過去12ヶ月）
    const byMonth = await this.fileRepository
      .createQueryBuilder('file')
      .select([
        "TO_CHAR(file.uploadedAt, 'YYYY-MM') as month",
        'COUNT(file.id) as fileCount',
        'SUM(file.size) as totalSize'
      ])
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('file.uploadedAt >= :startDate', { 
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) 
      })
      .groupBy("TO_CHAR(file.uploadedAt, 'YYYY-MM')")
      .orderBy("TO_CHAR(file.uploadedAt, 'YYYY-MM')", 'DESC')
      .getRawMany();

    return {
      totalFiles: parseInt(basicStats.totalFiles) || 0,
      totalSize: parseInt(basicStats.totalSize) || 0,
      byApplication: byApplication.map(item => ({
        appId: item.appId,
        appName: item.appName,
        fileCount: parseInt(item.fileCount),
        totalSize: parseInt(item.totalSize) || 0
      })),
      byMimeType: byMimeType.map(item => ({
        mimeType: item.mimeType,
        fileCount: parseInt(item.fileCount),
        totalSize: parseInt(item.totalSize) || 0
      })),
      byScanResult: byScanResult.map(item => ({
        scanResult: item.scanResult as FileScanResult,
        fileCount: parseInt(item.fileCount)
      })),
      byMonth: byMonth.map(item => ({
        month: item.month,
        fileCount: parseInt(item.fileCount),
        totalSize: parseInt(item.totalSize) || 0
      }))
    };
  }

  /**
   * 期限切れファイルを取得
   */
  async findExpiredFiles(): Promise<File[]> {
    return this.fileRepository
      .createQueryBuilder('file')
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('file.expiresAt IS NOT NULL')
      .andWhere('file.expiresAt < :now', { now: new Date() })
      .getMany();
  }

  /**
   * スキャン待ちファイルを取得
   */
  async findPendingScanFiles(limit = 10): Promise<File[]> {
    return this.fileRepository
      .createQueryBuilder('file')
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('file.scanResult = :scanResult', { scanResult: FileScanResult.PENDING })
      .orderBy('file.uploadedAt', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * ファイルのダウンロード回数を増加
   */
  async incrementDownloadCount(fileId: string): Promise<void> {
    await this.fileRepository
      .createQueryBuilder()
      .update(File)
      .set({ 
        downloadCount: () => 'downloadCount + 1',
        lastDownloadedAt: new Date()
      })
      .where('id = :fileId', { fileId })
      .execute();
  }

  /**
   * ファイルを論理削除
   */
  async softDelete(fileId: string, deletedBy: string): Promise<void> {
    await this.fileRepository
      .createQueryBuilder()
      .update(File)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy
      })
      .where('id = :fileId', { fileId })
      .execute();
  }

  /**
   * スキャン結果を更新
   */
  async updateScanResult(
    fileId: string, 
    scanResult: FileScanResult, 
    scannedAt = new Date()
  ): Promise<void> {
    await this.fileRepository
      .createQueryBuilder()
      .update(File)
      .set({
        scanResult,
        scannedAt,
        isScanned: true
      })
      .where('id = :fileId', { fileId })
      .execute();
  }

  /**
   * アプリ別ストレージ使用量を取得
   */
  async getStorageUsageByApp(): Promise<Array<{
    appId: string;
    appName: string;
    usedSize: number;
    fileCount: number;
  }>> {
    return this.fileRepository
      .createQueryBuilder('file')
      .leftJoin('file.inquiry', 'inquiry')
      .leftJoin('inquiry.application', 'app')
      .select([
        'app.id as appId',
        'app.name as appName',
        'SUM(file.size) as usedSize',
        'COUNT(file.id) as fileCount'
      ])
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('app.id, app.name')
      .orderBy('SUM(file.size)', 'DESC')
      .getRawMany()
      .then(results => results.map(item => ({
        appId: item.appId,
        appName: item.appName,
        usedSize: parseInt(item.usedSize) || 0,
        fileCount: parseInt(item.fileCount)
      })));
  }

  /**
   * 古いファイルを取得（クリーンアップ用）
   */
  async findOldFiles(daysOld: number, limit = 100): Promise<File[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.fileRepository
      .createQueryBuilder('file')
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('file.uploadedAt < :cutoffDate', { cutoffDate })
      .andWhere('file.lastDownloadedAt IS NULL OR file.lastDownloadedAt < :cutoffDate', { cutoffDate })
      .orderBy('file.uploadedAt', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * TypeORMのfindメソッドを公開
   */
  async find(options?: any): Promise<File[]> {
    return this.fileRepository.find(options);
  }

  /**
   * TypeORMのsaveメソッドを公開
   */
  async save(entity: File): Promise<File>;
  async save(entities: File[]): Promise<File[]>;
  async save(entity: File | File[]): Promise<File | File[]> {
    if (Array.isArray(entity)) {
      return this.fileRepository.save(entity);
    } else {
      return this.fileRepository.save(entity);
    }
  }
}