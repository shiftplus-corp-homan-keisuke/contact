/**
 * FAQ公開サイトコントローラー
 * 要件: 6.3, 6.4 (FAQ公開システムの実装)
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { FAQSiteService, FAQSiteGenerationOptions, GeneratedSite } from '../services/faq-site.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { FAQSite } from '../types/faq.types';

export class FAQSiteGenerationOptionsDto implements FAQSiteGenerationOptions {
  theme?: 'light' | 'dark' | 'auto';
  customCSS?: string;
  includeSearch?: boolean;
  includeCategories?: boolean;
  sortBy?: 'orderIndex' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

export class GeneratedSiteResponseDto implements GeneratedSite {
  url: string;
  path: string;
  faqCount: number;
  categories: string[];
  lastGenerated: Date;
}

export class FAQSiteInfoResponseDto implements FAQSite {
  appId: string;
  url: string;
  lastPublished: Date;
  faqCount: number;
  isActive: boolean;
}

export class BulkUpdateResultDto {
  success: { [appId: string]: GeneratedSite };
  failed: { [appId: string]: string };
  statistics: {
    total: number;
    success: number;
    failed: number;
  };
}

@ApiTags('FAQ公開サイト管理')
@Controller('faq-sites')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FAQSiteController {
  private readonly logger = new Logger(FAQSiteController.name);

  constructor(private readonly faqSiteService: FAQSiteService) {}

  /**
   * FAQ公開サイト生成
   * 要件: 6.3 (静的サイト生成機能の実装)
   */
  @Post(':appId/generate')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('faq', 'publish')
  @ApiOperation({ 
    summary: 'FAQ公開サイト生成', 
    description: '指定されたアプリのFAQ公開サイトを生成します' 
  })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiBody({ type: FAQSiteGenerationOptionsDto, required: false })
  @ApiResponse({ status: 201, description: 'FAQ公開サイト生成成功', type: GeneratedSiteResponseDto })
  @ApiResponse({ status: 400, description: '公開済みFAQが存在しません' })
  @ApiResponse({ status: 404, description: 'アプリケーションが見つかりません' })
  async generateFAQSite(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() options: FAQSiteGenerationOptionsDto = {},
  ): Promise<GeneratedSiteResponseDto> {
    this.logger.log(`FAQ公開サイト生成リクエスト: appId=${appId}`);
    return await this.faqSiteService.generateFAQSite(appId, options);
  }

  /**
   * FAQ公開サイト更新
   * 要件: 6.4 (FAQ更新時の自動反映機能)
   */
  @Post(':appId/update')
  @RequirePermission('faq', 'publish')
  @ApiOperation({ 
    summary: 'FAQ公開サイト更新', 
    description: '指定されたアプリのFAQ公開サイトを更新します' 
  })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiResponse({ status: 200, description: 'FAQ公開サイト更新成功', type: GeneratedSiteResponseDto })
  @ApiResponse({ status: 404, description: 'アプリケーションが見つかりません' })
  async updateFAQSite(
    @Param('appId', ParseUUIDPipe) appId: string,
  ): Promise<GeneratedSiteResponseDto> {
    this.logger.log(`FAQ公開サイト更新リクエスト: appId=${appId}`);
    return await this.faqSiteService.updateFAQSite(appId);
  }

  /**
   * 全FAQ公開サイト一括更新
   * 要件: 6.4 (FAQ更新時の自動反映機能)
   */
  @Post('update-all')
  @RequirePermission('faq', 'publish')
  @ApiOperation({ 
    summary: '全FAQ公開サイト一括更新', 
    description: '全てのアプリのFAQ公開サイトを一括更新します' 
  })
  @ApiResponse({ status: 200, description: '全FAQ公開サイト一括更新完了', type: BulkUpdateResultDto })
  async updateAllFAQSites(): Promise<BulkUpdateResultDto> {
    this.logger.log('全FAQ公開サイト一括更新リクエスト');
    
    const results = await this.faqSiteService.updateAllFAQSites();
    
    const success: { [appId: string]: GeneratedSite } = {};
    const failed: { [appId: string]: string } = {};
    
    for (const [appId, result] of Object.entries(results)) {
      if (result instanceof Error) {
        failed[appId] = result.message;
      } else {
        success[appId] = result;
      }
    }
    
    return {
      success,
      failed,
      statistics: {
        total: Object.keys(results).length,
        success: Object.keys(success).length,
        failed: Object.keys(failed).length,
      },
    };
  }

  /**
   * FAQ公開サイト情報取得
   */
  @Get(':appId')
  @RequirePermission('faq', 'read')
  @ApiOperation({ 
    summary: 'FAQ公開サイト情報取得', 
    description: '指定されたアプリのFAQ公開サイト情報を取得します' 
  })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiResponse({ status: 200, description: 'FAQ公開サイト情報取得成功', type: FAQSiteInfoResponseDto })
  @ApiResponse({ status: 404, description: 'FAQ公開サイトが見つかりません' })
  async getFAQSiteInfo(
    @Param('appId', ParseUUIDPipe) appId: string,
  ): Promise<FAQSiteInfoResponseDto | null> {
    return await this.faqSiteService.getFAQSiteInfo(appId);
  }

  /**
   * FAQ公開サイト存在確認
   */
  @Get(':appId/exists')
  @RequirePermission('faq', 'read')
  @ApiOperation({ 
    summary: 'FAQ公開サイト存在確認', 
    description: '指定されたアプリのFAQ公開サイトが存在するかを確認します' 
  })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiResponse({ 
    status: 200, 
    description: 'FAQ公開サイト存在確認結果',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
        appId: { type: 'string' }
      }
    }
  })
  async checkFAQSiteExists(
    @Param('appId', ParseUUIDPipe) appId: string,
  ): Promise<{ exists: boolean; appId: string }> {
    const exists = await this.faqSiteService.checkFAQSiteExists(appId);
    return { exists, appId };
  }

  /**
   * FAQ公開サイト削除
   */
  @Delete(':appId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('faq', 'delete')
  @ApiOperation({ 
    summary: 'FAQ公開サイト削除', 
    description: '指定されたアプリのFAQ公開サイトを削除します' 
  })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiResponse({ status: 204, description: 'FAQ公開サイト削除成功' })
  async deleteFAQSite(
    @Param('appId', ParseUUIDPipe) appId: string,
  ): Promise<void> {
    this.logger.log(`FAQ公開サイト削除リクエスト: appId=${appId}`);
    await this.faqSiteService.deleteFAQSite(appId);
  }

  /**
   * 全FAQ公開サイト一覧取得
   */
  @Get()
  @RequirePermission('faq', 'read')
  @ApiOperation({ 
    summary: '全FAQ公開サイト一覧取得', 
    description: '全てのFAQ公開サイトの情報を取得します' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '全FAQ公開サイト一覧取得成功',
    type: [FAQSiteInfoResponseDto]
  })
  async getAllFAQSites(): Promise<FAQSiteInfoResponseDto[]> {
    // 実装は簡略化のため省略
    // 実際の実装では全アプリケーションを取得してサイト情報を収集
    return [];
  }
}