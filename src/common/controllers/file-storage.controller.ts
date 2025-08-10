import {
  Controller,
  Post,
  Get,
  UseGuards,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { FileStorageService } from '../services/file-storage.service';
import {
  StorageUsageDto,
  FileCleanupResultDto,
  FileArchiveResultDto,
  BackupResultDto,
  StorageReportDto
} from '../dto/file.dto';
import { BaseResponseDto } from '../dto/base-response.dto';

/**
 * ファイルストレージ管理コントローラー
 * ストレージ使用量監視、クリーンアップ、アーカイブ、バックアップ機能のAPIエンドポイント
 */
@ApiTags('file-storage')
@Controller('files/storage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  /**
   * ストレージ使用量監視
   */
  @Get('usage')
  @ApiOperation({ summary: 'ストレージ使用量取得' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ストレージ使用量取得成功',
    type: StorageUsageDto
  })
  @Permissions('file:admin')
  async getStorageUsage(): Promise<BaseResponseDto<StorageUsageDto>> {
    const usage = await this.fileStorageService.monitorStorageUsage();

    return {
      success: true,
      data: usage as StorageUsageDto
    };
  }

  /**
   * 手動クリーンアップ実行
   */
  @Post('cleanup')
  @ApiOperation({ summary: '手動クリーンアップ実行' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'クリーンアップ実行成功',
    type: FileCleanupResultDto
  })
  @Permissions('file:admin')
  async performCleanup(): Promise<BaseResponseDto<FileCleanupResultDto>> {
    const result = await this.fileStorageService.performAutomaticCleanup();

    return {
      success: true,
      data: result as FileCleanupResultDto,
      message: `${result.cleanedFileCount}個のファイルをクリーンアップしました`
    };
  }

  /**
   * ファイルアーカイブ実行
   */
  @Post('archive')
  @ApiOperation({ summary: 'ファイルアーカイブ実行' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'アーカイブ実行成功',
    type: FileArchiveResultDto
  })
  @Permissions('file:admin')
  async archiveFiles(): Promise<BaseResponseDto<FileArchiveResultDto>> {
    const result = await this.fileStorageService.archiveOldFiles();

    return {
      success: true,
      data: result as FileArchiveResultDto,
      message: `${result.archivedFileCount}個のファイルをアーカイブしました`
    };
  }

  /**
   * バックアップ作成
   */
  @Post('backup')
  @ApiOperation({ summary: 'バックアップ作成' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'バックアップ作成成功',
    type: BackupResultDto
  })
  @Permissions('file:admin')
  async createBackup(): Promise<BaseResponseDto<BackupResultDto>> {
    const result = await this.fileStorageService.createBackup();

    return {
      success: true,
      data: result as BackupResultDto,
      message: `${result.fileCount}個のファイルをバックアップしました`
    };
  }

  /**
   * ストレージレポート生成
   */
  @Get('report')
  @ApiOperation({ summary: 'ストレージレポート生成' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ストレージレポート生成成功',
    type: StorageReportDto
  })
  @Permissions('file:admin')
  async generateStorageReport(): Promise<BaseResponseDto<StorageReportDto>> {
    const report = await this.fileStorageService.generateStorageReport();

    return {
      success: true,
      data: report as StorageReportDto
    };
  }

  /**
   * ストレージ健全性チェック
   */
  @Get('health-check')
  @ApiOperation({ summary: 'ストレージ健全性チェック' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ストレージ健全性チェック結果'
  })
  @Permissions('file:admin')
  async performHealthCheck(): Promise<BaseResponseDto<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }>> {
    const usage = await this.fileStorageService.monitorStorageUsage();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 使用量チェック
    if (usage.usagePercentage > 95) {
      status = 'critical';
      issues.push('ストレージ使用量が95%を超えています');
      recommendations.push('緊急クリーンアップを実行してください');
    } else if (usage.usagePercentage > 80) {
      status = 'warning';
      issues.push('ストレージ使用量が80%を超えています');
      recommendations.push('定期クリーンアップを実行してください');
    }

    // 利用可能容量チェック
    if (usage.availableSize < 1024 * 1024 * 1024) { // 1GB未満
      status = 'critical';
      issues.push('利用可能容量が1GB未満です');
      recommendations.push('ストレージ容量を増やすか、大量のファイルを削除してください');
    }

    return {
      success: true,
      data: {
        status,
        issues,
        recommendations
      }
    };
  }

  /**
   * ストレージ最適化実行
   */
  @Post('optimize')
  @ApiOperation({ summary: 'ストレージ最適化実行' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ストレージ最適化実行成功'
  })
  @Permissions('file:admin')
  async optimizeStorage(): Promise<BaseResponseDto<{
    cleanupResult: FileCleanupResultDto;
    archiveResult: FileArchiveResultDto;
    totalFreedSize: number;
  }>> {
    // クリーンアップとアーカイブを順次実行
    const cleanupResult = await this.fileStorageService.performAutomaticCleanup();
    const archiveResult = await this.fileStorageService.archiveOldFiles();

    const totalFreedSize = cleanupResult.freedSize + archiveResult.archiveSize;

    return {
      success: true,
      data: {
        cleanupResult: cleanupResult as FileCleanupResultDto,
        archiveResult: archiveResult as FileArchiveResultDto,
        totalFreedSize
      },
      message: `ストレージ最適化完了: ${this.formatFileSize(totalFreedSize)}を解放しました`
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