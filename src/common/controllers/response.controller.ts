/**
 * 回答コントローラー
 * 要件: 2.1, 2.3, 2.4 (回答管理機能)
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ResponseService } from '../services/response.service';
import { CreateResponseDto, UpdateResponseDto, ResponseDto, ResponseDetailDto, ResponseHistoryDto } from '../dto/response.dto';
import { BaseResponseDto } from '../dto/base-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('回答管理')
@Controller('api/v1/responses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ResponseController {
  private readonly logger = new Logger(ResponseController.name);

  constructor(private readonly responseService: ResponseService) {}

  /**
   * 回答追加
   * 要件: 2.1 (問い合わせと回答の関連付け機能)
   */
  @Post()
  @RequirePermission('response', 'create')
  @ApiOperation({ 
    summary: '回答追加',
    description: '指定された問い合わせに回答を追加します。'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '回答が正常に追加されました',
    type: BaseResponseDto<ResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '入力データに不備があります',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された問い合わせが見つかりません',
  })
  async addResponse(
    @Body() createResponseDto: CreateResponseDto,
    @CurrentUser() user: any,
  ): Promise<BaseResponseDto<ResponseDto>> {
    try {
      this.logger.log(`回答追加リクエスト: 問い合わせID=${createResponseDto.inquiryId}`);
      
      const response = await this.responseService.addResponse(createResponseDto, user.id);
      
      const responseData = new BaseResponseDto({
        id: response.id,
        inquiryId: response.inquiryId,
        userId: response.userId,
        content: response.content,
        isPublic: response.isPublic,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      }, true, '回答が正常に追加されました');
      
      return responseData;
    } catch (error) {
      this.logger.error(`回答追加エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 回答詳細取得
   * 要件: 2.1 (回答取得機能)
   */
  @Get(':id')
  @RequirePermission('response', 'read')
  @ApiOperation({ 
    summary: '回答詳細取得',
    description: '指定されたIDの回答詳細を取得します。'
  })
  @ApiParam({
    name: 'id',
    description: '回答ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '回答詳細を正常に取得しました',
    type: BaseResponseDto<ResponseDetailDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された回答が見つかりません',
  })
  async getResponse(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<ResponseDetailDto>> {
    try {
      this.logger.log(`回答詳細取得: ID=${id}`);
      
      const response = await this.responseService.getResponse(id);
      
      const responseData = new BaseResponseDto({
        id: response.id,
        inquiryId: response.inquiryId,
        userId: response.userId,
        content: response.content,
        isPublic: response.isPublic,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        user: response.user ? {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
        } : undefined,
        inquiry: response.inquiry ? {
          id: response.inquiry.id,
          title: response.inquiry.title,
          status: response.inquiry.status,
        } : undefined,
        history: response.history?.map(h => ({
          id: h.id,
          responseId: h.responseId,
          oldContent: h.oldContent,
          newContent: h.newContent,
          changedBy: h.changedBy,
          changedAt: h.changedAt,
          changedByUser: h.changedByUser ? {
            id: h.changedByUser.id,
            name: h.changedByUser.name,
            email: h.changedByUser.email,
          } : undefined,
        })) || [],
      }, true, '回答詳細を正常に取得しました');
      
      return responseData;
    } catch (error) {
      this.logger.error(`回答詳細取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 問い合わせの回答一覧取得
   * 要件: 2.3 (時系列での履歴表示機能)
   */
  @Get('inquiry/:inquiryId')
  @RequirePermission('response', 'read')
  @ApiOperation({ 
    summary: '問い合わせの回答一覧取得',
    description: '指定された問い合わせに関連する回答一覧を時系列で取得します。'
  })
  @ApiParam({
    name: 'inquiryId',
    description: '問い合わせID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '回答一覧を正常に取得しました',
    type: BaseResponseDto<ResponseDto[]>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された問い合わせが見つかりません',
  })
  async getResponsesByInquiry(
    @Param('inquiryId', ParseUUIDPipe) inquiryId: string,
  ): Promise<BaseResponseDto<ResponseDto[]>> {
    try {
      this.logger.log(`問い合わせ回答一覧取得: 問い合わせID=${inquiryId}`);
      
      const responses = await this.responseService.getResponsesByInquiry(inquiryId);
      
      const responseData = new BaseResponseDto(
        responses.map(response => ({
          id: response.id,
          inquiryId: response.inquiryId,
          userId: response.userId,
          content: response.content,
          isPublic: response.isPublic,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          user: response.user ? {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
          } : undefined,
        })),
        true,
        '回答一覧を正常に取得しました'
      );
      
      return responseData;
    } catch (error) {
      this.logger.error(`問い合わせ回答一覧取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 回答更新
   * 要件: 2.3, 2.4 (回答の更新・履歴管理機能)
   */
  @Put(':id')
  @RequirePermission('response', 'update')
  @ApiOperation({ 
    summary: '回答更新',
    description: '指定されたIDの回答を更新します。履歴が自動的に記録されます。'
  })
  @ApiParam({
    name: 'id',
    description: '回答ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '回答が正常に更新されました',
    type: BaseResponseDto<ResponseDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された回答が見つかりません',
  })
  async updateResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateResponseDto: UpdateResponseDto,
    @CurrentUser() user: any,
  ): Promise<BaseResponseDto<ResponseDto>> {
    try {
      this.logger.log(`回答更新: ID=${id}`);
      
      const response = await this.responseService.updateResponse(id, updateResponseDto, user.id);
      
      const responseData = new BaseResponseDto({
        id: response.id,
        inquiryId: response.inquiryId,
        userId: response.userId,
        content: response.content,
        isPublic: response.isPublic,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      }, true, '回答が正常に更新されました');
      
      return responseData;
    } catch (error) {
      this.logger.error(`回答更新エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 回答履歴取得
   * 要件: 2.4 (履歴管理機能)
   */
  @Get(':id/history')
  @RequirePermission('response', 'read')
  @ApiOperation({ 
    summary: '回答履歴取得',
    description: '指定された回答の更新履歴を取得します。'
  })
  @ApiParam({
    name: 'id',
    description: '回答ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '回答履歴を正常に取得しました',
    type: BaseResponseDto<ResponseHistoryDto[]>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された回答が見つかりません',
  })
  async getResponseHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<ResponseHistoryDto[]>> {
    try {
      this.logger.log(`回答履歴取得: 回答ID=${id}`);
      
      const history = await this.responseService.getResponseHistory(id);
      
      const responseData = new BaseResponseDto(
        history.map(h => ({
          id: h.id,
          responseId: h.responseId,
          oldContent: h.oldContent,
          newContent: h.newContent,
          changedBy: h.changedBy,
          changedAt: h.changedAt,
          changedByUser: h.changedByUser ? {
            id: h.changedByUser.id,
            name: h.changedByUser.name,
            email: h.changedByUser.email,
          } : undefined,
        })),
        true,
        '回答履歴を正常に取得しました'
      );
      
      return responseData;
    } catch (error) {
      this.logger.error(`回答履歴取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 回答削除
   */
  @Delete(':id')
  @RequirePermission('response', 'delete')
  @ApiOperation({ 
    summary: '回答削除',
    description: '指定されたIDの回答を削除します。管理者のみ実行可能。'
  })
  @ApiParam({
    name: 'id',
    description: '回答ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '回答が正常に削除されました',
    type: BaseResponseDto<null>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '指定された回答が見つかりません',
  })
  async deleteResponse(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<null>> {
    try {
      this.logger.log(`回答削除: ID=${id}`);
      
      await this.responseService.deleteResponse(id);
      
      const responseData = new BaseResponseDto(null, true, '回答が正常に削除されました');
      
      return responseData;
    } catch (error) {
      this.logger.error(`回答削除エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 公開回答一覧取得（顧客向け）
   * 要件: 2.1 (公開回答の取得)
   */
  @Get('inquiry/:inquiryId/public')
  @RequirePermission('response', 'read')
  @ApiOperation({ 
    summary: '公開回答一覧取得',
    description: '指定された問い合わせの公開回答のみを取得します。'
  })
  @ApiParam({
    name: 'inquiryId',
    description: '問い合わせID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '公開回答一覧を正常に取得しました',
    type: BaseResponseDto<ResponseDto[]>,
  })
  async getPublicResponsesByInquiry(
    @Param('inquiryId', ParseUUIDPipe) inquiryId: string,
  ): Promise<BaseResponseDto<ResponseDto[]>> {
    try {
      this.logger.log(`公開回答一覧取得: 問い合わせID=${inquiryId}`);
      
      const responses = await this.responseService.getPublicResponsesByInquiry(inquiryId);
      
      const responseData = new BaseResponseDto(
        responses.map(response => ({
          id: response.id,
          inquiryId: response.inquiryId,
          userId: response.userId,
          content: response.content,
          isPublic: response.isPublic,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          user: response.user ? {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
          } : undefined,
        })),
        true,
        '公開回答一覧を正常に取得しました'
      );
      
      return responseData;
    } catch (error) {
      this.logger.error(`公開回答一覧取得エラー: ${error.message}`, error.stack);
      throw error;
    }
  }
}