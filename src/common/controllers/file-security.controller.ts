import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  Req
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { FileSecurityService } from '../services/file-security.service';
import {
  FileScanResultDto,
  FileAccessStatsDto,
  SecurityReportDto,
  SuspiciousActivityDto,
  FileAccessLogDto
} from '../dto/file.dto';
import { BaseResponseDto } from '../dto/base-response.dto';
import { User } from '../../modules/users/entities/user.entity';

/**
 * ファイルセキュリティコントローラー
 * ファイルのセキュリティ機能のAPIエンドポイント
 */
@ApiTags('file-security')
@Controller('files/security')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FileSecurityController {
  constructor(private readonly fileSecurityService: FileSecurityService) {}

  /**
   * ファイルスキャン実行
   */
  @Post('scan/:fileId')
  @ApiOperation({ summary: 'ファイルスキャン実行' })
  @ApiParam({ name: 'fileId', description: 'ファイルID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'スキャン実行成功',
    type: FileScanResultDto
  })
  @RequirePermission('file', 'scan')
  async scanFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() user: User,
    @Req() req: Request
  ): Promise<BaseResponseDto<FileScanResultDto>> {
    // アクセスログ記録
    await this.fileSecurityService.logFileAccess(
      fileId,
      user.id,
      'view',
      req.ip,
      req.get('User-Agent')
    );

    const scanResult = await this.fileSecurityService.scanFile(fileId);

    return new BaseResponseDto({
      fileId,
      scanResult,
      scannedAt: new Date()
    } as FileScanResultDto, true, 'ファイルスキャンが完了しました');
  }

  /**
   * ファイルアクセス統計取得
   */
  @Get('access-stats/:fileId')
  @ApiOperation({ summary: 'ファイルアクセス統計取得' })
  @ApiParam({ name: 'fileId', description: 'ファイルID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'アクセス統計取得成功',
    type: FileAccessStatsDto
  })
  @RequirePermission('file', 'admin')
  async getFileAccessStatistics(
    @Param('fileId', ParseUUIDPipe) fileId: string
  ): Promise<BaseResponseDto<FileAccessStatsDto>> {
    const stats = await this.fileSecurityService.getFileAccessStatistics(fileId);

    return new BaseResponseDto(stats as FileAccessStatsDto);
  }

  /**
   * 疑わしいアクティビティ検出
   */
  @Get('suspicious-activity/:userId')
  @ApiOperation({ summary: '疑わしいアクティビティ検出' })
  @ApiParam({ name: 'userId', description: 'ユーザーID' })
  @ApiQuery({ name: 'timeWindow', required: false, description: '時間窓（分）', example: 60 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '疑わしいアクティビティ検出結果',
    type: SuspiciousActivityDto
  })
  @RequirePermission('file', 'admin')
  async detectSuspiciousActivity(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('timeWindow') timeWindow?: number
  ): Promise<BaseResponseDto<SuspiciousActivityDto>> {
    const result = await this.fileSecurityService.detectSuspiciousActivity(
      userId,
      timeWindow || 60
    );

    return new BaseResponseDto(result as SuspiciousActivityDto);
  }

  /**
   * セキュリティレポート生成
   */
  @Get('report')
  @ApiOperation({ summary: 'セキュリティレポート生成' })
  @ApiQuery({ name: 'startDate', description: '開始日', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', description: '終了日', example: '2024-01-31' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'セキュリティレポート生成成功',
    type: SecurityReportDto
  })
  @RequirePermission('file', 'admin')
  async generateSecurityReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<BaseResponseDto<SecurityReportDto>> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const report = await this.fileSecurityService.generateSecurityReport(start, end);

    return new BaseResponseDto(report as SecurityReportDto);
  }

  /**
   * ファイルアクセス権限チェック
   */
  @Get('check-access/:fileId')
  @ApiOperation({ summary: 'ファイルアクセス権限チェック' })
  @ApiParam({ name: 'fileId', description: 'ファイルID' })
  @ApiQuery({ 
    name: 'permission', 
    description: '権限種別',
    enum: ['read', 'write', 'delete', 'admin'],
    example: 'read'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'アクセス権限チェック結果'
  })
  @RequirePermission('file', 'read')
  async checkFileAccess(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Query('permission') permission: 'read' | 'write' | 'delete' | 'admin',
    @CurrentUser() user: User
  ): Promise<BaseResponseDto<{ hasAccess: boolean }>> {
    const hasAccess = await this.fileSecurityService.checkFileAccess(
      fileId,
      user.id,
      permission as any
    );

    return new BaseResponseDto({ hasAccess });
  }

  /**
   * ファイルアクセスログ取得
   */
  @Get('access-logs/:fileId')
  @ApiOperation({ summary: 'ファイルアクセスログ取得' })
  @ApiParam({ name: 'fileId', description: 'ファイルID' })
  @ApiQuery({ name: 'page', required: false, description: 'ページ番号', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '1ページあたりの件数', example: 20 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'アクセスログ取得成功',
    type: [FileAccessLogDto]
  })
  @RequirePermission('file', 'admin')
  async getFileAccessLogs(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ): Promise<BaseResponseDto<any>> {
    // 実際の実装では、FileAccessLogRepositoryを使用してログを取得
    // ここではプレースホルダー
    const logs = [];
    const total = 0;

    return new BaseResponseDto({
      items: logs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      hasNext: Number(page) * Number(limit) < total,
      hasPrev: Number(page) > 1
    });
  }

  /**
   * 一括ファイルスキャン
   */
  @Post('bulk-scan')
  @ApiOperation({ summary: '一括ファイルスキャン' })
  @ApiQuery({ name: 'scanPending', required: false, description: 'スキャン待ちファイルのみ', example: true })
  @ApiQuery({ name: 'limit', required: false, description: '処理件数上限', example: 100 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '一括スキャン実行成功'
  })
  @RequirePermission('file', 'admin')
  async bulkScanFiles(
    @Query('scanPending') scanPending = true,
    @Query('limit') limit = 100
  ): Promise<BaseResponseDto<{
    processedCount: number;
    cleanCount: number;
    infectedCount: number;
    suspiciousCount: number;
  }>> {
    // 実際の実装では、スキャン待ちファイルを取得して一括処理
    // ここではプレースホルダー
    const result = {
      processedCount: 0,
      cleanCount: 0,
      infectedCount: 0,
      suspiciousCount: 0
    };

    return new BaseResponseDto(result, true, `${result.processedCount}個のファイルをスキャンしました`);
  }
}