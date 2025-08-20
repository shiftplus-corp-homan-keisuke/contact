import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template, TemplateUsage } from '../entities';
import { TemplatesRepository } from '../repositories';
import { TemplateSuggestion } from '../types';
import { SearchService } from '../../search/services';

/**
 * テンプレート提案サービス
 * 問い合わせ内容に基づくテンプレート提案とAI支援機能を提供
 */
@Injectable()
export class TemplateSuggestionService {
    private readonly logger = new Logger(TemplateSuggestionService.name);

    constructor(
        private readonly templatesRepository: TemplatesRepository,
        private readonly searchService: SearchService,
        @InjectRepository(TemplateUsage)
        private readonly usageRepository: Repository<TemplateUsage>,
    ) { }

    /**
     * 問い合わせ内容に基づくテンプレート提案
     */
    async suggestTemplates(
        inquiryContent: string,
        userId: string,
        limit: number = 5,
    ): Promise<TemplateSuggestion[]> {
        try {
            // 1. ベクトル検索による類似テンプレート検索
            const vectorSuggestions = await this.getVectorBasedSuggestions(
                inquiryContent,
                userId,
                limit,
            );

            // 2. キーワードベースの検索
            const keywordSuggestions = await this.getKeywordBasedSuggestions(
                inquiryContent,
                userId,
                limit,
            );

            // 3. 使用統計に基づく提案
            const popularSuggestions = await this.getPopularTemplateSuggestions(
                userId,
                Math.ceil(limit / 2),
            );

            // 4. 結果をマージして重複を除去
            const allSuggestions = [
                ...vectorSuggestions,
                ...keywordSuggestions,
                ...popularSuggestions,
            ];

            // 重複除去とスコア順ソート
            const uniqueSuggestions = this.deduplicateAndSort(allSuggestions);

            return uniqueSuggestions.slice(0, limit);
        } catch (error) {
            this.logger.error('テンプレート提案の取得に失敗しました', error);
            // フォールバック: 人気テンプレートを返す
            return await this.getPopularTemplateSuggestions(userId, limit);
        }
    }

    /**
     * ベクトル検索による類似テンプレート提案
     */
    private async getVectorBasedSuggestions(
        inquiryContent: string,
        userId: string,
        limit: number,
    ): Promise<TemplateSuggestion[]> {
        try {
            // 問い合わせ内容をベクトル化
            const queryVector = await this.searchService.embedText(inquiryContent);

            // ベクトル検索でテンプレートを検索
            const searchResults = await this.searchService.vectorSearch(
                queryVector,
                limit * 2, // 多めに取得してフィルタリング
            );

            const suggestions: TemplateSuggestion[] = [];

            for (const result of searchResults) {
                // テンプレートIDからテンプレート情報を取得
                const template = await this.templatesRepository.findById(result.id);

                if (template && this.canUserAccessTemplate(template, userId)) {
                    suggestions.push({
                        template,
                        score: result.vectorScore,
                        reason: `類似度: ${(result.vectorScore * 100).toFixed(1)}%`,
                    });
                }
            }

            return suggestions;
        } catch (error) {
            this.logger.warn('ベクトル検索による提案の取得に失敗しました', error);
            return [];
        }
    }

    /**
     * キーワードベースのテンプレート提案
     */
    private async getKeywordBasedSuggestions(
        inquiryContent: string,
        userId: string,
        limit: number,
    ): Promise<TemplateSuggestion[]> {
        try {
            // キーワード抽出（簡易実装）
            const keywords = this.extractKeywords(inquiryContent);

            if (keywords.length === 0) {
                return [];
            }

            // キーワードでテンプレートを検索
            const searchResults = await this.templatesRepository.findWithFilters(
                { searchQuery: keywords.join(' ') },
                1,
                limit * 2,
            );

            const suggestions: TemplateSuggestion[] = [];

            for (const template of searchResults.items) {
                if (this.canUserAccessTemplate(template, userId)) {
                    // キーワードマッチ度を計算
                    const matchScore = this.calculateKeywordMatchScore(
                        template.content + ' ' + template.name,
                        keywords,
                    );

                    if (matchScore > 0) {
                        suggestions.push({
                            template,
                            score: matchScore,
                            reason: `キーワードマッチ: ${keywords.slice(0, 3).join(', ')}`,
                        });
                    }
                }
            }

            return suggestions.sort((a, b) => b.score - a.score);
        } catch (error) {
            this.logger.warn('キーワード検索による提案の取得に失敗しました', error);
            return [];
        }
    }

    /**
     * 人気テンプレートに基づく提案
     */
    private async getPopularTemplateSuggestions(
        userId: string,
        limit: number,
    ): Promise<TemplateSuggestion[]> {
        try {
            // ユーザーの使用履歴に基づく人気テンプレート
            const userPopularTemplates = await this.getUserPopularTemplates(userId, limit);

            // 全体の人気テンプレート
            const globalPopularTemplates = await this.templatesRepository.getPopularTemplates(limit);

            const suggestions: TemplateSuggestion[] = [];

            // ユーザー固有の人気テンプレート
            for (const template of userPopularTemplates) {
                suggestions.push({
                    template,
                    score: 0.8, // 固定スコア
                    reason: 'よく使用するテンプレート',
                });
            }

            // 全体の人気テンプレート（重複除去）
            for (const template of globalPopularTemplates) {
                if (
                    this.canUserAccessTemplate(template, userId) &&
                    !suggestions.some(s => s.template.id === template.id)
                ) {
                    suggestions.push({
                        template,
                        score: 0.6, // 固定スコア
                        reason: '人気のテンプレート',
                    });
                }
            }

            return suggestions.slice(0, limit);
        } catch (error) {
            this.logger.warn('人気テンプレートの取得に失敗しました', error);
            return [];
        }
    }

