import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from './search.service';
import { VectorService } from './vector.service';
import {
    SearchCriteria,
    FullTextSearchResult,
    PaginatedResult,
} from '../types/search.types';

export interface HybridSearchOptions {
    vectorWeight: number; // 0.0-1.0, ベクトル検索の重み
    textWeight: number;   // 0.0-1.0, 全文検索の重み
    limit: number;
    filters?: any;
}

export interface HybridSearchResult {
    id: string;
    title: string;
    content: string;
    type: 'inquiry' | 'response' | 'faq';
    vectorScore: number;
    textScore: number;
    combinedScore: number;
    highlights: string[];
    metadata: Record<string, any>;
    createdAt: Date;
}

@Injectable()
export class HybridSearchService {
    private readonly logger = new Logger(HybridSearchService.name);

    constructor(
        private readonly searchService: SearchService,
        private readonly vectorService: VectorService,
    ) { }

    /**
     * ハイブリッド検索を実行する
     * 要件8.3, 3.2対応: 全文検索とベクトル検索の統合
     */
    async hybridSearch(
        query: string,
        options: HybridSearchOptions
    ): Promise<PaginatedResult<HybridSearchResult>> {
        this.logger.log(`ハイブリッド検索開始: query="${query}"`);

        const { vectorWeight = 0.5, textWeight = 0.5, limit = 20, filters } = options;

        // 重みの正規化
        const totalWeight = vectorWeight + textWeight;
        const normalizedVectorWeight = totalWeight > 0 ? vectorWeight / totalWeight : 0.5;
        const normalizedTextWeight = totalWeight > 0 ? textWeight / totalWeight : 0.5;

        // 並行して全文検索とベクトル検索を実行
        const [fullTextResults, vectorResults] = await Promise.all([
            this.executeFullTextSearch(query, filters, limit * 2), // 多めに取得
            this.executeVectorSearch(query, filters, limit * 2),   // 多めに取得
        ]);

        // 結果を統合
        const combinedResults = this.combineSearchResults(
            fullTextResults,
            vectorResults,
            normalizedVectorWeight,
            normalizedTextWeight
        );

        // スコアでソート
        combinedResults.sort((a, b) => b.combinedScore - a.combinedScore);

        // ページネーション（簡易実装）
        const totalResults = combinedResults.length;
        const items = combinedResults.slice(0, limit);

        const result: PaginatedResult<HybridSearchResult> = {
            items,
            total: totalResults,
            page: 1,
            limit,
            totalPages: Math.ceil(totalResults / limit),
            hasNext: totalResults > limit,
            hasPrev: false,
        };

        this.logger.log(`ハイブリッド検索完了: 結果件数=${items.length}, 総件数=${totalResults}`);
        return result;
    }

    /**
     * 全文検索を実行する
     */
    private async executeFullTextSearch(
        query: string,
        filters: any,
        limit: number
    ): Promise<FullTextSearchResult[]> {
        try {
            const criteria: SearchCriteria = {
                query,
                filters,
                limit,
                page: 1,
            };

            const result = await this.searchService.fullTextSearch(criteria);
            return result.items;
        } catch (error) {
            this.logger.error(`全文検索エラー: ${error.message}`, error.stack);
            return [];
        }
    }

    /**
     * ベクトル検索を実行する
     */
    private async executeVectorSearch(
        query: string,
        filters: any,
        limit: number
    ): Promise<Array<{ id: string; score: number; metadata: any }>> {
        try {
            // クエリをベクトル化
            const queryVector = await this.vectorService.embedText(query);

            // ベクトル検索を実行
            const results = await this.vectorService.vectorSearch(queryVector, limit);

            // フィルタリング
            let filteredResults = results;
            if (filters?.appId) {
                filteredResults = filteredResults.filter(result => result.metadata.appId === filters.appId);
            }
            if (filters?.category && Array.isArray(filters.category)) {
                filteredResults = filteredResults.filter(result =>
                    filters.category.includes(result.metadata.category)
                );
            }
            if (filters?.status && Array.isArray(filters.status)) {
                filteredResults = filteredResults.filter(result =>
                    filters.status.includes(result.metadata.status)
                );
            }

            return filteredResults;
        } catch (error) {
            this.logger.error(`ベクトル検索エラー: ${error.message}`, error.stack);
            return [];
        }
    }

