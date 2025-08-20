import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FileStorageService } from '../services/file-storage.service';
import {
    StorageUsageDto,
    FileCleanupDto,
} from '../dto';
import { StorageUsage, CleanupResult } from '../types';

/**
 * ファイルストレージ管理コントローラー
 * ストレージ使用量監視、クリーンアップ、バックアップ機能を提供
 */
@ApiTags('File Storage')
@ApiBearerAuth()
@Controller('files/storage')
export class FileStorageController {
    constructor(private readonly fileStorageService: FileStorageService) { }

    /**
     * ストレージ使用量取得
     */
    @Get('usage')
    @ApiOperation({ summary: 'ストレージ使用量取得' })
    @ApiResponse({
        status: 200,
        description: 'ストレージ使用量取得成功',
        type: 'object'
    })
    async getStorageUsage(
        @Query() usageDto: StorageUsageDto,
    ): Promise<{ success: boolean; data: StorageUsage }> {
        const usage = await this.fileStorageService.calculateStorageUsage(usageDto.appId);

        return {
            success: true,
            data: usage,
        };
    }

    /**
     * ファイルクリーンアップ実行
     */
    @Post('cleanup')
    @ApiOperation({ summary: 'ファイルクリーンアップ実行' })
    @ApiResponse({
        status: 200,
        description: 'クリーンアップ実行成功',
        type: 'object'
    })
    async cleanupFiles(
        @Body() cleanupDto: FileCleanupDto,
    ): Promise<{ success: boolean; data: CleanupResult }> {
        const result = await this.fileStorageService.cleanupExpiredFiles(
            cleanupDto.retentionDays,
            cleanupDto.dryRun,
            cleanupDto.targetScanResults
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * ストレージ健全性チェック
     */
    @Get('health')
    @ApiOperation({ summary: 'ストレージ健全性チェック' })
    @ApiResponse({
        status: 200,
        description: '健全性チェック成功',
        type: 'object'
    })
    async performHealthCheck(): Promise<{
        success: boolean;
        data: {
            status: 'healthy' | 'warning' | 'critical';
            usage: StorageUsage;
            issues: string[];
            recommendations: string[];
        };
    }> {
        const healthCheck = await this.fileStorageService.performHealthCheck();

        return {
            success: true,
            data: healthCheck,
        };
    }

    /**
     * 重複ファイル検出
     */
    @Get('duplicates')
    @ApiOperation({ summary: '重複ファイル検出' })
    @ApiResponse({
        status: 200,
        description: '重複ファイル検出成功',
        type: 'object'
    })
    async findDuplicateFiles(): Promise<{
        success: boolean;
        data: Array<{
            hash: string;
            files: Array<{ id: string; filePath: string; size: number }>;
            totalSize: number;
            potentialSavings: number;
        }>;
    }> {
        const duplicates = await this.fileStorageService.findDuplicateFiles();

        return {
            success: true,
            data: duplicates,
        };
    }

    /**
     * 手動ストレージ監視実行
     */
    @Post('monitor')
    @ApiOperation({ summary: '手動ストレージ監視実行' })
    @ApiResponse({
        status: 200,
        description: 'ストレージ監視実行成功',
        type: 'object'
    })
    async monitorStorage(): Promise<{ success: boolean; message: string }> {
        await this.fileStorageService.monitorStorageUsage();

        return {
            success: true,
            message: 'ストレージ監視が実行されました',
        };
    }

    /**
     * 手動自動クリーンアップ実行
     */
    @Post('auto-cleanup')
    @ApiOperation({ summary: '手動自動クリーンアップ実行' })
    @ApiResponse({
        status: 200,
        description: '自動クリーンアップ実行成功',
        type: 'object'
    })
    async performAutoCleanup(): Promise<{ success: boolean; message: string }> {
        await this.fileStorageService.performAutoCleanup();

        return {
            success: true,
            message: '自動クリーンアップが実行されました',
        };
    }
}