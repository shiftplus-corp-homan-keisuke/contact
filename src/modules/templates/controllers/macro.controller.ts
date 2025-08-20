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
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { TemplateMacroService } from '../services/template-macro.service';
import {
    CreateMacroDto,
    UpdateMacroDto,
    ExecuteMacroDto,
    MacroResponseDto,
    MacroExecutionResultDto,
    MacroUsageStatsDto,
} from '../dto/macro.dto';

/**
 * マクロ管理コントローラー
 */
@ApiTags('マクロ管理')
@ApiBearerAuth()
@Controller('macros')
@UseGuards(/* JwtAuthGuard */) // 認証ガードを適用
export class MacroController {
    constructor(private readonly macroService: TemplateMacroService) { }

    /**
     * マクロを作成
     */
    @Post()
    @ApiOperation({ summary: 'マクロを作成' })
    @ApiResponse({
        status: 201,
        description: 'マクロが正常に作成されました',
        type: MacroResponseDto,
    })
    @ApiResponse({ status: 400, description: '不正なリクエスト' })
    @ApiResponse({ status: 401, description: '認証が必要です' })
    async createMacro(
        @Body() createMacroDto: CreateMacroDto,
        @Request() req: any,
    ): Promise<MacroResponseDto> {
        const userId = req.user.id;

        const macro = await this.macroService.createMacro(
            createMacroDto.name,
            createMacroDto.content,
            createMacroDto.variables,
            userId,
            createMacroDto.description,
            createMacroDto.isShared,
        );

        return this.mapToResponseDto(macro);
    }

    /**
     * ユーザーのマクロ一覧を取得
     */
    @Get()
    @ApiOperation({ summary: 'ユーザーのマクロ一覧を取得' })
    @ApiResponse({
        status: 200,
        description: 'マクロ一覧が正常に取得されました',
        type: [MacroResponseDto],
    })
    @ApiResponse({ status: 401, description: '認証が必要です' })
    async getUserMacros(@Request() req: any): Promise<MacroResponseDto[]> {
        const userId = req.user.id;
        const macros = await this.macroService.getUserMacros(userId);

        return macros.map(macro => this.mapToResponseDto(macro));
    }

    /**
     * 人気のマクロを取得
     */
    @Get('popular')
    @ApiOperation({ summary: '人気のマクロを取得' })
    @ApiQuery({ name: 'limit', required: false, description: '取得件数', example: 10 })
    @ApiResponse({
        status: 200,
        description: '人気のマクロが正常に取得されました',
        type: [MacroResponseDto],
    })
    async getPopularMacros(
        @Query('limit') limit?: number,
    ): Promise<MacroResponseDto[]> {
        const macros = await this.macroService.getPopularMacros(limit);

        return macros.map(macro => this.mapToResponseDto(macro));
    }

    /**
     * マクロの詳細を取得
     */
    @Get(':id')
    @ApiOperation({ summary: 'マクロの詳細を取得' })
    @ApiParam({ name: 'id', description: 'マクロID' })
    @ApiResponse({
        status: 200,
        description: 'マクロの詳細が正常に取得されました',
        type: MacroResponseDto,
    })
    @ApiResponse({ status: 404, description: 'マクロが見つかりません' })
    @ApiResponse({ status: 403, description: 'アクセス権限がありません' })
    async getMacroById(
        @Param('id') id: string,
        @Request() req: any,
    ): Promise<MacroResponseDto> {
        const userId = req.user.id;
        const macro = await this.macroService.getMacroById(id, userId);

        return this.mapToResponseDto(macro);
    }

    /**
     * マクロを更新
     */
    @Put(':id')
    @ApiOperation({ summary: 'マクロを更新' })
    @ApiParam({ name: 'id', description: 'マクロID' })
    @ApiResponse({
        status: 200,
        description: 'マクロが正常に更新されました',
        type: MacroResponseDto,
    })
    @ApiResponse({ status: 404, description: 'マクロが見つかりません' })
    @ApiResponse({ status: 403, description: '更新権限がありません' })
    async updateMacro(
        @Param('id') id: string,
        @Body() updateMacroDto: UpdateMacroDto,
        @Request() req: any,
    ): Promise<MacroResponseDto> {
        const userId = req.user.id;
        const macro = await this.macroService.updateMacro(id, userId, updateMacroDto);

        return this.mapToResponseDto(macro);
    }

    /**
     * マクロを削除
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'マクロを削除' })
    @ApiParam({ name: 'id', description: 'マクロID' })
    @ApiResponse({ status: 204, description: 'マクロが正常に削除されました' })
    @ApiResponse({ status: 404, description: 'マクロが見つかりません' })
    @ApiResponse({ status: 403, description: '削除権限がありません' })
    async deleteMacro(
        @Param('id') id: string,
        @Request() req: any,
    ): Promise<void> {
        const userId = req.user.id;
        await this.macroService.deleteMacro(id, userId);
    }

    /**
     * マクロを実行
     */
    @Post(':id/execute')
    @ApiOperation({ summary: 'マクロを実行' })
    @ApiParam({ name: 'id', description: 'マクロID' })
    @ApiResponse({
        status: 200,
        description: 'マクロが正常に実行されました',
        type: MacroExecutionResultDto,
    })
    @ApiResponse({ status: 404, description: 'マクロが見つかりません' })
    @ApiResponse({ status: 403, description: 'アクセス権限がありません' })
    async executeMacro(
        @Param('id') id: string,
        @Body() executeMacroDto: ExecuteMacroDto,
        @Request() req: any,
    ): Promise<MacroExecutionResultDto> {
        const userId = req.user.id;
        const expandedContent = await this.macroService.executeMacro(
            id,
            userId,
            executeMacroDto.variableValues,
        );

        return {
            expandedContent,
            variableValues: executeMacroDto.variableValues,
        };
    }

    /**
     * マクロの使用統計を取得
     */
    @Get(':id/stats')
    @ApiOperation({ summary: 'マクロの使用統計を取得' })
    @ApiParam({ name: 'id', description: 'マクロID' })
    @ApiResponse({
        status: 200,
        description: 'マクロの使用統計が正常に取得されました',
        type: MacroUsageStatsDto,
    })
    @ApiResponse({ status: 404, description: 'マクロが見つかりません' })
    @ApiResponse({ status: 403, description: 'アクセス権限がありません' })
    async getMacroUsageStats(
        @Param('id') id: string,
        @Request() req: any,
    ): Promise<MacroUsageStatsDto> {
        const userId = req.user.id;
        const stats = await this.macroService.getMacroUsageStats(id, userId);

        return {
            totalUsage: stats.totalUsage,
            recentUsage: stats.recentUsage.map(usage => ({
                id: usage.id,
                expandedVariables: usage.expandedVariables,
                expandedContent: usage.expandedContent,
                usedAt: usage.usedAt,
                user: {
                    id: usage.user.id,
                    name: usage.user.name || 'Unknown',
                },
            })),
        };
    }

    /**
     * エンティティをレスポンスDTOにマッピング
     */
    private mapToResponseDto(macro: any): MacroResponseDto {
        return {
            id: macro.id,
            name: macro.name,
            content: macro.content,
            variables: macro.variables,
            description: macro.description,
            isShared: macro.isShared,
            usageCount: macro.usageCount,
            createdBy: macro.createdBy,
            createdAt: macro.createdAt,
            updatedAt: macro.updatedAt,
        };
    }
}