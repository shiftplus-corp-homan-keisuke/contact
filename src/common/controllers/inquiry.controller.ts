/**
 * 問い合わせコントローラー
 * 要件: 1.1, 1.3, 1.4, 7.2, 7.3 (問い合わせ登録・管理機能、API機能)
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
  HttpStatus,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { InquiryService } from '../services/inquiry.service';
import { CreateInquiryDto, UpdateInquiryDto, InquiryResponseDto, InquiryDetailResponseDto } from '../dto/inquiry.dto';
import { SearchInquiriesDto, SearchResultDto } from '../dto/search.dto';
import { BaseResponseDto } from '../dto/base-response.dto';
import { PaginationDto } from '../dto/pagination.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';

@ApiTags('問い合わせ管理')
@Controller('api/v1/inquiries')
export class InquiryController {
  private readonly logger = new Logger(InquiryController.name);

  constructor(private readonly inquiryService: InquiryService) {}

  /**
   * 問い合わせ作成
   * 要件: 1.1, 1.3, 7.2 (問い合わせ登録機能、API機能)
   */
  @Post()
  @UseGuards(ApiKeyAuthGuard) // API認証
  @ApiOperation({ 
    summary: '問い合わせ作成',
    description: '新しい問い合わせを作成します。APIキー認証が必要です。'
  })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'APIキー',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '問い合わせが正常に作成されました',
    type: BaseResponseDto<InquiryResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '入力データに不備があります',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'APIキーが無効です',
  })
  async createInquiry(
    @Body() createInquiryDto: CreateInquiryDto,
  ): Promise<BaseResponseDto<InquiryResponseDto>> {
    try {
      this.logger.log(`問い合わせ作成リクエスト: ${createInquiryDto.title}`);
      
      const inquiry = await this.inquiryService.createInquiry(createInquiryDto);
      
      const response = new BaseResponseDto({
        id: inquiry.id,
        appId: inquiry.appId,
        title: inquiry.title,
        content: inquiry.content,
        status: inquiry.status,
        priority: inquiry.priority,
        category: inquiry.category,
        customerEmail: inquiry.customerEmail,
        customerName: inquiry.customerName,
        assignedTo: inquiry.assignedTo,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
      }, true, '問い合わせが正常に作成されました');
      
      return response;
    } catch (error) {
      this.logger.error(`問い合わせ作成エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 問い合わせ検索・フィルタリング
   * 要件: 8.1, 8.2, 8.4 (検索・フィルタリング機能)
   */
  @Get('search')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'read')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '問い合わせ検索・フィルタリング',
    description: '問い合わせを検索・フィルタリングします。全文検索とフィルター機能に対応。'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '検索結果を正常に取得しました',
    type: BaseResponseDto,
  })
  async searchInquiries(
    @Query() searchDto: SearchInquiriesDto,
  ): Promise<BaseResponseDto<SearchResultDto<InquiryResponseDto>>> {
    try {
      this.logger.log(`問い合わせ検索実行: query="${searchDto.query}"`);
      
      const result = await this.inquiryService.searchInquiries(searchDto);
      
      const response = new BaseResponseDto({
        items: result.items.map(inquiry => ({
          id: inquiry.id,
          appId: inquiry.appId,
          title: inquiry.title,
          content: inquiry.content,
          status: inquiry.status,
          priority: inquiry.priority,
          category: inquiry.category,
          customerEmail: inquiry.customerEmail,
          customerName: inquiry.customerName,
          assignedTo: inquiry.assignedTo,
          createdAt: inquiry.createdAt,
          updatedAt: inquiry.updatedAt,
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        query: result.query,
        appliedFilters: result.appliedFilters,
        executionTime: result.executionTime,
      }, true, '検索結果を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`問い合わせ検索エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 検索候補取得（オートコンプリート）
   * 要件: 8.1 (検索機能)
   */
  @Get('search/suggestions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'read')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '検索候補取得',
    description: 'オートコンプリート用の検索候補を取得します。'
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: '検索クエリ（2文字以上）',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '取得件数（デフォルト: 10）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '検索候補を正常に取得しました',
    type: BaseResponseDto,
  })
  async getSearchSuggestions(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<BaseResponseDto<string[]>> {
    try {
      this.logger.log(`検索候補取得: query="${query}"`);
      
      const suggestions = await this.inquiryService.getSearchSuggestions(query, limit);
      
      const response = new BaseResponseDto(suggestions, true, '検索候補を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`検索候補取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 利用可能なカテゴリ一覧取得
   * 要件: 8.2 (フィルタリング機能)
   */
  @Get('categories')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'read')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'カテゴリ一覧取得',
    description: 'フィルタリング用の利用可能なカテゴリ一覧を取得します。'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'カテゴリ一覧を正常に取得しました',
    type: BaseResponseDto,
  })
  async getAvailableCategories(): Promise<BaseResponseDto<string[]>> {
    try {
      this.logger.log('カテゴリ一覧取得');
      
      const categories = await this.inquiryService.getAvailableCategories();
      
      const response = new BaseResponseDto(categories, true, 'カテゴリ一覧を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`カテゴリ一覧取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 検索統計取得
   * 要件: 8.1, 8.2 (検索・フィルタリング機能)
   */
  @Get('statistics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'read')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '検索統計取得',
    description: '問い合わせの統計情報を取得します。'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '統計情報を正常に取得しました',
    type: BaseResponseDto,
  })
  async getSearchStatistics(): Promise<BaseResponseDto<any>> {
    try {
      this.logger.log('検索統計取得');
      
      const statistics = await this.inquiryService.getSearchStatistics();
      
      const response = new BaseResponseDto(statistics, true, '統計情報を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`検索統計取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * RAG検索実行
   * 要件: 3.2 (RAG検索機能)
   */
  @Get('rag-search')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'read')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'RAG検索実行',
    description: 'ベクトル検索を使用して類似する問い合わせ・回答を検索します。'
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: '検索クエリ',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '取得件数（デフォルト: 5）',
  })
  @ApiQuery({
    name: 'appId',
    required: false,
    type: String,
    description: 'アプリケーションIDでフィルタリング',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['inquiry', 'response', 'faq'],
    description: 'コンテンツタイプでフィルタリング',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RAG検索結果を正常に取得しました',
    type: BaseResponseDto,
  })
  async ragSearch(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
    @Query('appId') appId?: string,
    @Query('type') type?: 'inquiry' | 'response' | 'faq',
  ): Promise<BaseResponseDto<any[]>> {
    try {
      this.logger.log(`RAG検索実行: query="${query}"`);
      
      const results = await this.inquiryService.ragSearch(query, {
        limit,
        appId,
        type,
      });
      
      const response = new BaseResponseDto(results, true, 'RAG検索結果を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`RAG検索エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ベクトルインデックス統計取得
   * 要件: 3.1, 3.2 (ベクトルデータベース連携機能)
   */
  @Get('vector-statistics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'read')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'ベクトルインデックス統計取得',
    description: 'ベクトルインデックスの統計情報を取得します。'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ベクトル統計情報を正常に取得しました',
    type: BaseResponseDto,
  })
  async getVectorStatistics(): Promise<BaseResponseDto<any>> {
    try {
      this.logger.log('ベクトル統計取得');
      
      const statistics = this.inquiryService.getVectorIndexStatistics();
      
      const response = new BaseResponseDto(statistics, true, 'ベクトル統計情報を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`ベクトル統計取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ハイブリッド検索実行
   * 要件: 8.3, 3.2 (ハイブリッド検索機能)
   */
  @Get('hybrid-search')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'read')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'ハイブリッド検索実行',
    description: '全文検索とベクトル検索を組み合わせたハイブリッド検索を実行します。'
  })
  @ApiQuery({
    name: 'vectorWeight',
    required: false,
    type: Number,
    description: 'ベクトル検索の重み（0.0-1.0、デフォルト: 0.5）',
  })
  @ApiQuery({
    name: 'textWeight',
    required: false,
    type: Number,
    description: '全文検索の重み（0.0-1.0、デフォルト: 0.5）',
  })
  @ApiQuery({
    name: 'useVectorSearch',
    required: false,
    type: Boolean,
    description: 'ベクトル検索を使用するか（デフォルト: true）',
  })
  @ApiQuery({
    name: 'useTextSearch',
    required: false,
    type: Boolean,
    description: '全文検索を使用するか（デフォルト: true）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ハイブリッド検索結果を正常に取得しました',
    type: BaseResponseDto,
  })
  async hybridSearch(
    @Query() searchDto: SearchInquiriesDto,
    @Query('vectorWeight', new DefaultValuePipe(0.5)) vectorWeight: number,
    @Query('textWeight', new DefaultValuePipe(0.5)) textWeight: number,
    @Query('useVectorSearch', new DefaultValuePipe(true)) useVectorSearch: boolean,
    @Query('useTextSearch', new DefaultValuePipe(true)) useTextSearch: boolean,
  ): Promise<BaseResponseDto<any>> {
    try {
      this.logger.log(`ハイブリッド検索実行: query="${searchDto.query}"`);
      
      const results = await this.inquiryService.hybridSearch(searchDto, {
        vectorWeight,
        textWeight,
        useVectorSearch,
        useTextSearch,
      });
      
      const response = new BaseResponseDto(results, true, 'ハイブリッド検索結果を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`ハイブリッド検索エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 問い合わせ一覧取得
   * 要件: 7.2, 8.4 (API機能、検索・フィルタリング機能)
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'read')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '問い合わせ一覧取得',
    description: '問い合わせの一覧を取得します。ページネーション対応。'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'ページ番号（デフォルト: 1）',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '1ページあたりの件数（デフォルト: 20）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '問い合わせ一覧を正常に取得しました',
    type: BaseResponseDto,
  })
  async getInquiries(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<BaseResponseDto<any>> {
    try {
      this.logger.log(`問い合わせ一覧取得: page=${page}, limit=${limit}`);
      
      const result = await this.inquiryService.getInquiries(page, limit);
      
      const response = new BaseResponseDto({
        items: result.items.map(inquiry => ({
          id: inquiry.id,
          appId: inquiry.appId,
          title: inquiry.title,
          content: inquiry.content,
          status: inquiry.status,
          priority: inquiry.priority,
          category: inquiry.category,
          customerEmail: inquiry.customerEmail,
          customerName: inquiry.customerName,
          assignedTo: inquiry.assignedTo,
          createdAt: inquiry.createdAt,
          updatedAt: inquiry.updatedAt,
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      }, true, '問い合わせ一覧を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`問い合わせ一覧取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 問い合わせ詳細取得
   * 要件: 1.1, 7.2 (問い合わせ取得機能、API機能)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'read')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '問い合わせ詳細取得',
    description: '指定されたIDの問い合わせ詳細を取得します。'
  })
  @ApiParam({
    name: 'id',
    description: '問い合わせID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '問い合わせ詳細を正常に取得しました',
    type: BaseResponseDto<InquiryDetailResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された問い合わせが見つかりません',
  })
  async getInquiry(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<InquiryDetailResponseDto>> {
    try {
      this.logger.log(`問い合わせ詳細取得: ID=${id}`);
      
      const inquiry = await this.inquiryService.getInquiry(id);
      
      const response = new BaseResponseDto({
        id: inquiry.id,
        appId: inquiry.appId,
        title: inquiry.title,
        content: inquiry.content,
        status: inquiry.status,
        priority: inquiry.priority,
        category: inquiry.category,
        customerEmail: inquiry.customerEmail,
        customerName: inquiry.customerName,
        assignedTo: inquiry.assignedTo,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
        application: inquiry.application ? {
          id: inquiry.application.id,
          name: inquiry.application.name,
        } : undefined,
        assignedUser: inquiry.assignedUser ? {
          id: inquiry.assignedUser.id,
          name: inquiry.assignedUser.name,
          email: inquiry.assignedUser.email,
        } : undefined,
        responses: inquiry.responses || [],
        statusHistory: inquiry.statusHistory || [],
      }, true, '問い合わせ詳細を正常に取得しました');
      
      return response;
    } catch (error) {
      this.logger.error(`問い合わせ詳細取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 問い合わせ更新
   * 要件: 1.1 (問い合わせ更新機能)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'update')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '問い合わせ更新',
    description: '指定されたIDの問い合わせを更新します。'
  })
  @ApiParam({
    name: 'id',
    description: '問い合わせID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '問い合わせが正常に更新されました',
    type: BaseResponseDto<InquiryResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された問い合わせが見つかりません',
  })
  async updateInquiry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInquiryDto: UpdateInquiryDto,
  ): Promise<BaseResponseDto<InquiryResponseDto>> {
    try {
      this.logger.log(`問い合わせ更新: ID=${id}`);
      
      const inquiry = await this.inquiryService.updateInquiry(id, updateInquiryDto);
      
      const response = new BaseResponseDto({
        id: inquiry.id,
        appId: inquiry.appId,
        title: inquiry.title,
        content: inquiry.content,
        status: inquiry.status,
        priority: inquiry.priority,
        category: inquiry.category,
        customerEmail: inquiry.customerEmail,
        customerName: inquiry.customerName,
        assignedTo: inquiry.assignedTo,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
      }, true, '問い合わせが正常に更新されました');
      
      return response;
    } catch (error) {
      this.logger.error(`問い合わせ更新エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 問い合わせ削除
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('inquiry', 'delete')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: '問い合わせ削除',
    description: '指定されたIDの問い合わせを削除します。管理者のみ実行可能。'
  })
  @ApiParam({
    name: 'id',
    description: '問い合わせID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '問い合わせが正常に削除されました',
    type: BaseResponseDto<null>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された問い合わせが見つかりません',
  })
  async deleteInquiry(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<null>> {
    try {
      this.logger.log(`問い合わせ削除: ID=${id}`);
      
      await this.inquiryService.deleteInquiry(id);
      
      const response = new BaseResponseDto(null, true, '問い合わせが正常に削除されました');
      
      return response;
    } catch (error) {
      this.logger.error(`問い合わせ削除エラー: ${error.message}`, error.stack);
      throw error;
    }
  }
}