/**
 * 回答コントローラー
 * 要件: 2.1, 2.2, 2.3 (回答管理機能)
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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ResponseService } from '../services/response.service';
import {
  CreateResponseDto,
  UpdateResponseDto,
  ResponseDto,
  ResponseDetailDto,
  ResponseHistoryDto,
} from '../../../common/dto/response.dto';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TrackHistory } from '../../../common/decorators/track-history.decorator';
import { ResourceType, ActionType } from '../../../common/types/role.types';

@ApiTags('responses')
@Controller('responses')
export class ResponseController {
  constructor(private readonly responseService: ResponseService) {}

  /**
   * 回答作成
   * 要件: 2.1 - 問い合わせに対する回答の作成と送信
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.CREATE)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '回答を作成' })
  @ApiResponse({ status: 201, description: '回答作成成功', type: ResponseDto })
  @ApiResponse({ status: 400, description: '入力データが無効です' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '問い合わせが見つかりません' })
  @TrackHistory('response', 'create')
  async createResponse(
    @Body() createResponseDto: CreateResponseDto,
    @CurrentUser('userId') userId: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<BaseResponseDto<ResponseDto>> {
    try {
      const response = await this.responseService.createResponse(
        createResponseDto,
        userId,
        files,
      );
      return {
        success: true,
        data: response,
        message: '回答を作成しました',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('回答の作成に失敗しました');
    }
  }

  /**
   * 問い合わせの回答一覧取得
   * 要件: 2.2 - 回答履歴の管理と表示
   */
  @Get('inquiry/:inquiryId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: '問い合わせの回答一覧を取得' })
  @ApiParam({ name: 'inquiryId', description: '問い合わせID' })
  @ApiQuery({ name: 'includeInternal', required: false, type: Boolean, description: '内部メモを含むか' })
  @ApiResponse({ status: 200, description: '回答一覧取得成功' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '問い合わせが見つかりません' })
  async getResponsesByInquiry(
    @Param('inquiryId', ParseUUIDPipe) inquiryId: string,
    @Query('includeInternal') includeInternal: boolean = false,
    @CurrentUser('userId') userId: string,
  ): Promise<BaseResponseDto<ResponseDto[]>> {
    const responses = await this.responseService.getResponsesByInquiry(
      inquiryId,
      includeInternal,
      userId,
    );
    return {
      success: true,
      data: responses,
      message: '回答一覧を取得しました',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 回答詳細取得
   * 要件: 2.2 - 回答の詳細情報表示
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: '回答詳細を取得' })
  @ApiParam({ name: 'id', description: '回答ID' })
  @ApiResponse({ status: 200, description: '回答詳細取得成功', type: ResponseDetailDto })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '回答が見つかりません' })
  async getResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<BaseResponseDto<ResponseDetailDto>> {
    const response = await this.responseService.getResponse(id, userId);
    return {
      success: true,
      data: response,
      message: '回答詳細を取得しました',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 回答更新
   * 要件: 2.3 - 回答の編集と更新機能
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '回答を更新' })
  @ApiParam({ name: 'id', description: '回答ID' })
  @ApiResponse({ status: 200, description: '回答更新成功', type: ResponseDto })
  @ApiResponse({ status: 400, description: '入力データが無効です' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '回答が見つかりません' })
  @TrackHistory('response', 'update')
  async updateResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateResponseDto: UpdateResponseDto,
    @CurrentUser('userId') userId: string,
  ): Promise<BaseResponseDto<ResponseDto>> {
    const response = await this.responseService.updateResponse(id, updateResponseDto, userId);
    return {
      success: true,
      data: response,
      message: '回答を更新しました',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 回答削除
   * 要件: 管理者のみ回答を削除可能
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.DELETE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '回答を削除' })
  @ApiParam({ name: 'id', description: '回答ID' })
  @ApiResponse({ status: 200, description: '回答削除成功' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '回答が見つかりません' })
  @TrackHistory('response', 'delete')
  async deleteResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<BaseResponseDto<null>> {
    await this.responseService.deleteResponse(id, userId);
    return {
      success: true,
      data: null,
      message: '回答を削除しました',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 回答の送信状態更新
   * 要件: 2.1 - 回答の送信管理
   */
  @Put(':id/send')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '回答を送信' })
  @ApiParam({ name: 'id', description: '回答ID' })
  @ApiResponse({ status: 200, description: '回答送信成功' })
  @ApiResponse({ status: 400, description: '送信できない状態です' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '回答が見つかりません' })
  @TrackHistory('response', 'send')
  async sendResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<BaseResponseDto<ResponseDto>> {
    const response = await this.responseService.sendResponse(id, userId);
    return {
      success: true,
      data: response,
      message: '回答を送信しました',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 回答履歴取得
   * 要件: 2.2 - 回答の変更履歴管理
   */
  @Get(':id/history')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: '回答の変更履歴を取得' })
  @ApiParam({ name: 'id', description: '回答ID' })
  @ApiResponse({ status: 200, description: '変更履歴取得成功' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: '回答が見つかりません' })
  async getResponseHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<BaseResponseDto<ResponseHistoryDto[]>> {
    const history = await this.responseService.getResponseHistory(id, userId);
    return {
      success: true,
      data: history,
      message: '変更履歴を取得しました',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * テンプレートから回答作成
   * 要件: 2.3 - テンプレートを使用した回答作成
   */
  @Post('from-template')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.CREATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'テンプレートから回答を作成' })
  @ApiResponse({ status: 201, description: '回答作成成功', type: ResponseDto })
  @ApiResponse({ status: 400, description: '入力データが無効です' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @ApiResponse({ status: 404, description: 'テンプレートまたは問い合わせが見つかりません' })
  @TrackHistory('response', 'create_from_template')
  async createResponseFromTemplate(
    @Body('inquiryId') inquiryId: string,
    @Body('templateId') templateId: string,
    @Body('variables') variables: Record<string, any>,
    @CurrentUser('userId') userId: string,
  ): Promise<BaseResponseDto<ResponseDto>> {
    const response = await this.responseService.createResponseFromTemplate(
      inquiryId,
      templateId,
      variables,
      userId,
    );
    return {
      success: true,
      data: response,
      message: 'テンプレートから回答を作成しました',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 回答の下書き保存
   * 要件: 2.3 - 下書き機能
   */
  @Post('draft')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.CREATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '回答の下書きを保存' })
  @ApiResponse({ status: 201, description: '下書き保存成功', type: ResponseDto })
  @ApiResponse({ status: 400, description: '入力データが無効です' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  @TrackHistory('response', 'save_draft')
  async saveDraft(
    @Body() createResponseDto: CreateResponseDto,
    @CurrentUser('userId') userId: string,
  ): Promise<BaseResponseDto<ResponseDto>> {
    const response = await this.responseService.saveDraft(createResponseDto, userId);
    return {
      success: true,
      data: response,
      message: '下書きを保存しました',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 下書き一覧取得
   * 要件: 2.3 - 下書き管理機能
   */
  @Get('drafts/user')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.RESPONSE, ActionType.READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ユーザーの下書き一覧を取得' })
  @ApiResponse({ status: 200, description: '下書き一覧取得成功' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  @ApiResponse({ status: 403, description: '権限がありません' })
  async getUserDrafts(
    @CurrentUser('userId') userId: string,
  ): Promise<BaseResponseDto<ResponseDto[]>> {
    const drafts = await this.responseService.getUserDrafts(userId);
    return {
      success: true,
      data: drafts,
      message: '下書き一覧を取得しました',
      timestamp: new Date().toISOString(),
    };
  }
}