    /**
     * 検索結果を統合する
     * 要件8.3対応: スコア正規化と重み付け機能
     */
    private combineSearchResults(
        textResults: FullTextSearchResult[],
        vectorResults: Array<{ id: string; score: number; metadata: any }>,
        vectorWeight: number,
        textWeight: number
    ): HybridSearchResult[] {
        const resultMap = new Map<string, HybridSearchResult>();

        // 全文検索結果を処理
        const maxTextScore = Math.max(...textResults.map(r => r.score), 1);
        for (const textResult of textResults) {
            const normalizedTextScore = textResult.score / maxTextScore;

            resultMap.set(textResult.id, {
                id: textResult.id,
                title: textResult.title,
                content: textResult.content,
                type: textResult.type,
                vectorScore: 0,
                textScore: normalizedTextScore,
                combinedScore: normalizedTextScore * textWeight,
                highlights: textResult.highlights,
                metadata: textResult.metadata,
                createdAt: textResult.createdAt,
            });
        }

        // ベクトル検索結果を処理
        const maxVectorScore = Math.max(...vectorResults.map(r => r.score), 1);
        for (const vectorResult of vectorResults) {
            const normalizedVectorScore = vectorResult.score / maxVectorScore;

            if (resultMap.has(vectorResult.id)) {
                // 既存の結果を更新
                const existing = resultMap.get(vectorResult.id)!;
                existing.vectorScore = normalizedVectorScore;
                existing.combinedScore = (existing.textScore * textWeight) + (normalizedVectorScore * vectorWeight);
            } else {
                // 新しい結果を追加（ベクトル検索のみ）
                resultMap.set(vectorResult.id, {
                    id: vectorResult.id,
                    title: vectorResult.metadata.title || vectorResult.id,
                    content: '', // ベクトル検索のみの場合は内容が取得できない
                    type: vectorResult.metadata.type,
                    vectorScore: normalizedVectorScore,
                    textScore: 0,
                    combinedScore: normalizedVectorScore * vectorWeight,
                    highlights: [],
                    metadata: vectorResult.metadata,
                    createdAt: new Date(vectorResult.metadata.createdAt),
                });
            }
        }

        return Array.from(resultMap.values());
    }

    /**
     * 検索結果のランキング機能
     * 要件8.3対応: 検索結果の統合とランキング機能
     */
    async rankSearchResults(
        results: HybridSearchResult[],
        query: string,
        userContext?: {
            appId?: string;
            recentCategories?: string[];
            preferredTypes?: string[];
        }
    ): Promise<HybridSearchResult[]> {
        this.logger.debug(`検索結果ランキング開始: ${results.length}件`);

        // コンテキストベースのブースト
        const rankedResults = results.map(result => {
            let boostFactor = 1.0;

            // アプリIDマッチでブースト
            if (userContext?.appId && result.metadata.appId === userContext.appId) {
                boostFactor *= 1.2;
            }

            // 最近のカテゴリでブースト
            if (userContext?.recentCategories?.includes(result.metadata.category)) {
                boostFactor *= 1.1;
            }

            // 優先タイプでブースト
            if (userContext?.preferredTypes?.includes(result.type)) {
                boostFactor *= 1.15;
            }

            // 新しい結果をわずかにブースト
            const daysSinceCreation = (Date.now() - result.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceCreation < 30) {
                boostFactor *= 1.05;
            }

            return {
                ...result,
                combinedScore: result.combinedScore * boostFactor,
            };
        });

        // 最終スコアでソート
        rankedResults.sort((a, b) => b.combinedScore - a.combinedScore);

        this.logger.debug(`検索結果ランキング完了`);
        return rankedResults;
    }

    /**
     * 検索統計を取得する
     */
    getSearchStats(): {
        totalSearches: number;
        averageResponseTime: number;
        popularQueries: string[];
    } {
        // 実装は簡略化（実際にはRedisなどで統計を管理）
        return {
            totalSearches: 0,
            averageResponseTime: 0,
            popularQueries: [],
        };
    }
}