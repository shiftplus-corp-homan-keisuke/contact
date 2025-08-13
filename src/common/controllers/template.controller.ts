/**
 * テンプレートコントローラー
 * 要件: 10.1, 10.2, 10.3 (テンプレート管理システム)
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
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
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
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { TemplateService } from '../../modules/templates/services/template.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  SearchTemplateDto,
  UseTemplateDto,
  TemplateSuggestionDto,
  TemplateEffectivenessDto,
  TemplateResponseDto,
  TemplateUsageResultDto,
  TemplateStatisticsDto,
} from '../dto/template.dto';
import { BaseResponseDto } from '../dto/base-response.dto';

@ApiTags('templates')
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * テンプレート作成
   * 要件: 10.1 (テンプレート管理機能)
   */
  @Post()
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'テンプレート作成' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'テンプレートが正常に作成されました',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '入力データが不正です',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '認証が必要です',
  })
  async createTemplate(
    @Body(ValidationPipe) createTemplateDto: CreateTemplateDto,
    @Request() req: any,
  ): Promise<BaseResponseDto<TemplateResponseDto>> {
    const template = await this.templateService.createTemplate(createTemplateDto, req.user.id);
    
    return new BaseResponseDto(template, true, 'テンプレートが正常に作成されました');
  }

  /**
   * テンプレート取得
   */
  @Get(':id')
  @Roles('admin', 'support', 'user', 'viewer')
  @ApiOperation({ summary: 'テンプレート取得' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレート情報',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'テンプレートが見つかりません',
  })
  async getTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<BaseResponseDto<TemplateResponseDto>> {
    const template = await this.templateService.getTemplate(id, req.user.id);
    
    return new BaseResponseDto(template);
  }

  /**
   * テンプレート更新
   * 要件: 10.1 (テンプレート管理機能)
   */
  @Put(':id')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'テンプレート更新' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレートが正常に更新されました',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'テンプレートが見つかりません',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '更新権限がありません',
  })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateTemplateDto: UpdateTemplateDto,
    @Request() req: any,
  ): Promise<BaseResponseDto<TemplateResponseDto>> {
    const template = await this.templateService.updateTemplate(id, updateTemplateDto, req.user.id);
    
    return new BaseResponseDto(template, true, 'テンプレートが正常に更新されました');
  }

  /**
   * テンプレート削除
   * 要件: 10.1 (テンプレート管理機能)
   */
  @Delete(':id')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'テンプレート削除' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレートが正常に削除されました',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'テンプレートが見つかりません',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '削除権限がありません',
  })
  async deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<BaseResponseDto<null>> {
    await this.templateService.deleteTemplate(id, req.user.id);
    
    return new BaseResponseDto(null, true, 'テンプレートが正常に削除されました');
  }

  /**
   * テンプレート検索
   * 要件: 10.1 (テンプレート管理機能)
   */
  @Get()
  @Roles('admin', 'support', 'user', 'viewer')
  @ApiOperation({ summary: 'テンプレート検索' })
  @ApiQuery({ name: 'query', required: false, description: '検索キーワード' })
  @ApiQuery({ name: 'category', required: false, description: 'カテゴリ' })
  @ApiQuery({ name: 'tags', required: false, description: 'タグ（カンマ区切り）' })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  @ApiQuery({ name: 'createdBy', required: false, description: '作成者ID' })
  @ApiQuery({ name: 'isShared', required: false, description: '共有フラグ' })
  @ApiQuery({ name: 'isActive', required: false, description: 'アクティブフラグ' })
  @ApiQuery({ name: 'page', required: false, description: 'ページ番号' })
  @ApiQuery({ name: 'limit', required: false, description: '1ページあたりの件数' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレート検索結果',
  })
  async searchTemplates(
    @Query(ValidationPipe) searchDto: SearchTemplateDto,
    @Request() req: any,
  ): Promise<BaseResponseDto<{
    templates: TemplateResponseDto[];
    total: number;
    page: number;
    limit: number;
  }>> {
    // タグの文字列を配列に変換
    if (searchDto.tags && typeof searchDto.tags === 'string') {
      searchDto.tags = (searchDto.tags as string).split(',').map(tag => tag.trim());
    }

    const result = await this.templateService.searchTemplates(searchDto, req.user.id);
    
    return new BaseResponseDto(result);
  }

  /**
   * テンプレート使用
   * 要件: 10.3 (マクロ・変数置換機能)
   */
  @Post('use')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'テンプレート使用' })
  @ApiBody({ type: UseTemplateDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレート使用結果',
    type: TemplateUsageResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'テンプレートが見つかりません',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '変数の値が不正です',
  })
  async useTemplate(
    @Body(ValidationPipe) useTemplateDto: UseTemplateDto,
    @Request() req: any,
  ): Promise<BaseResponseDto<TemplateUsageResultDto>> {
    const result = await this.templateService.useTemplate(useTemplateDto, req.user.id);
    
    return new BaseResponseDto(result, true, 'テンプレートが正常に処理されました');
  }

  /**
   * テンプレート提案
   * 要件: 10.2 (AI支援テンプレート提案)
   */
  @Post('suggest')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'テンプレート提案' })
  @ApiBody({ type: TemplateSuggestionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレート提案結果',
  })
  async suggestTemplates(
    @Body(ValidationPipe) suggestionDto: TemplateSuggestionDto,
    @Request() req: any,
  ): Promise<BaseResponseDto<any[]>> {
    const suggestions = await this.templateService.suggestTemplates(suggestionDto, req.user.id);
    
    return new BaseResponseDto(suggestions, true, `${suggestions.length}件のテンプレートを提案しました`);
  }

  /**
   * 人気テンプレート取得
   * 要件: 10.2 (使用統計に基づく人気テンプレート表示)
   */
  @Get('popular/list')
  @Roles('admin', 'support', 'user', 'viewer')
  @ApiOperation({ summary: '人気テンプレート取得' })
  @ApiQuery({ name: 'limit', required: false, description: '取得件数' })
  @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
  @ApiQuery({ name: 'category', required: false, description: 'カテゴリ' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '人気テンプレート一覧',
  })
  async getPopularTemplates(
    @Query('limit') limit: number = 10,
    @Query('appId') appId?: string,
    @Query('category') category?: string,
    @Request() req?: any,
  ): Promise<BaseResponseDto<any[]>> {
    const templates = await this.templateService.getPopularTemplates(
      limit || 10,
      appId,
      req?.user?.id,
    );
    
    return new BaseResponseDto(templates);
  }

  /**
   * 個人化テンプレート推奨
   * 要件: 10.2 (AI支援テンプレート提案)
   */
  @Get('recommendations')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: '個人化テンプレート推奨' })
  @ApiQuery({ name: 'limit', required: false, description: '推奨件数' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '個人化テンプレート推奨結果',
  })
  async getPersonalizedRecommendations(
    @Request() req: any,
    @Query('limit') limit?: number,
  ): Promise<BaseResponseDto<any[]>> {
    const recommendations = await this.templateService.getPersonalizedTemplateRecommendations(
      req.user.id,
      limit || 5,
    );
    
    return new BaseResponseDto(recommendations, true, `${recommendations.length}件のテンプレートを推奨しました`);
  }

  /**
   * テンプレート効果測定
   * 要件: 10.2 (テンプレート効果測定機能)
   */
  @Get(':id/effectiveness')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'テンプレート効果測定' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレート効果測定結果',
  })
  async getTemplateEffectiveness(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<BaseResponseDto<any>> {
    const effectiveness = await this.templateService.measureTemplateEffectiveness(id, req.user.id);
    
    return new BaseResponseDto(effectiveness);
  }

  /**
   * テンプレート効果評価
   * 要件: 10.2 (テンプレート効果測定機能)
   */
  @Post('rate')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'テンプレート効果評価' })
  @ApiBody({ type: TemplateEffectivenessDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '評価が正常に記録されました',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '使用履歴が見つかりません',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '評価権限がありません',
  })
  async rateTemplateEffectiveness(
    @Body(ValidationPipe) effectivenessDto: TemplateEffectivenessDto,
    @Request() req: any,
  ): Promise<BaseResponseDto<null>> {
    await this.templateService.rateTemplateEffectiveness(effectivenessDto, req.user.id);
    
    return new BaseResponseDto(null, true, '評価が正常に記録されました');
  }

  /**
   * テンプレート統計取得
   * 要件: 10.3 (テンプレート使用統計)
   */
  @Get(':id/statistics')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'テンプレート統計取得' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレート統計情報',
    type: TemplateStatisticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'テンプレートが見つかりません',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '統計閲覧権限がありません',
  })
  async getTemplateStatistics(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<BaseResponseDto<TemplateStatisticsDto>> {
    const statistics = await this.templateService.getTemplateStatistics(id, req.user.id);
    
    return new BaseResponseDto(statistics);
  }

  /**
   * マクロ展開
   * 要件: 10.3 (マクロ機能の実装)
   */
  @Post('macro/expand')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'マクロ展開' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        macroName: { type: 'string', description: 'マクロ名' },
        parameters: { type: 'array', items: { type: 'string' }, description: 'パラメータ配列' },
        context: { type: 'object', description: 'コンテキスト情報' },
      },
      required: ['macroName', 'parameters'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'マクロ展開結果',
  })
  async expandMacro(
    @Body() body: { macroName: string; parameters: any[]; context?: any },
    @Request() req: any,
  ): Promise<BaseResponseDto<any>> {
    const result = await this.templateService.expandMacro(
      body.macroName,
      body.parameters,
      body.context || {},
      req.user.id,
    );
    
    return new BaseResponseDto(result, true, 'マクロが正常に展開されました');
  }

  /**
   * テンプレート変数一覧取得
   * 要件: 10.3 (動的コンテンツ生成のための変数システム)
   */
  @Get(':id/variables')
  @Roles('admin', 'support', 'user', 'viewer')
  @ApiOperation({ summary: 'テンプレート変数一覧取得' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレート変数一覧',
  })
  async getTemplateVariables(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<BaseResponseDto<any[]>> {
    const template = await this.templateService.getTemplate(id, req.user.id);
    
    return new BaseResponseDto(template.variables);
  }

  /**
   * テンプレートプレビュー
   * 要件: 10.3 (マクロ・変数置換機能)
   */
  @Post(':id/preview')
  @Roles('admin', 'support', 'user')
  @ApiOperation({ summary: 'テンプレートプレビュー' })
  @ApiParam({ name: 'id', description: 'テンプレートID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        variables: { type: 'object', description: '変数値' },
        context: { type: 'object', description: 'コンテキスト情報' },
      },
      required: ['variables'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'テンプレートプレビュー結果',
  })
  async previewTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { variables: Record<string, any>; context?: any },
    @Request() req: any,
  ): Promise<BaseResponseDto<any>> {
    // プレビューのため実際の使用履歴は記録しない
    const useDto = {
      templateId: id,
      variables: body.variables,
      context: body.context,
    };

    const result = await this.templateService.useTemplate(useDto, req.user.id);
    
    return new BaseResponseDto({
      content: result.content,
      variables: result.variables,
      errors: result.errors,
      isPreview: true,
    }, true, 'プレビューが生成されました');
  }
}