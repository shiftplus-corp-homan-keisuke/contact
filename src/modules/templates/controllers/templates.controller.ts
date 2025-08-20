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
    ParseUUIDPipe,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards';
import { TemplatesService } from '../services';
import {
    CreateTemplateDto,
    UpdateTemplateDto,
    TemplateFiltersDto,
} from '../dto';
import { Template } from '../entities';
import { PaginatedResult } from '../../../common/types';

/**
 * テンプレート管理コントローラー
 * テンプレートのCRUD操作とフィルタリング機能を提供
 */
@ApiTags('templates')
@Controller('templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplatesController {
    constructor(private readonly templatesService: TemplatesService) { }

    /**
     * テンプレート作成
     */
    @Post()
    @ApiOperation({ summary: 'テンプレート作成' })
    @ApiResponse({
        status: 201,
        description: 'テンプレートが正常に作成されました',
        type: Template,
    })
    async createTemplate(
        @Body() createTemplateDto: CreateTemplateDto,
        @Request() req: any,
    ): Promise<Template> {
        // DTOをCreateTemplateRequestに変換
        const createRequest = {
            name: createTemplateDto.name,
            category: createTemplateDto.category,
            content: createTemplateDto.content,
            variables: createTemplateDto.variables?.map(v => ({
                id: '', // 新規作成時は空文字
                name: v.name,
                type: v.type,
                description: v.description,
                defaultValue: v.defaultValue,
                required: v.required,
                options: v.options,
            })),
            tags: createTemplateDto.tags,
            isShared: createTemplateDto.isShared,
        };

        return await this.templatesService.createTemplate(
            createRequest,
            req.user.id,
        );
    }

    /**
     * テンプレート一覧取得
     */
    @Get()
    @ApiOperation({ summary: 'テンプレート一覧取得' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: 'テンプレート一覧を取得しました',
    })
    async getTemplates(
        @Query() filters: TemplateFiltersDto,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Request() req: any,
    ): Promise<PaginatedResult<Template>> {
        return await this.templatesService.getTemplates(
            filters,
            page,
            limit,
            req.user.id,
        );
    }

    /**
     * テンプレート詳細取得
     */
    @Get(':id')
    @ApiOperation({ summary: 'テンプレート詳細取得' })
    @ApiResponse({
        status: 200,
        description: 'テンプレート詳細を取得しました',
        type: Template,
    })
    async getTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
    ): Promise<Template> {
        return await this.templatesService.getTemplate(id, req.user.id);
    }

    /**
     * テンプレート更新
     */
    @Put(':id')
    @ApiOperation({ summary: 'テンプレート更新' })
    @ApiResponse({
        status: 200,
        description: 'テンプレートが正常に更新されました',
        type: Template,
    })
    async updateTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateTemplateDto: UpdateTemplateDto,
        @Request() req: any,
    ): Promise<Template> {
        // DTOをUpdateTemplateRequestに変換
        const updateRequest = {
            name: updateTemplateDto.name,
            category: updateTemplateDto.category,
            content: updateTemplateDto.content,
            variables: updateTemplateDto.variables?.map(v => ({
                id: '', // 更新時は空文字（サービス側で処理）
                name: v.name,
                type: v.type,
                description: v.description,
                defaultValue: v.defaultValue,
                required: v.required,
                options: v.options,
            })),
            tags: updateTemplateDto.tags,
            isShared: updateTemplateDto.isShared,
        };

        return await this.templatesService.updateTemplate(
            id,
            updateRequest,
            req.user.id,
        );
    }

    /**
     * テンプレート削除
     */
    @Delete(':id')
    @ApiOperation({ summary: 'テンプレート削除' })
    @ApiResponse({
        status: 200,
        description: 'テンプレートが正常に削除されました',
    })
    async deleteTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
    ): Promise<{ message: string }> {
        await this.templatesService.deleteTemplate(id, req.user.id);
        return { message: 'テンプレートが削除されました' };
    }

    /**
     * カテゴリ別テンプレート取得
     */
    @Get('category/:category')
    @ApiOperation({ summary: 'カテゴリ別テンプレート取得' })
    @ApiResponse({
        status: 200,
        description: 'カテゴリ別テンプレートを取得しました',
        type: [Template],
    })
    async getTemplatesByCategory(
        @Param('category') category: string,
        @Request() req: any,
    ): Promise<Template[]> {
        return await this.templatesService.getTemplatesByCategory(
            category,
            req.user.id,
        );
    }

    /**
     * 人気テンプレート取得
     */
    @Get('popular/list')
    @ApiOperation({ summary: '人気テンプレート取得' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: '人気テンプレートを取得しました',
        type: [Template],
    })
    async getPopularTemplates(
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Request() req: any,
    ): Promise<Template[]> {
        return await this.templatesService.getPopularTemplates(req.user.id, limit);
    }

    /**
     * ユーザーテンプレート取得
     */
    @Get('user/my-templates')
    @ApiOperation({ summary: 'マイテンプレート取得' })
    @ApiQuery({ name: 'includeShared', required: false, type: Boolean })
    @ApiResponse({
        status: 200,
        description: 'ユーザーのテンプレートを取得しました',
        type: [Template],
    })
    async getUserTemplates(
        @Query('includeShared', new DefaultValuePipe(true)) includeShared: boolean,
        @Request() req: any,
    ): Promise<Template[]> {
        return await this.templatesService.getUserTemplates(
            req.user.id,
            includeShared,
        );
    }

    /**
     * テンプレート使用記録
     */
    @Post(':id/usage')
    @ApiOperation({ summary: 'テンプレート使用記録' })
    @ApiResponse({
        status: 201,
        description: 'テンプレート使用が記録されました',
    })
    async recordTemplateUsage(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() usageData: {
            inquiryId?: string;
            rating?: number;
            feedback?: string;
            usedVariables?: Record<string, string>;
            usedMacros?: string[];
            expandedContent?: string;
        },
        @Request() req: any,
    ): Promise<{ message: string }> {
        await this.templatesService.recordTemplateUsage(
            id,
            req.user.id,
            usageData.inquiryId,
            usageData.rating,
            usageData.feedback,
            usageData.usedVariables,
            usageData.usedMacros,
            usageData.expandedContent,
        );
        return { message: 'テンプレート使用が記録されました' };
    }

    /**
     * マクロ使用込みテンプレート使用記録
     */
    @Post(':id/usage-with-macros')
    @ApiOperation({ summary: 'マクロ使用込みテンプレート使用記録' })
    @ApiResponse({
        status: 201,
        description: 'テンプレート使用が記録され、展開されたコンテンツが返されました',
    })
    async recordTemplateUsageWithMacros(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() usageData: {
            variableValues?: Record<string, string>;
            macroVariables?: Record<string, Record<string, string>>;
            inquiryId?: string;
            rating?: number;
            feedback?: string;
        },
        @Request() req: any,
    ): Promise<{ expandedContent: string; message: string }> {
        const expandedContent = await this.templatesService.recordTemplateUsageWithMacros(
            id,
            req.user.id,
            usageData.variableValues || {},
            usageData.macroVariables || {},
            usageData.inquiryId,
            usageData.rating,
            usageData.feedback,
        );

        return {
            expandedContent,
            message: 'テンプレート使用が記録されました',
        };
    }

    /**
     * テンプレート使用統計取得
     */
    @Get(':id/stats')
    @ApiOperation({ summary: 'テンプレート使用統計取得' })
    @ApiResponse({
        status: 200,
        description: 'テンプレート使用統計を取得しました',
    })
    async getTemplateUsageStats(
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return await this.templatesService.getTemplateUsageStats(id);
    }

    /**
     * テンプレート共有設定
     */
    @Put(':id/share')
    @ApiOperation({ summary: 'テンプレート共有設定' })
    @ApiResponse({
        status: 200,
        description: 'テンプレート共有設定が更新されました',
        type: Template,
    })
    async shareTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() shareData: { isShared: boolean },
        @Request() req: any,
    ): Promise<Template> {
        return await this.templatesService.shareTemplate(
            id,
            req.user.id,
            shareData.isShared,
        );
    }

    /**
     * テンプレート内のマクロ検出
     */
    @Get(':id/macros')
    @ApiOperation({ summary: 'テンプレート内のマクロ検出' })
    @ApiResponse({
        status: 200,
        description: 'テンプレート内のマクロ情報を取得しました',
    })
    async detectMacrosInTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
    ) {
        return await this.templatesService.detectMacrosInTemplate(id, req.user.id);
    }

    /**
     * テンプレートプレビュー（マクロ展開込み）
     */
    @Post(':id/preview')
    @ApiOperation({ summary: 'テンプレートプレビュー' })
    @ApiResponse({
        status: 200,
        description: 'テンプレートプレビューを生成しました',
    })
    async previewTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() previewData: {
            variableValues?: Record<string, string>;
            macroVariables?: Record<string, Record<string, string>>;
        },
        @Request() req: any,
    ) {
        return await this.templatesService.previewTemplate(
            id,
            req.user.id,
            previewData.variableValues || {},
            previewData.macroVariables || {},
        );
    }

    /**
     * テンプレート展開（マクロ込み）
     */
    @Post(':id/expand')
    @ApiOperation({ summary: 'テンプレート展開' })
    @ApiResponse({
        status: 200,
        description: 'テンプレートが展開されました',
    })
    async expandTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() expandData: {
            variableValues?: Record<string, string>;
            macroVariables?: Record<string, Record<string, string>>;
        },
        @Request() req: any,
    ): Promise<{ expandedContent: string }> {
        const expandedContent = await this.templatesService.expandTemplateWithMacros(
            id,
            req.user.id,
            expandData.variableValues || {},
            expandData.macroVariables || {},
        );

        return { expandedContent };
    }
}