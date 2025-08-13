/**
 * APIキー管理コントローラー
 * 要件: 7.1, 7.4 (API認証とレート制限)
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiKeyService } from '../services/api-key.service';
import { RateLimitService } from '../services/rate-limit.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/permissions.decorator';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyResponseDto,
  ApiKeyListResponseDto,
  ApiKeyStatsDto,
  RateLimitStatsDto,
} from '../dto/api-key.dto';

@ApiTags('API Key Management')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post()
  @RequirePermissions({ resource: 'api_key', action: 'create' })
  @ApiOperation({ summary: 'APIキー生成' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'APIキーが正常に生成されました',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '入力データが無効です',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定されたアプリケーションが見つかりません',
  })
  async createApiKey(@Body() createApiKeyDto: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    return this.apiKeyService.generateApiKey(createApiKeyDto);
  }

  @Get('app/:appId')
  @RequirePermissions({ resource: 'api_key', action: 'read' })
  @ApiOperation({ summary: 'アプリ別APIキー一覧取得' })
  @ApiParam({ name: 'appId', description: 'アプリケーションID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'APIキー一覧を正常に取得しました',
    type: [ApiKeyListResponseDto],
  })
  async getApiKeysByApp(
    @Param('appId', ParseUUIDPipe) appId: string,
  ): Promise<ApiKeyListResponseDto[]> {
    const apiKeys = await this.apiKeyService.getApiKeysByApp(appId);
    
    return apiKeys.map(apiKey => ({
      id: apiKey.id,
      name: apiKey.name,
      appId: apiKey.appId,
      applicationName: apiKey.application?.name || 'Unknown',
      permissions: apiKey.permissions,
      rateLimitPerHour: apiKey.rateLimitPerHour,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
    }));
  }

  @Put(':id')
  @RequirePermissions({ resource: 'api_key', action: 'update' })
  @ApiOperation({ summary: 'APIキー更新' })
  @ApiParam({ name: 'id', description: 'APIキーID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'APIキーが正常に更新されました',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'APIキーが見つかりません',
  })
  async updateApiKey(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ): Promise<void> {
    await this.apiKeyService.updateApiKey(id, updateApiKeyDto);
  }

  @Delete(':id/revoke')
  @RequirePermissions({ resource: 'api_key', action: 'revoke' })
  @ApiOperation({ summary: 'APIキー無効化' })
  @ApiParam({ name: 'id', description: 'APIキーID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'APIキーが正常に無効化されました',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'APIキーが見つかりません',
  })
  async revokeApiKey(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.apiKeyService.revokeApiKey(id);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'api_key', action: 'delete' })
  @ApiOperation({ summary: 'APIキー削除' })
  @ApiParam({ name: 'id', description: 'APIキーID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'APIキーが正常に削除されました',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'APIキーが見つかりません',
  })
  async deleteApiKey(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.apiKeyService.deleteApiKey(id);
  }

  @Get(':id/stats')
  @RequirePermissions({ resource: 'api_key', action: 'read' })
  @ApiOperation({ summary: 'APIキー統計取得' })
  @ApiParam({ name: 'id', description: 'APIキーID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'APIキー統計を正常に取得しました',
    type: ApiKeyStatsDto,
  })
  async getApiKeyStats(@Param('id', ParseUUIDPipe) id: string): Promise<ApiKeyStatsDto> {
    return this.apiKeyService.getApiKeyStats(id);
  }

  @Get(':id/rate-limit-stats')
  @RequirePermissions({ resource: 'api_key', action: 'read' })
  @ApiOperation({ summary: 'レート制限統計取得' })
  @ApiParam({ name: 'id', description: 'APIキーID' })
  @ApiQuery({ name: 'days', description: '統計期間（日数）', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'レート制限統計を正常に取得しました',
    type: RateLimitStatsDto,
  })
  async getRateLimitStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
  ): Promise<RateLimitStatsDto> {
    return this.rateLimitService.getRateLimitStats(id, days);
  }

  @Post(':id/reset-rate-limit')
  @RequirePermissions({ resource: 'api_key', action: 'manage' })
  @ApiOperation({ summary: 'レート制限リセット（管理者用）' })
  @ApiParam({ name: 'id', description: 'APIキーID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'レート制限が正常にリセットされました',
  })
  async resetRateLimit(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rateLimitService.resetRateLimit(id);
  }

  @Post('cleanup-tracking')
  @RequirePermissions({ resource: 'system', action: 'admin' })
  @ApiOperation({ summary: '古い追跡レコードのクリーンアップ' })
  @ApiQuery({ name: 'days', description: '保持期間（日数）', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'クリーンアップが正常に完了しました',
  })
  async cleanupTrackingRecords(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
  ): Promise<{ deletedRecords: number }> {
    const deletedRecords = await this.rateLimitService.cleanupOldTrackingRecords(days);
    return { deletedRecords };
  }
}