    /**
     * ユーザーの人気テンプレートを取得
     */
    private async getUserPopularTemplates(
        userId: string,
        limit: number,
    ): Promise<Template[]> {
        const usageStats = await this.usageRepository
            .createQueryBuilder('usage')
            .leftJoinAndSelect('usage.template', 'template')
            .leftJoinAndSelect('template.variables', 'variables')
            .where('usage.userId = :userId', { userId })
            .groupBy('usage.templateId, template.id, variables.id')
            .orderBy('COUNT(usage.id)', 'DESC')
            .limit(limit)
            .getMany();

        return usageStats.map(usage => usage.template).filter(Boolean);
    }

    /**
     * キーワード抽出（簡易実装）
     */
    private extractKeywords(text: string): string[] {
        // 日本語の場合の簡易キーワード抽出
        const stopWords = new Set([
            'の', 'に', 'は', 'を', 'が', 'で', 'と', 'から', 'まで', 'より',
            'について', 'において', 'に関して', 'について', 'です', 'である',
            'します', 'しました', 'できます', 'できません', 'お願い', 'ください',
        ]);

        // 単語を抽出（簡易的な分割）
        const words = text
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 1 && !stopWords.has(word))
            .slice(0, 10); // 最大10個のキーワード

        return [...new Set(words)]; // 重複除去
    }

    /**
     * キーワードマッチスコアを計算
     */
    private calculateKeywordMatchScore(text: string, keywords: string[]): number {
        const lowerText = text.toLowerCase();
        let matchCount = 0;

        for (const keyword of keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                matchCount++;
            }
        }

        return keywords.length > 0 ? matchCount / keywords.length : 0;
    }

    /**
     * ユーザーがテンプレートにアクセス可能かチェック
     */
    private canUserAccessTemplate(template: Template, userId: string): boolean {
        return template.isShared || template.createdBy === userId;
    }

    /**
     * 提案結果の重複除去とソート
     */
    private deduplicateAndSort(suggestions: TemplateSuggestion[]): TemplateSuggestion[] {
        const uniqueMap = new Map<string, TemplateSuggestion>();

        for (const suggestion of suggestions) {
            const existing = uniqueMap.get(suggestion.template.id);

            if (!existing || suggestion.score > existing.score) {
                uniqueMap.set(suggestion.template.id, suggestion);
            }
        }

        return Array.from(uniqueMap.values()).sort((a, b) => b.score - a.score);
    }

    /**
     * テンプレート効果測定
     */
    async measureTemplateEffectiveness(
        templateId: string,
        period: { start: Date; end: Date },
    ): Promise<{
        usageCount: number;
        averageRating: number;
        satisfactionRate: number;
        responseTimeImprovement: number;
    }> {
        try {
            // 期間内の使用統計を取得
            const usageStats = await this.usageRepository
                .createQueryBuilder('usage')
                .where('usage.templateId = :templateId', { templateId })
                .andWhere('usage.usedAt BETWEEN :start AND :end', {
                    start: period.start,
                    end: period.end,
                })
                .getMany();

            const usageCount = usageStats.length;

            // 評価の平均を計算
            const ratingsWithValue = usageStats.filter(usage => usage.rating !== null);
            const averageRating = ratingsWithValue.length > 0
                ? ratingsWithValue.reduce((sum, usage) => sum + usage.rating, 0) / ratingsWithValue.length
                : 0;

            // 満足度（評価4以上の割合）
            const satisfiedCount = ratingsWithValue.filter(usage => usage.rating >= 4).length;
            const satisfactionRate = ratingsWithValue.length > 0
                ? satisfiedCount / ratingsWithValue.length
                : 0;

            // 応答時間改善（簡易実装 - 実際には問い合わせ対応時間との比較が必要）
            const responseTimeImprovement = 0.15; // 15%改善と仮定

            return {
                usageCount,
                averageRating,
                satisfactionRate,
                responseTimeImprovement,
            };
        } catch (error) {
            this.logger.error('テンプレート効果測定に失敗しました', error);
            return {
                usageCount: 0,
                averageRating: 0,
                satisfactionRate: 0,
                responseTimeImprovement: 0,
            };
        }
    }

    /**
     * カテゴリ別テンプレート提案
     */
    async suggestTemplatesByCategory(
        category: string,
        userId: string,
        limit: number = 5,
    ): Promise<TemplateSuggestion[]> {
        try {
            const templates = await this.templatesRepository.findWithFilters(
                { category },
                1,
                limit * 2,
            );

            const suggestions: TemplateSuggestion[] = [];

            for (const template of templates.items) {
                if (this.canUserAccessTemplate(template, userId)) {
                    // 使用頻度に基づくスコア
                    const usageScore = Math.min(template.usageCount / 100, 1);

                    suggestions.push({
                        template,
                        score: usageScore,
                        reason: `${category}カテゴリの推奨テンプレート`,
                    });
                }
            }

            return suggestions
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        } catch (error) {
            this.logger.error('カテゴリ別テンプレート提案に失敗しました', error);
            return [];
        }
    }
}