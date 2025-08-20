import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
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
    ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards';
import { TemplateSuggestionService } from '../services/template-suggestion.service';
import { TemplateSuggestion } from '../types';

/**
 * テンプレート提案コントローラー
 * AI支援によるテンプレート提案機能を提供
 */
@ApiTags('template-suggestions')
@Controller('templates/suggestions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplateSuggestionController {
    constructor(
        private readonly templateSuggestionService: TemplateSuggestionService,
    ) { }

    /**
     * 問い合わせ内容に基づくテンプレート提案
     */
    @Post('by-content')
    @ApiOperation({ summary: '問い合わせ内容に基づくテンプレート提案' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                content: {
                    type: 'string',
                    description: '問い合わせ内容',
                    example: 'パスワードを忘れてしまいました。リセット方法を教えてください。',
                },
                limit: {
                    type: 'number',
                    description: '提案数の上限',
                    default: 5,
                },
            },
            required: ['content'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'テンプレート提案を取得しました',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    template: { $ref: '#/components/schemas/Template' },
                    score: { type: 'number', description: '提案スコア' },
                    reason: { type: 'string', description: '提案理由' },
                },
            },
        },
    })
    async suggestTemplatesByContent(
        @Body() body: { content: string; limit?: number },
        @Request() req: any,
    ): Promise<TemplateSuggestion[]> {
        return await this.templateSuggestionService.suggestTemplates(
            body.content,
            req.user.id,
            body.limit || 5,
        );
    }

    /**
     * カテゴリ別テンプレート提案
     */
    @Get('by-category/:category')
    @ApiOperation({ summary: 'カテゴリ別テンプレート提案' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: 'カテゴリ別テンプレート提案を取得しました',
    })
    async suggestTemplatesByCategory(
        @Param('category') category: string,
        @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
        @Request() req: any,
    ): Promise<TemplateSuggestion[]> {
        return await this.templateSuggestionService.suggestTemplatesByCategory(
            category,
            req.user.id,
            limit,
        );
    }

    /**
     * テンプレート効果測定
     */
    @Get(':id/effectiveness')
    @ApiOperation({ summary: 'テンプレート効果測定' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    @ApiResponse({
        status: 200,
        description: 'テンプレート効果測定結果を取得しました',
        schema: {
            type: 'object',
            properties: {
                usageCount: { type: 'number', description: '使用回数' },
                averageRating: { type: 'number', description: '平均評価' },
                satisfactionRate: { type: 'number', description: '満足度' },
                responseTimeImprovement: { type: 'number', description: '応答時間改善率' },
            },
        },
    })
    async measureTemplateEffectiveness(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const period = {
            start: new Date(startDate),
            end: new Date(endDate),
        };

        return await this.templateSuggestionService.measureTemplateEffectiveness(
            id,
            period,
        );
    }

    /**
     * 問い合わせに最適なテンプレート提案（統合API）
     */
    @Post('for-inquiry')
    @ApiOperation({ summary: '問い合わせに最適なテンプレート提案' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                inquiryId: {
                    type: 'string',
                    description: '問い合わせID',
                },
                content: {
                    type: 'string',
                    description: '問い合わせ内容',
                },
                category: {
                    type: 'string',
                    description: '問い合わせカテゴリ',
                },
                limit: {
                    type: 'number',
                    description: '提案数の上限',
                    default: 5,
                },
            },
            required: ['content'],
        },
    })
    @ApiResponse({
        status: 200,
        description: '問い合わせに最適なテンプレート提案を取得しました',
    })
    async suggestTemplatesForInquiry(
        @Body() body: {
            inquiryId?: string;
            content: string;
            category?: string;
            limit?: number;
        },
        @Request() req: any,
    ): Promise<{
        contentBasedSuggestions: TemplateSuggestion[];
        categoryBasedSuggestions: TemplateSuggestion[];
        combinedSuggestions: TemplateSuggestion[];
    }> {
        const limit = body.limit || 5;

        // 内容ベースの提案
        const contentBasedSuggestions = await this.templateSuggestionService.suggestTemplates(
            body.content,
            req.user.id,
            limit,
        );

        // カテゴリベースの提案
        const categoryBasedSuggestions = body.category
            ? await this.templateSuggestionService.suggestTemplatesByCategory(
                body.category,
                req.user.id,
                limit,
            )
            : [];

        // 統合提案（重複除去済み）
        const allSuggestions = [...contentBasedSuggestions, ...categoryBasedSuggestions];
        const uniqueMap = new Map<string, TemplateSuggestion>();

        for (const suggestion of allSuggestions) {
            const existing = uniqueMap.get(suggestion.template.id);
            if (!existing || suggestion.score > existing.score) {
                uniqueMap.set(suggestion.template.id, suggestion);
            }
        }

        const combinedSuggestions = Array.from(uniqueMap.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return {
            contentBasedSuggestions,
            categoryBasedSuggestions,
            combinedSuggestions,
        };
    }
}