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
import { CreateInquiryDto, UpdateInquiryDto, InquiryResponseDto, InquiryDetailResponseDto } from '../../../common/dto/inquiry.dto';
import { SearchInquiriesDto, SearchResultDto } from '../../../common/dto/search.dto';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../../../common/guards/api-key-auth.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

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