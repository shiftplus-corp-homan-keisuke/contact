/**
 * セキュリティ監視コントローラー
 * 要件: 4.4 (認証試行ログとセキュリティ監視機能)
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SecurityMonitoringService, SecurityAlert } from '../services/security-monitoring.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/permissions.decorator';

@ApiTags('Security Monitoring')
@Controller('security')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SecurityMonitoringController {
  constructor(
    private readonly securityMonitoringService: SecurityMonitoringService,
  ) {}

  @Get('auth-attempts/stats')
  @RequirePermissions({ resource: 'security', action: 'read' })
  @ApiOperation({ summary: '認証試行統計取得' })
  @ApiQuery({ name: 'days', description: '統計期間（日数）', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '認証試行統計を正常に取得しました',
  })
  async getAuthAttemptStats(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
  ) {
    return this.securityMonitoringService.getAuthAttemptStats(days);
  }

  @Get('ip-addresses/stats')
  @RequirePermissions({ resource: 'security', action: 'read' })
  @ApiOperation({ summary: 'IPアドレス別認証試行統計取得' })
  @ApiQuery({ name: 'days', description: '統計期間（日数）', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'IPアドレス別統計を正常に取得しました',
  })
  async getIPAddressStats(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
  ) {
    return this.securityMonitoringService.getIPAddressStats(days);
  }

  @Get('alerts')
  @RequirePermissions({ resource: 'security', action: 'read' })
  @ApiOperation({ summary: 'セキュリティアラート取得' })
  @ApiQuery({ name: 'email', description: '対象メールアドレス', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'セキュリティアラートを正常に取得しました',
    type: [Object],
  })
  async getSecurityAlerts(
    @Query('email') email?: string,
  ): Promise<SecurityAlert[]> {
    return this.securityMonitoringService.detectSuspiciousActivity(undefined, email);
  }

  @Get('cleanup-auth-attempts')
  @RequirePermissions({ resource: 'system', action: 'admin' })
  @ApiOperation({ summary: '古い認証試行ログのクリーンアップ' })
  @ApiQuery({ name: 'days', description: '保持期間（日数）', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'クリーンアップが正常に完了しました',
  })
  async cleanupAuthAttempts(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 90,
  ): Promise<{ deletedRecords: number }> {
    const deletedRecords = await this.securityMonitoringService.cleanupOldAuthAttempts(days);
    return { deletedRecords };
  }
}