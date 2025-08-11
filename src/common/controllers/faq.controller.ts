/**
 * FAQコントローラー
 * 要件: 6.3, 6.4 (FAQ管理機能)
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
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  NotFoundException,
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
import { FAQService } from '../services/faq.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import {
  CreateFAQDto,
  UpdateFAQDto,
  SearchFAQDto,
  BulkUpdateFAQPublishStatusDto,
  UpdateFAQOrderDto,
  FAQResponseDto,
  FAQSearchResultDto,
  FAQStatisticsDto,
  FAQGenerationOptionsDto,
  FAQGenerationResultDto,
  FAQClusterResponseDto,
  CreateFAQFromClusterDto,
  BulkCreateFAQFromClustersDto,
  BulkCreateFAQResultDto,
} from '../dto/faq.dto';

@ApiTags('FAQ管理')
@Controller('faqs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FAQController {
  private readonly logger = new Logger(FAQController.name);

  constructor(private readonly faqService: FAQService) {}

  /**
   * FAQ作成
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('faq', 'create')
  @ApiOperation({ summary: 'FAQ作成', description: '新しいFAQを作成します' })
  @ApiBody({ type: CreateFAQDto })
  @ApiResponse({ status: 201, description: 'FAQ作成成功', type: FAQResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 404, description: 'アプリケーションが見つかりません' })
  async createFAQ(@Body() createFAQDto: CreateFAQDto): Promise<FAQResponseDto> {
    this.logger.log(`FAQ作成リクエスト: appId=${createFAQDto.appId}`);
    return await this.faqService.createFAQ(createFAQDto);
  }

  /**
   * FAQ取得
   */
  @Get(':id')
  @RequirePermission('faq', 'read')
  @ApiOperation({ summary: 'FAQ取得', description: '指定されたIDのFAQを取得します' })
  @ApiParam({ name: 'id', description: 'FAQ ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'FAQ取得成功', type: FAQResponseDto })
  @ApiResponse({ status: 404, description: 'FAQが見つかりません' })
  async getFAQ(@Param('id', ParseUUIDPipe) id: string): Promise<FAQResponseDto> {
    return await this.faqService.getFAQ(id);
  }

  /**
   * FAQ更新
   */
  @Put(':id')
  @RequirePermission('faq', 'update')
  @ApiOperation({ summary: 'FAQ更新', description: '指定されたIDのFAQを更新します' })
  @ApiParam({ name: 'id', description: 'FAQ ID', type: 'string' })
  @ApiBody({ type: UpdateFAQDto })
  @ApiResponse({ status: 200, description: 'FAQ更新成功', type: FAQResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 404, description: 'FAQが見つかりません' })
  async updateFAQ(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFAQDto: UpdateFAQDto,
  ): Promise<FAQResponseDto> {
    this.logger.log(`FAQ更新リクエスト: id=${id}`);
    return await this.faqService.updateFAQ(id, updateFAQDto);
  }

  /**
   * FAQ削除
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('faq', 'delete')
  @ApiOperation({ summary: 'FAQ削除', description: '指定されたIDのFAQを削除します' })
  @ApiParam({ name: 'id', description: 'FAQ ID', type: 'string' })
  @ApiResponse({ status: 204, description: 'FAQ削除成功' })
  @ApiResponse({ status: 404, description: 'FAQが見つかりません' })
  async deleteFAQ(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`FAQ削除リクエスト: id=${id}`);
    await this.faqService.deleteFAQ(id);
  }

  /**
   * FAQ検索
   */
  @Get()
  @RequirePermission('faq', 'read')
  @ApiOperation({ summary: 'FAQ検索', description: '条件に基づいてFAQを検索します' })
  @ApiQuery({ name: 'query', required: false, description: '検索クエリ' })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  @ApiQuery({ name: 'category', required: false, description: 'カテゴリ' })
  @ApiQuery({ name: 'isPublished', required: false, description: '公開状態' })
  @ApiQuery({ name: 'tags', required: false, description: 'タグ（カンマ区切り）' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'orderIndex'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, description: 'ページ番号' })
  @ApiQuery({ name: 'limit', required: false, description: '1ページあたりの件数' })
  @ApiResponse({ status: 200, description: 'FAQ検索成功', type: FAQSearchResultDto })
  async searchFAQs(@Query() searchDto: SearchFAQDto): Promise<FAQSearchResultDto> {
    return await this.faqService.searchFAQs(searchDto);
  }

  /**
   * アプリ別FAQ取得
   */
  @Get('apps/:appId')
  @RequirePermission('faq', 'read')
  @ApiOperation({ summary: 'アプリ別FAQ取得', description: '指定されたアプリのFAQを取得します' })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiQuery({ name: 'query', required: false, description: '検索クエリ' })
  @ApiQuery({ name: 'category', required: false, description: 'カテゴリ' })
  @ApiQuery({ name: 'isPublished', required: false, description: '公開状態' })
  @ApiQuery({ name: 'tags', required: false, description: 'タグ（カンマ区切り）' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'orderIndex'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, description: 'ページ番号' })
  @ApiQuery({ name: 'limit', required: false, description: '1ページあたりの件数' })
  @ApiResponse({ status: 200, description: 'アプリ別FAQ取得成功', type: FAQSearchResultDto })
  @ApiResponse({ status: 404, description: 'アプリケーションが見つかりません' })
  async getFAQsByApp(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Query() searchDto: SearchFAQDto,
  ): Promise<FAQSearchResultDto> {
    return await this.faqService.getFAQsByApp(appId, searchDto);
  }

  /**
   * 公開済みFAQ取得
   */
  @Get('apps/:appId/published')
  @RequirePermission('faq', 'read')
  @ApiOperation({ summary: '公開済みFAQ取得', description: '指定されたアプリの公開済みFAQを取得します' })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiResponse({ status: 200, description: '公開済みFAQ取得成功', type: [FAQResponseDto] })
  @ApiResponse({ status: 404, description: 'アプリケーションが見つかりません' })
  async getPublishedFAQs(@Param('appId', ParseUUIDPipe) appId: string): Promise<FAQResponseDto[]> {
    return await this.faqService.getPublishedFAQs(appId);
  }

  /**
   * カテゴリ別FAQ取得
   */
  @Get('apps/:appId/categories/:category')
  @RequirePermission('faq', 'read')
  @ApiOperation({ summary: 'カテゴリ別FAQ取得', description: '指定されたアプリとカテゴリのFAQを取得します' })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiParam({ name: 'category', description: 'カテゴリ', type: 'string' })
  @ApiResponse({ status: 200, description: 'カテゴリ別FAQ取得成功', type: [FAQResponseDto] })
  async getFAQsByCategory(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Param('category') category: string,
  ): Promise<FAQResponseDto[]> {
    return await this.faqService.getFAQsByCategory(appId, category);
  }

  /**
   * FAQ公開状態更新
   */
  @Put(':id/publish')
  @RequirePermission('faq', 'update')
  @ApiOperation({ summary: 'FAQ公開状態更新', description: 'FAQの公開状態を更新します' })
  @ApiParam({ name: 'id', description: 'FAQ ID', type: 'string' })
  @ApiBody({ schema: { type: 'object', properties: { isPublished: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, description: 'FAQ公開状態更新成功', type: FAQResponseDto })
  @ApiResponse({ status: 404, description: 'FAQが見つかりません' })
  async updatePublishStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isPublished') isPublished: boolean,
  ): Promise<FAQResponseDto> {
    this.logger.log(`FAQ公開状態更新リクエスト: id=${id}, isPublished=${isPublished}`);
    return await this.faqService.updatePublishStatus(id, isPublished);
  }

  /**
   * FAQ公開状態一括更新
   */
  @Put('bulk/publish')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('faq', 'update')
  @ApiOperation({ summary: 'FAQ公開状態一括更新', description: '複数のFAQの公開状態を一括更新します' })
  @ApiBody({ type: BulkUpdateFAQPublishStatusDto })
  @ApiResponse({ status: 204, description: 'FAQ公開状態一括更新成功' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  async bulkUpdatePublishStatus(@Body() bulkUpdateDto: BulkUpdateFAQPublishStatusDto): Promise<void> {
    this.logger.log(`FAQ公開状態一括更新リクエスト: ${bulkUpdateDto.ids.length}件`);
    await this.faqService.bulkUpdatePublishStatus(bulkUpdateDto);
  }

  /**
   * FAQ表示順序更新
   */
  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('faq', 'update')
  @ApiOperation({ summary: 'FAQ表示順序更新', description: 'FAQの表示順序を更新します' })
  @ApiBody({ type: UpdateFAQOrderDto })
  @ApiResponse({ status: 204, description: 'FAQ表示順序更新成功' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  async updateFAQOrder(@Body() updateOrderDto: UpdateFAQOrderDto): Promise<void> {
    this.logger.log(`FAQ表示順序更新リクエスト: ${updateOrderDto.items.length}件`);
    await this.faqService.updateFAQOrder(updateOrderDto);
  }

  /**
   * FAQ統計取得
   */
  @Get('apps/:appId/statistics')
  @RequirePermission('faq', 'read')
  @ApiOperation({ summary: 'FAQ統計取得', description: '指定されたアプリのFAQ統計を取得します' })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiResponse({ status: 200, description: 'FAQ統計取得成功', type: FAQStatisticsDto })
  @ApiResponse({ status: 404, description: 'アプリケーションが見つかりません' })
  async getFAQStatistics(@Param('appId', ParseUUIDPipe) appId: string): Promise<FAQStatisticsDto> {
    return await this.faqService.getFAQStatistics(appId);
  }

  /**
   * 全アプリFAQ統計取得
   */
  @Get('statistics/all')
  @RequirePermission('faq', 'read')
  @ApiOperation({ summary: '全アプリFAQ統計取得', description: '全アプリのFAQ統計を取得します' })
  @ApiResponse({ 
    status: 200, 
    description: '全アプリFAQ統計取得成功',
    schema: {
      type: 'object',
      additionalProperties: { $ref: '#/components/schemas/FAQStatisticsDto' }
    }
  })
  async getAllFAQStatistics(): Promise<{ [appId: string]: FAQStatisticsDto }> {
    return await this.faqService.getAllFAQStatistics();
  }

  /**
   * FAQ自動生成プレビュー
   * 要件: 6.2 (FAQ項目の自動生成とプレビュー機能)
   */
  @Post('apps/:appId/generate/preview')
  @RequirePermission('faq', 'create')
  @ApiOperation({ 
    summary: 'FAQ自動生成プレビュー', 
    description: '問い合わせクラスタリングによるFAQ自動生成のプレビューを実行します' 
  })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiBody({ type: FAQGenerationOptionsDto })
  @ApiResponse({ status: 200, description: 'FAQ自動生成プレビュー成功', type: FAQGenerationResultDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 404, description: 'アプリケーションが見つかりません' })
  async previewGeneratedFAQ(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() options: FAQGenerationOptionsDto,
  ): Promise<FAQGenerationResultDto> {
    this.logger.log(`FAQ自動生成プレビューリクエスト: appId=${appId}`);
    
    // DTOから型に変換
    const generationOptions = {
      minClusterSize: options.minClusterSize,
      maxClusters: options.maxClusters,
      similarityThreshold: options.similarityThreshold,
      dateRange: options.startDate && options.endDate ? {
        startDate: options.startDate,
        endDate: options.endDate
      } : undefined,
      categories: options.categories,
    };

    const result = await this.faqService.previewGeneratedFAQ(appId, generationOptions);
    
    return {
      clusters: result.clusters.map(cluster => ({
        id: cluster.id,
        inquiries: cluster.inquiries,
        representativeQuestion: cluster.representativeQuestion,
        suggestedAnswer: cluster.suggestedAnswer,
        category: cluster.category,
        confidence: cluster.confidence,
      })),
      statistics: result.statistics,
    };
  }

  /**
   * FAQ自動生成実行
   * 要件: 6.1, 6.2 (問い合わせクラスタリングアルゴリズムの実装、FAQ項目の自動生成)
   */
  @Post('apps/:appId/generate')
  @RequirePermission('faq', 'create')
  @ApiOperation({ 
    summary: 'FAQ自動生成実行', 
    description: '問い合わせクラスタリングによるFAQ自動生成を実行します' 
  })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiBody({ type: FAQGenerationOptionsDto })
  @ApiResponse({ status: 200, description: 'FAQ自動生成成功', type: [FAQClusterResponseDto] })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 404, description: 'アプリケーションが見つかりません' })
  async generateFAQ(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() options: FAQGenerationOptionsDto,
  ): Promise<FAQClusterResponseDto[]> {
    this.logger.log(`FAQ自動生成リクエスト: appId=${appId}`);
    
    // DTOから型に変換
    const generationOptions = {
      minClusterSize: options.minClusterSize,
      maxClusters: options.maxClusters,
      similarityThreshold: options.similarityThreshold,
      dateRange: options.startDate && options.endDate ? {
        startDate: options.startDate,
        endDate: options.endDate
      } : undefined,
      categories: options.categories,
    };

    const clusters = await this.faqService.generateFAQ(appId, generationOptions);
    
    return clusters.map(cluster => ({
      id: cluster.id,
      inquiries: cluster.inquiries,
      representativeQuestion: cluster.representativeQuestion,
      suggestedAnswer: cluster.suggestedAnswer,
      category: cluster.category,
      confidence: cluster.confidence,
    }));
  }

  /**
   * クラスタからFAQ作成
   * 要件: 6.2 (FAQ項目の自動生成)
   */
  @Post('apps/:appId/generate/create')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('faq', 'create')
  @ApiOperation({ 
    summary: 'クラスタからFAQ作成', 
    description: '自動生成されたクラスタからFAQを作成します' 
  })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiBody({ type: CreateFAQFromClusterDto })
  @ApiResponse({ status: 201, description: 'FAQ作成成功', type: FAQResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 404, description: 'アプリケーションまたはクラスタが見つかりません' })
  async createFAQFromCluster(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() createDto: CreateFAQFromClusterDto,
  ): Promise<FAQResponseDto> {
    this.logger.log(`クラスタからFAQ作成リクエスト: appId=${appId}, clusterId=${createDto.clusterId}`);
    
    // まず最新のクラスタリング結果を取得
    const generationOptions = {
      minClusterSize: 3,
      maxClusters: 20,
      similarityThreshold: 0.7,
    };
    
    const clusters = await this.faqService.generateFAQ(appId, generationOptions);
    const targetCluster = clusters.find(cluster => cluster.id === createDto.clusterId);
    
    if (!targetCluster) {
      throw new NotFoundException(`クラスタが見つかりません: ${createDto.clusterId}`);
    }

    return await this.faqService.createFAQFromCluster(appId, targetCluster, {
      isPublished: createDto.isPublished,
      category: createDto.category,
      tags: createDto.tags,
    });
  }

  /**
   * 複数クラスタからFAQ一括作成
   * 要件: 6.2 (FAQ項目の自動生成)
   */
  @Post('apps/:appId/generate/bulk-create')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('faq', 'create')
  @ApiOperation({ 
    summary: '複数クラスタからFAQ一括作成', 
    description: '複数の自動生成クラスタからFAQを一括作成します' 
  })
  @ApiParam({ name: 'appId', description: 'アプリケーションID', type: 'string' })
  @ApiBody({ type: BulkCreateFAQFromClustersDto })
  @ApiResponse({ status: 201, description: 'FAQ一括作成成功', type: BulkCreateFAQResultDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 404, description: 'アプリケーションが見つかりません' })
  async createFAQsFromClusters(
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() bulkCreateDto: BulkCreateFAQFromClustersDto,
  ): Promise<BulkCreateFAQResultDto> {
    this.logger.log(`複数クラスタからFAQ一括作成リクエスト: appId=${appId}, clusters=${bulkCreateDto.clusterIds.length}件`);
    
    // まず最新のクラスタリング結果を取得
    const generationOptions = {
      minClusterSize: 3,
      maxClusters: 20,
      similarityThreshold: 0.7,
    };
    
    const allClusters = await this.faqService.generateFAQ(appId, generationOptions);
    const targetClusters = allClusters.filter(cluster => 
      bulkCreateDto.clusterIds.includes(cluster.id)
    );
    
    if (targetClusters.length === 0) {
      throw new NotFoundException('指定されたクラスタが見つかりません');
    }

    const result = await this.faqService.createFAQsFromClusters(appId, targetClusters, {
      isPublished: bulkCreateDto.isPublished,
      autoPublishThreshold: bulkCreateDto.autoPublishThreshold,
    });

    return {
      created: result.created,
      failed: result.failed.map(f => ({
        clusterId: f.cluster.id,
        error: f.error,
      })),
      statistics: {
        total: bulkCreateDto.clusterIds.length,
        success: result.created.length,
        failed: result.failed.length,
      },
    };
  }
}