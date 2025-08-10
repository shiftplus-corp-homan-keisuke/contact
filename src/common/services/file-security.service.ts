import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as path from 'path';
import { FileAccessLog } from '../entities/file-access-log.entity';
import { File } from '../entities/file.entity';
import { FileScanResult, FileAccessPermission } from '../types/file.types';

/**
 * ファイルセキュリティサービス
 * ウイルススキャン、アクセス制御、セキュリティログ機能を提供
 */
@Injectable()
export class FileSecurityService {
  private readonly logger = new Logger(FileSecurityService.name);
  private readonly dangerousExtensions: string[];
  private readonly suspiciousPatterns: RegExp[];

  constructor(
    @InjectRepository(FileAccessLog)
    private readonly fileAccessLogRepository: Repository<FileAccessLog>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly configService: ConfigService,
  ) {
    // 危険なファイル拡張子
    this.dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
      '.jar', '.app', '.deb', '.pkg', '.dmg', '.msi', '.run'
    ];

    // 疑わしいパターン
    this.suspiciousPatterns = [
      /virus/i,
      /malware/i,
      /trojan/i,
      /backdoor/i,
      /keylogger/i,
      /ransomware/i,
      /exploit/i,
      /payload/i
    ];
  }

  /**
   * ファイルのウイルススキャンを実行
   */
  async scanFile(fileId: string): Promise<FileScanResult> {
    try {
      const file = await this.fileRepository.findOne({ where: { id: fileId } });
      if (!file) {
        throw new Error('ファイルが見つかりません');
      }

      this.logger.log(`ファイルスキャン開始: ${file.filename}`);

      // 基本的なセキュリティチェック
      let scanResult = await this.performBasicSecurityCheck(file);

      // より詳細なスキャンが必要な場合
      if (scanResult === FileScanResult.PENDING) {
        scanResult = await this.performAdvancedScan(file);
      }

      // スキャン結果を更新
      await this.updateScanResult(fileId, scanResult);

      this.logger.log(`ファイルスキャン完了: ${file.filename}, 結果: ${scanResult}`);
      return scanResult;

    } catch (error) {
      this.logger.error(`ファイルスキャンエラー: ${error.message}`, error.stack);
      await this.updateScanResult(fileId, FileScanResult.SUSPICIOUS);
      return FileScanResult.SUSPICIOUS;
    }
  }

  /**
   * 基本的なセキュリティチェック
   */
  private async performBasicSecurityCheck(file: File): Promise<FileScanResult> {
    // ファイル拡張子チェック
    const extension = path.extname(file.originalFilename).toLowerCase();
    if (this.dangerousExtensions.includes(extension)) {
      this.logger.warn(`危険なファイル拡張子を検出: ${file.filename} (${extension})`);
      return FileScanResult.SUSPICIOUS;
    }

    // ファイル名パターンチェック
    const filename = file.originalFilename.toLowerCase();
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(filename)) {
        this.logger.warn(`疑わしいファイル名パターンを検出: ${file.filename}`);
        return FileScanResult.SUSPICIOUS;
      }
    }

    // ファイルサイズチェック（異常に大きいまたは小さい）
    const maxSize = this.configService.get<number>('FILE_MAX_SIZE', 10 * 1024 * 1024);
    if (file.size > maxSize) {
      this.logger.warn(`ファイルサイズが上限を超過: ${file.filename} (${file.size} bytes)`);
      return FileScanResult.SUSPICIOUS;
    }

    if (file.size === 0) {
      this.logger.warn(`空のファイルを検出: ${file.filename}`);
      return FileScanResult.SUSPICIOUS;
    }

    // MIMEタイプと拡張子の整合性チェック
    if (!this.validateMimeTypeExtension(file.mimeType, extension)) {
      this.logger.warn(`MIMEタイプと拡張子の不整合: ${file.filename} (${file.mimeType}, ${extension})`);
      return FileScanResult.SUSPICIOUS;
    }

    return FileScanResult.CLEAN;
  }

  /**
   * 高度なスキャン（実際の環境では外部のウイルススキャンAPIを使用）
   */
  private async performAdvancedScan(file: File): Promise<FileScanResult> {
    // 実際の実装では、ClamAV、VirusTotal API、Windows Defender APIなどを使用
    // ここではシミュレーション
    
    try {
      // ファイルハッシュベースの既知の脅威チェック
      const knownThreats = await this.checkKnownThreats(file.fileHash);
      if (knownThreats) {
        return FileScanResult.INFECTED;
      }

      // ファイル内容の簡易チェック（実際の環境ではより高度な分析）
      const contentAnalysis = await this.analyzeFileContent(file);
      if (contentAnalysis.isSuspicious) {
        return FileScanResult.SUSPICIOUS;
      }

      return FileScanResult.CLEAN;

    } catch (error) {
      this.logger.error(`高度なスキャンでエラー: ${error.message}`);
      return FileScanResult.SUSPICIOUS;
    }
  }

  /**
   * 既知の脅威ハッシュをチェック
   */
  private async checkKnownThreats(fileHash: string): Promise<boolean> {
    // 実際の実装では、脅威インテリジェンスデータベースと照合
    const knownMalwareHashes = [
      // 既知のマルウェアハッシュのリスト（例）
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // 空ファイル
    ];

    return knownMalwareHashes.includes(fileHash);
  }

  /**
   * ファイル内容の分析
   */
  private async analyzeFileContent(file: File): Promise<{ isSuspicious: boolean; reason?: string }> {
    // 実際の実装では、ファイル内容を読み取って分析
    // ここではファイルサイズとMIMEタイプベースの簡易チェック
    
    // PDFファイルの場合、JavaScriptが含まれているかチェック
    if (file.mimeType === 'application/pdf') {
      // 実際の実装では、PDFパーサーを使用してJavaScriptの存在をチェック
      // ここではシミュレーション
      return { isSuspicious: false };
    }

    // 実行可能ファイルの場合
    if (file.mimeType.includes('application/x-executable')) {
      return { isSuspicious: true, reason: '実行可能ファイルは許可されていません' };
    }

    return { isSuspicious: false };
  }

  /**
   * MIMEタイプと拡張子の整合性をチェック
   */
  private validateMimeTypeExtension(mimeType: string, extension: string): boolean {
    const mimeExtensionMap: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    };

    const expectedExtensions = mimeExtensionMap[mimeType];
    return expectedExtensions ? expectedExtensions.includes(extension) : false;
  }

  /**
   * スキャン結果を更新
   */
  private async updateScanResult(fileId: string, scanResult: FileScanResult): Promise<void> {
    await this.fileRepository.update(fileId, {
      scanResult,
      scannedAt: new Date(),
      isScanned: true,
    });
  }

  /**
   * ファイルアクセス権限をチェック
   */
  async checkFileAccess(
    fileId: string,
    userId: string,
    permission: FileAccessPermission
  ): Promise<boolean> {
    try {
      const file = await this.fileRepository.findOne({
        where: { id: fileId },
        relations: ['inquiry', 'inquiry.application']
      });

      if (!file || file.isDeleted) {
        return false;
      }

      // 感染したファイルへのアクセスは拒否
      if (file.scanResult === FileScanResult.INFECTED) {
        return false;
      }

      // ファイルの所有者は常にアクセス可能
      if (file.uploadedBy === userId) {
        return true;
      }

      // 管理者権限のチェック（実際の実装では権限サービスを使用）
      const hasAdminPermission = await this.checkAdminPermission(userId);
      if (hasAdminPermission) {
        return true;
      }

      // 問い合わせの担当者権限のチェック
      if (file.inquiry && file.inquiry.assignedTo === userId) {
        return permission !== FileAccessPermission.DELETE;
      }

      // その他の権限チェック（実際の実装では詳細な権限管理）
      return false;

    } catch (error) {
      this.logger.error(`ファイルアクセス権限チェックエラー: ${error.message}`);
      return false;
    }
  }

  /**
   * 管理者権限をチェック
   */
  private async checkAdminPermission(userId: string): Promise<boolean> {
    // 実際の実装では、ユーザーの役割をチェック
    // ここではシミュレーション
    return false;
  }

  /**
   * ファイルアクセスログを記録
   */
  async logFileAccess(
    fileId: string,
    userId: string,
    action: 'upload' | 'download' | 'view' | 'delete' | 'update',
    ipAddress?: string,
    userAgent?: string,
    success = true,
    error?: string
  ): Promise<void> {
    try {
      const accessLog = this.fileAccessLogRepository.create({
        fileId,
        userId,
        action,
        ipAddress,
        userAgent,
        success,
        error,
        accessedAt: new Date(),
      });

      await this.fileAccessLogRepository.save(accessLog);

      // 失敗したアクセスの場合は警告ログ
      if (!success) {
        this.logger.warn(
          `ファイルアクセス失敗: ユーザー=${userId}, ファイル=${fileId}, アクション=${action}, エラー=${error}`
        );
      }

    } catch (logError) {
      this.logger.error(`ファイルアクセスログ記録エラー: ${logError.message}`);
    }
  }

  /**
   * 疑わしいファイルアクセスパターンを検出
   */
  async detectSuspiciousActivity(userId: string, timeWindowMinutes = 60): Promise<{
    isSuspicious: boolean;
    reason?: string;
    details?: any;
  }> {
    try {
      const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

      // 短時間での大量ダウンロード
      const downloadCount = await this.fileAccessLogRepository.count({
        where: {
          userId,
          action: 'download',
          accessedAt: { $gte: timeWindow } as any,
          success: true,
        },
      });

      if (downloadCount > 50) {
        return {
          isSuspicious: true,
          reason: '短時間での大量ダウンロード',
          details: { downloadCount, timeWindowMinutes }
        };
      }

      // 連続したアクセス失敗
      const failedAttempts = await this.fileAccessLogRepository.count({
        where: {
          userId,
          accessedAt: { $gte: timeWindow } as any,
          success: false,
        },
      });

      if (failedAttempts > 10) {
        return {
          isSuspicious: true,
          reason: '連続したアクセス失敗',
          details: { failedAttempts, timeWindowMinutes }
        };
      }

      return { isSuspicious: false };

    } catch (error) {
      this.logger.error(`疑わしいアクティビティ検出エラー: ${error.message}`);
      return { isSuspicious: false };
    }
  }

  /**
   * ファイルアクセス統計を取得
   */
  async getFileAccessStatistics(fileId: string): Promise<{
    totalAccess: number;
    downloadCount: number;
    viewCount: number;
    lastAccessed: Date;
    topUsers: Array<{ userId: string; accessCount: number }>;
  }> {
    try {
      // 総アクセス数
      const totalAccess = await this.fileAccessLogRepository.count({
        where: { fileId, success: true }
      });

      // ダウンロード数
      const downloadCount = await this.fileAccessLogRepository.count({
        where: { fileId, action: 'download', success: true }
      });

      // 閲覧数
      const viewCount = await this.fileAccessLogRepository.count({
        where: { fileId, action: 'view', success: true }
      });

      // 最終アクセス日時
      const lastAccessLog = await this.fileAccessLogRepository.findOne({
        where: { fileId, success: true },
        order: { accessedAt: 'DESC' }
      });

      // トップユーザー
      const topUsersQuery = await this.fileAccessLogRepository
        .createQueryBuilder('log')
        .select(['log.userId as userId', 'COUNT(*) as accessCount'])
        .where('log.fileId = :fileId', { fileId })
        .andWhere('log.success = :success', { success: true })
        .groupBy('log.userId')
        .orderBy('COUNT(*)', 'DESC')
        .limit(5)
        .getRawMany();

      return {
        totalAccess,
        downloadCount,
        viewCount,
        lastAccessed: lastAccessLog?.accessedAt || null,
        topUsers: topUsersQuery.map(item => ({
          userId: item.userId,
          accessCount: parseInt(item.accessCount)
        }))
      };

    } catch (error) {
      this.logger.error(`ファイルアクセス統計取得エラー: ${error.message}`);
      return {
        totalAccess: 0,
        downloadCount: 0,
        viewCount: 0,
        lastAccessed: null,
        topUsers: []
      };
    }
  }

  /**
   * セキュリティレポートを生成
   */
  async generateSecurityReport(startDate: Date, endDate: Date): Promise<{
    totalScans: number;
    cleanFiles: number;
    infectedFiles: number;
    suspiciousFiles: number;
    topThreats: Array<{ threat: string; count: number }>;
    accessViolations: number;
    suspiciousUsers: Array<{ userId: string; violations: number }>;
  }> {
    try {
      // スキャン統計
      const scanStats = await this.fileRepository
        .createQueryBuilder('file')
        .select([
          'COUNT(*) as totalScans',
          'SUM(CASE WHEN scanResult = :clean THEN 1 ELSE 0 END) as cleanFiles',
          'SUM(CASE WHEN scanResult = :infected THEN 1 ELSE 0 END) as infectedFiles',
          'SUM(CASE WHEN scanResult = :suspicious THEN 1 ELSE 0 END) as suspiciousFiles'
        ])
        .where('scannedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .setParameters({
          clean: FileScanResult.CLEAN,
          infected: FileScanResult.INFECTED,
          suspicious: FileScanResult.SUSPICIOUS
        })
        .getRawOne();

      // アクセス違反統計
      const accessViolations = await this.fileAccessLogRepository.count({
        where: {
          accessedAt: { $gte: startDate, $lte: endDate } as any,
          success: false
        }
      });

      return {
        totalScans: parseInt(scanStats.totalScans) || 0,
        cleanFiles: parseInt(scanStats.cleanFiles) || 0,
        infectedFiles: parseInt(scanStats.infectedFiles) || 0,
        suspiciousFiles: parseInt(scanStats.suspiciousFiles) || 0,
        topThreats: [], // 実際の実装では脅威の種類別統計
        accessViolations,
        suspiciousUsers: [] // 実際の実装では疑わしいユーザーの統計
      };

    } catch (error) {
      this.logger.error(`セキュリティレポート生成エラー: ${error.message}`);
      throw error;
    }
  }
}