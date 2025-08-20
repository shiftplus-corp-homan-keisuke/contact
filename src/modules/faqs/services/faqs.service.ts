import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FAQsRepository } from '../repositories';
import { CreateFAQDto, UpdateFAQDto } from '../dto';
import { FAQ } from '../entities';
import { FAQFilters, FAQAnalytics, FAQGenerationOptions, FAQCluster } from '../types';
import { FAQClusteringService } from './faq-clustering.service';
import { FAQSiteService } from './faq-site.service';

@Injectable()
export class FAQsService {
    constructor(
        private readonly faqsRepository: FAQsRepository,
        private readonly faqClusteringService: FAQClusteringService,
        private readonly faqSiteService: FAQSiteService,
    ) { }

    /**
     * FAQ作成
     */
    async createFAQ(createFAQDto: CreateFAQDto): Promise<FAQ> {
        try {
            const createdFAQ = await this.faqsRepository.create(createFAQDto);

            // FAQ作成時の自動サイト反映（公開状態の場合）
            if (createdFAQ.isPublished) {
                await this.faqSiteService.handleFAQUpdate(createdFAQ.appId);
            }

            return createdFAQ;
        } catch (error) {
            throw new BadRequestException('FAQ作成に失敗しました');
        }
    }

    /**
     * FAQ取得（ID指定）
     */
    async getFAQById(id: string): Promise<FAQ> {
        const faq = await this.faqsRepository.findById(id);
        if (!faq) {
            throw new NotFoundException('指定されたFAQが見つかりません');
        }
        return faq;
    }

    /**
     * アプリ別FAQ取得
     */
    async getFAQsByApp(appId: string, filters?: FAQFilters): Promise<FAQ[]> {
        return this.faqsRepository.findByAppId(appId, filters);
    }

