import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators';
import { FileSecurityService } from '../services/file-security.service';
import { FileScanDto } from '../dto';
import { FileScanResult } from '../types';

/**
 * ファイルセキュリティコントローラー
 * ウイルススキャン、セキュリティ機能を提供
 */
@ApiTags('File Security')
@ApiBearerAuth()
@Controller('files/security')
export class FileSecurityController {
    constructor(private readonly fileSecurityService: FileSecurityService) { }

    /**
     * ファイルの手動再スキャン
     */
    @Post('scan/:id')
    @ApiOperation({ summary: 'ファイルの手動再スキャン' })
    @ApiResponse({
        status: 200,
        description: 'スキャン実行成功',
        type: 'object'
    })
    async rescanFile(
        @Param('id', ParseUUIDPipe) fileId: string,
        @CurrentUser() user: any,
    ): Promise<{ success: boolean; data: FileScanResult }> {
        const scanResult = await this.fileSecurityService.rescanFile(fileId, user.id);

        return {
            success: true,
            data: scanResult,
        };
    }

    /**
     * 複数ファイルの一括スキャン
     */
    @Post('scan/batch')
    @ApiOperation({ summary: '複数ファイルの一括スキャン' })
    @ApiResponse({
        status: 200,
        description: '一括スキャン実行成功',
        type: 'object'
    })
    async batchScanFiles(
        @Body() scanDto: FileScanDto,
        @CurrentUser() user: any,
    ): Promise<{ success: boolean; data: FileScanResult[] }> {
        const scanResults: FileScanResult[] = [];

        for (const fileId of scanDto.fileIds) {
            try {
                const result = await this.fileSecurityService.rescanFile(fileId, user.id);
                scanResults.push(result);
            } catch (error) {
                scanResults.push({
                    fileId,
                    result: 'error',
                    details: error.message,
                    scannedAt: new Date(),
                });
            }
        }

        return {
            success: true,
            data: scanResults,
        };
    }

    /**
     * ファイルアクセス権限チェック
     */
    @Get('access/:id/:action')
    @ApiOperation({ summary: 'ファイルアクセス権限チェック' })
    @ApiResponse({
        status: 200,
        description: 'アクセス権限チェック成功',
        type: 'object'
    })
    async checkFileAccess(
        @Param('id', ParseUUIDPipe) fileId: string,
        @Param('action') action: 'read' | 'write' | 'delete',
        @CurrentUser() user: any,
    ): Promise<{ success: boolean; data: { hasAccess: boolean } }> {
        const hasAccess = await this.fileSecurityService.checkFileAccess(
            fileId,
            user.id,
            action
        );

        return {
            success: true,
            data: { hasAccess },
        };
    }

    /**
     * セキュリティ統計取得
     */
    @Get('statistics')
    @ApiOperation({ summary: 'セキュリティ統計取得' })
    @ApiResponse({
        status: 200,
        description: 'セキュリティ統計取得成功',
        type: 'object'
    })
    async getSecurityStatistics(): Promise<{
        success: boolean;
        data: {
            totalScanned: number;
            cleanFiles: number;
            infectedFiles: number;
            suspiciousFiles: number;
            errorFiles: number;
            quarantinedFiles: number;
        };
    }> {
        const statistics = await this.fileSecurityService.getSecurityStatistics();

        return {
            success: true,
            data: statistics,
        };
    }
}