    /**
     * アプリ別FAQ取得（ページネーション付き）
     * 要件7.2: FAQ取得APIの実装
     */
    async getFAQsByAppWithPagination(
        appId: string,
        filters: FAQFilters & { page: number; limit: number }
    ): Promise<{
        items: FAQ[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const { page, limit, ...searchFilters } = filters;
        const offset = (page - 1) * limit;

        const [items, total] = await Promise.all([
            this.faqsRepository.findByAppId(appId, {
                ...searchFilters,
                offset,
                limit,
            }),
            this.faqsRepository.countByAppId(appId, searchFilters),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            items,
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        };
    }

    /**
     * 公開済みFAQ詳細取得
     * 要件7.2: FAQ取得APIの実装
     */
    async getPublishedFAQById(id: string): Promise<FAQ> {
        const faq = await this.faqsRepository.findById(id);
        if (!faq || !faq.isPublished) {
            throw new NotFoundException('指定されたFAQが見つからないか、非公開です');
        }
        return faq;
    }

    /**
     * 公開済みFAQ検索
     * 要件7.2: FAQ検索・フィルタリング機能
     */
    async searchPublishedFAQs(
        appId: string,
        filters: FAQFilters & { page: number; limit: number }
    ): Promise<{
        items: FAQ[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const searchFilters = {
            ...filters,
            isPublished: true, // 公開済みのみ
        };

        return this.getFAQsByAppWithPagination(appId, searchFilters);
    }

    /**
     * 公開済みカテゴリ一覧取得
     * 要件7.2: FAQ取得APIの実装
     */
    async getPublishedCategories(appId: string): Promise<string[]> {
        return this.faqsRepository.findCategoriesByAppId(appId, { isPublished: true });
    }

    /**
     * 人気FAQ一覧取得
     * 要件7.2: FAQ取得APIの実装
     */
    async getPopularFAQs(appId: string, limit: number = 10): Promise<FAQ[]> {
        return this.faqsRepository.findPopularByAppId(appId, limit);
    }

    /**
     * 最新FAQ一覧取得
     * 要件7.2: FAQ取得APIの実装
     */
    async getRecentFAQs(appId: string, limit: number = 10): Promise<FAQ[]> {
        return this.faqsRepository.findRecentByAppId(appId, limit);
    }

    /**
     * 全FAQ取得（フィルタ付き）
     */
    async getAllFAQs(filters?: FAQFilters): Promise<FAQ[]> {
        return this.faqsRepository.findAll(filters);
    }

    /**
     * FAQ更新
     */
    async updateFAQ(id: string, updateFAQDto: UpdateFAQDto): Promise<FAQ> {
        const existingFAQ = await this.getFAQById(id);

        try {
            const updatedFAQ = await this.faqsRepository.update(id, updateFAQDto);
            if (!updatedFAQ) {
                throw new NotFoundException('FAQ更新に失敗しました');
            }

            // FAQ更新時の自動サイト反映
            if (updatedFAQ.isPublished) {
                await this.faqSiteService.handleFAQUpdate(updatedFAQ.appId);
            }

            return updatedFAQ;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException('FAQ更新に失敗しました');
        }
    }

    /**
     * FAQ削除
     */
    async deleteFAQ(id: string): Promise<void> {
        const existingFAQ = await this.getFAQById(id);

        try {
            await this.faqsRepository.delete(id);
        } catch (error) {
            throw new BadRequestException('FAQ削除に失敗しました');
        }
    }

    /**
     * FAQ公開
     */
    async publishFAQ(id: string): Promise<FAQ> {
        const updatedFAQ = await this.updateFAQ(id, { isPublished: true });

        // FAQ公開時の自動サイト反映
        await this.faqSiteService.handleFAQUpdate(updatedFAQ.appId);

        return updatedFAQ;
    }

    /**
     * FAQ非公開
     */
    async unpublishFAQ(id: string): Promise<FAQ> {
        return this.updateFAQ(id, { isPublished: false });
    }

    /**
     * 公開済みFAQ取得
     */
    async getPublishedFAQs(appId: string): Promise<FAQ[]> {
        return this.faqsRepository.findPublishedByAppId(appId);
    }

    /**
     * カテゴリ一覧取得
     */
    async getCategories(appId?: string): Promise<string[]> {
        return this.faqsRepository.getCategories(appId);
    }

    /**
     * タグ一覧取得
     */
    async getTags(appId?: string): Promise<string[]> {
        return this.faqsRepository.getTags(appId);
    }

    /**
     * FAQ分析データ取得
     */
    async getFAQAnalytics(appId: string): Promise<FAQAnalytics> {
        const allFAQs = await this.getFAQsByApp(appId);
        const publishedFAQs = allFAQs.filter(faq => faq.isPublished);

        // カテゴリ別集計
        const categoryBreakdown = allFAQs.reduce((acc, faq) => {
            const category = faq.category || '未分類';
            const existing = acc.find(item => item.category === category);
            if (existing) {
                existing.count++;
            } else {
                acc.push({ category, count: 1 });
            }
            return acc;
        }, [] as Array<{ category: string; count: number }>);

        return {
            totalFAQs: allFAQs.length,
            publishedFAQs: publishedFAQs.length,
            categoriesCount: categoryBreakdown.length,
            mostViewedFAQs: [], // 今後の実装で追加
            categoryBreakdown,
        };
    }

    /**
     * FAQ表示順序更新
     */
    async updateFAQOrder(id: string, orderIndex: number): Promise<FAQ> {
        return this.updateFAQ(id, { orderIndex });
    }

    /**
     * 複数FAQ一括公開状態更新
     */
    async bulkUpdatePublishStatus(ids: string[], isPublished: boolean): Promise<FAQ[]> {
        const updatedFAQs: FAQ[] = [];

        for (const id of ids) {
            try {
                const updatedFAQ = await this.updateFAQ(id, { isPublished });
                updatedFAQs.push(updatedFAQ);
            } catch (error) {
                // 個別のエラーは無視して続行
                console.warn(`FAQ ${id} の更新に失敗しました:`, error.message);
            }
        }

        return updatedFAQs;
    }
}
  /**

   * 自動FAQ生成
   */
  async generateFAQ(appId: string, options: FAQGenerationOptions): Promise < FAQ[] > {
    try {
        // クラスタリングによるFAQ候補生成
        const faqClusters = await this.faqClusteringService.generateFAQClusters(appId, options);

        // FAQ候補をFAQエンティティとして作成
        const generatedFAQs: FAQ[] = [];

        for(const cluster of faqClusters) {
            const createFAQDto: CreateFAQDto = {
                appId,
                question: cluster.representativeQuestion,
                answer: cluster.suggestedAnswer,
                category: cluster.category,
                isPublished: false, // 自動生成されたFAQは非公開で作成
                tags: ['自動生成'],
            };

            const faq = await this.createFAQ(createFAQDto);
            generatedFAQs.push(faq);
        }
      
      return generatedFAQs;
    } catch(error) {
        throw new BadRequestException('FAQ自動生成に失敗しました');
    }
}

  /**
   * FAQ生成プレビュー
   */
  async previewGeneratedFAQ(appId: string, options: FAQGenerationOptions): Promise < FAQCluster[] > {
    try {
        return await this.faqClusteringService.previewFAQGeneration(appId, options);
    } catch(error) {
        throw new BadRequestException('FAQ生成プレビューに失敗しました');
    }
}
 /**
   * FAQ静的サイト公開
   */
  async publishFAQSite(appId: string): Promise < string > {
    try {
        return await this.faqSiteService.publishFAQSite(appId);
    } catch(error) {
        throw new BadRequestException('FAQ静的サイト公開に失敗しました');
    }
}

  /**
   * FAQ更新時の自動サイト反映
   */
  async updateFAQSite(appId: string): Promise < string > {
    try {
        return await this.faqSiteService.updateFAQSite(appId);
    } catch(error) {
        throw new BadRequestException('FAQ自動サイト更新に失敗しました');
    }
}

  /**
   * FAQ公開サイト削除
   */
  async unpublishFAQSite(appId: string): Promise < void> {
    try {
        await this.faqSiteService.unpublishFAQSite(appId);
    } catch(error) {
        throw new BadRequestException('FAQ公開サイト削除に失敗しました');
    }
}