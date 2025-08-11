/**
 * ハイブリッド検索サービス
 * 要件: 8.3, 3.2 (ハイブリッド検索機能)
 */

import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from './search.service';
import { VectorService } from './vector.service';
import { SearchInquiriesDto, SearchResultDto } from '../dto/search.dto';
import { Inquiry } from '../entities/inquiry.entity';

interface HybridSearchOptions {
  vectorWeight?: number; // 0.0-1.0, ベクトル検索の重み
  textWeight?: number;   // 0.0-1.0, 全文検索の重み
  limit?: number;
  useVectorSearch?: boolean;
  useTextSearch?: boolean;
}

interface HybridSearchResult {
  id: string;
  inquiry: Inquiry;
  vectorScore?: number;
  textScore?: number;
  combinedScore: number;
  searchType: 'vector' | 'text' | 'hybrid';
}

interface ScoreNormalizationResult {
  normalizedScore: number;
  originalScore: number;
  scoreType: 'vector' | 'text';
}

@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly vectorService: VectorService,
  ) {}

  /**
   * ハイブリッド検索を実行する
   * 要件: 8.3, 3.2 (全文検索とベクトル検索の統合)
   */
  async hybridSearch(
    searchDto: SearchInquiriesDto,
    options: HybridSearchOptions = {}
  ): Promise<SearchResultDto<HybridSearchResult>> {
    const startTime = Date.now();
    
    const {
      vectorWeight = 0.5,
      textWeight = 0.5,
      limit = searchDto.limit || 20,
      useVectorSearch = true,
      useTextSearch = true,
    } = options;

    this.logger.log(`ハイブリッド検索実行開始: query="${searchDto.query}", vectorWeight=${vectorWeight}, textWeight=${textWeight}`);

    // 重みの正規化
    const totalWeight = vectorWeight + textWeight;
    const normalizedVectorWeight = totalWeight > 0 ? vectorWeight / totalWeight : 0.5;
    const normalizedTextWeight = totalWeight > 0 ? textWeight / totalWeight : 0.5;

    const results: Map<string, HybridSearchResult> = new Map();

    // 全文検索の実行
    if (useTextSearch && searchDto.query) {
      try {
        const textSearchDto = new SearchInquiriesDto();
        Object.assign(textSearchDto, searchDto);
        textSearchDto.limit = limit * 2; // 多めに取得してマージ時に調整
        
        const textResults = await this.searchService.searchInquiries(textSearchDto);

        for (const inquiry of textResults.items) {
          const textScore = this.calculateTextSearchScore(inquiry, searchDto.query);
          const normalizedTextScore = this.normalizeTextScore(textScore);

          results.set(inquiry.id, {
            id: inquiry.id,
            inquiry,
            textScore: normalizedTextScore.normalizedScore,
            combinedScore: normalizedTextScore.normalizedScore * normalizedTextWeight,
            searchType: 'text',
          });
        }

        this.logger.debug(`全文検索結果: ${textResults.items.length}件`);
      } catch (error) {
        this.logger.error(`全文検索エラー: ${error.message}`, error.stack);
      }
    }

    // ベクトル検索の実行
    if (useVectorSearch && searchDto.query) {
      try {
        const vectorResults = await this.vectorService.ragSearch(searchDto.query, {
          limit: limit * 2, // 多めに取得してマージ時に調整
          appId: searchDto.appId,
          type: 'inquiry',
        });

        for (const vectorResult of vectorResults) {
          const normalizedVectorScore = this.normalizeVectorScore(vectorResult.score);
          const existingResult = results.get(vectorResult.id);

          if (existingResult) {
            // 既存の結果とマージ
            existingResult.vectorScore = normalizedVectorScore.normalizedScore;
            existingResult.combinedScore = 
              (existingResult.textScore || 0) * normalizedTextWeight +
              normalizedVectorScore.normalizedScore * normalizedVectorWeight;
            existingResult.searchType = 'hybrid';
          } else {
            // ベクトル検索のみの結果
            // 対応する問い合わせを取得する必要がある
            // 簡略化のため、ここではベクトル検索結果のメタデータから構築
            results.set(vectorResult.id, {
              id: vectorResult.id,
              inquiry: this.createInquiryFromVectorResult(vectorResult),
              vectorScore: normalizedVectorScore.normalizedScore,
              combinedScore: normalizedVectorScore.normalizedScore * normalizedVectorWeight,
              searchType: 'vector',
            });
          }
        }

        this.logger.debug(`ベクトル検索結果: ${vectorResults.length}件`);
      } catch (error) {
        this.logger.error(`ベクトル検索エラー: ${error.message}`, error.stack);
      }
    }

    // 結果のソートと制限
    const sortedResults = Array.from(results.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, limit);

    // フィルタリングの適用（ベクトル検索では適用されないフィルターを後処理で適用）
    const filteredResults = this.applyAdditionalFilters(sortedResults, searchDto);

    const executionTime = Date.now() - startTime;
    const totalPages = Math.ceil(filteredResults.length / searchDto.limit);

    this.logger.log(`ハイブリッド検索完了: ${filteredResults.length}件取得, 実行時間: ${executionTime}ms`);

    return {
      items: filteredResults,
      total: filteredResults.length,
      page: searchDto.page,
      limit: searchDto.limit,
      totalPages,
      query: searchDto.query,
      appliedFilters: {
        ...this.extractAppliedFilters(searchDto),
        vectorWeight: normalizedVectorWeight,
        textWeight: normalizedTextWeight,
        searchTypes: this.getUsedSearchTypes(filteredResults),
      },
      executionTime,
    };
  }

  /**
   * 全文検索スコアを計算する
   */
  private calculateTextSearchScore(inquiry: Inquiry, query: string): number {
    if (!query) return 0;

    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    const titleText = inquiry.title.toLowerCase();
    const contentText = inquiry.content.toLowerCase();
    
    let score = 0;
    let totalTerms = queryTerms.length;

    for (const term of queryTerms) {
      // タイトルでの一致（重み2倍）
      if (titleText.includes(term)) {
        score += 2;
      }
      
      // 内容での一致
      if (contentText.includes(term)) {
        score += 1;
      }
      
      // 完全一致ボーナス
      if (titleText === term || contentText.includes(term)) {
        score += 0.5;
      }
    }

    // 正規化（0-1の範囲）
    return Math.min(score / (totalTerms * 3), 1.0);
  }

  /**
   * 全文検索スコアを正規化する
   * 要件: 8.3 (スコア正規化機能)
   */
  private normalizeTextScore(score: number): ScoreNormalizationResult {
    // 全文検索スコアは既に0-1の範囲なので、そのまま使用
    const normalizedScore = Math.max(0, Math.min(1, score));
    
    return {
      normalizedScore,
      originalScore: score,
      scoreType: 'text',
    };
  }

  /**
   * ベクトル検索スコアを正規化する
   * 要件: 8.3 (スコア正規化機能)
   */
  private normalizeVectorScore(score: number): ScoreNormalizationResult {
    // ベクトル検索スコア（内積）を0-1の範囲に正規化
    // 内積スコアは通常0-1の範囲だが、念のため正規化
    const normalizedScore = Math.max(0, Math.min(1, score));
    
    return {
      normalizedScore,
      originalScore: score,
      scoreType: 'vector',
    };
  }

  /**
   * ベクトル検索結果から問い合わせオブジェクトを構築する
   */
  private createInquiryFromVectorResult(vectorResult: any): Inquiry {
    // 実際の実装では、ベクトル検索結果のIDを使用してデータベースから問い合わせを取得する
    // ここでは簡略化のため、メタデータから構築
    const inquiry = new Inquiry();
    inquiry.id = vectorResult.id;
    inquiry.title = vectorResult.metadata.title || '';
    inquiry.content = vectorResult.content || '';
    inquiry.appId = vectorResult.metadata.appId || '';
    inquiry.category = vectorResult.metadata.category;
    inquiry.status = vectorResult.metadata.status;
    inquiry.createdAt = new Date(vectorResult.metadata.createdAt);
    inquiry.updatedAt = new Date(vectorResult.metadata.createdAt);
    
    return inquiry;
  }

  /**
   * 追加フィルターを適用する
   */
  private applyAdditionalFilters(
    results: HybridSearchResult[],
    searchDto: SearchInquiriesDto
  ): HybridSearchResult[] {
    let filteredResults = results;

    // 状態フィルター
    if (searchDto.status && searchDto.status.length > 0) {
      filteredResults = filteredResults.filter(result =>
        searchDto.status.includes(result.inquiry.status)
      );
    }

    // カテゴリフィルター
    if (searchDto.category && searchDto.category.length > 0) {
      filteredResults = filteredResults.filter(result =>
        result.inquiry.category && searchDto.category.includes(result.inquiry.category)
      );
    }

    // 優先度フィルター
    if (searchDto.priority && searchDto.priority.length > 0) {
      filteredResults = filteredResults.filter(result =>
        searchDto.priority.includes(result.inquiry.priority)
      );
    }

    // 担当者フィルター
    if (searchDto.assignedTo) {
      filteredResults = filteredResults.filter(result =>
        result.inquiry.assignedTo === searchDto.assignedTo
      );
    }

    // 顧客メールアドレスフィルター
    if (searchDto.customerEmail) {
      filteredResults = filteredResults.filter(result =>
        result.inquiry.customerEmail &&
        result.inquiry.customerEmail.toLowerCase().includes(searchDto.customerEmail.toLowerCase())
      );
    }

    // 日付範囲フィルター
    if (searchDto.startDate) {
      const startDate = new Date(searchDto.startDate);
      filteredResults = filteredResults.filter(result =>
        result.inquiry.createdAt >= startDate
      );
    }

    if (searchDto.endDate) {
      const endDate = new Date(searchDto.endDate);
      endDate.setHours(23, 59, 59, 999);
      filteredResults = filteredResults.filter(result =>
        result.inquiry.createdAt <= endDate
      );
    }

    return filteredResults;
  }

  /**
   * 適用されたフィルターを抽出する
   */
  private extractAppliedFilters(searchDto: SearchInquiriesDto): Record<string, any> {
    const filters: Record<string, any> = {};

    if (searchDto.appId) filters.appId = searchDto.appId;
    if (searchDto.status && searchDto.status.length > 0) filters.status = searchDto.status;
    if (searchDto.category && searchDto.category.length > 0) filters.category = searchDto.category;
    if (searchDto.priority && searchDto.priority.length > 0) filters.priority = searchDto.priority;
    if (searchDto.assignedTo) filters.assignedTo = searchDto.assignedTo;
    if (searchDto.customerEmail) filters.customerEmail = searchDto.customerEmail;
    if (searchDto.startDate) filters.startDate = searchDto.startDate;
    if (searchDto.endDate) filters.endDate = searchDto.endDate;

    return filters;
  }

  /**
   * 使用された検索タイプを取得する
   */
  private getUsedSearchTypes(results: HybridSearchResult[]): string[] {
    const types = new Set<string>();
    
    for (const result of results) {
      types.add(result.searchType);
    }
    
    return Array.from(types);
  }

  /**
   * 検索結果の詳細分析を取得する
   */
  async getSearchAnalytics(
    searchDto: SearchInquiriesDto,
    results: HybridSearchResult[]
  ): Promise<{
    totalResults: number;
    searchTypes: Record<string, number>;
    averageScores: {
      combined: number;
      vector?: number;
      text?: number;
    };
    scoreDistribution: {
      high: number; // 0.8-1.0
      medium: number; // 0.5-0.8
      low: number; // 0.0-0.5
    };
  }> {
    const totalResults = results.length;
    const searchTypes: Record<string, number> = {};
    let totalCombinedScore = 0;
    let totalVectorScore = 0;
    let totalTextScore = 0;
    let vectorCount = 0;
    let textCount = 0;

    const scoreDistribution = { high: 0, medium: 0, low: 0 };

    for (const result of results) {
      // 検索タイプ別カウント
      searchTypes[result.searchType] = (searchTypes[result.searchType] || 0) + 1;
      
      // スコア集計
      totalCombinedScore += result.combinedScore;
      
      if (result.vectorScore !== undefined) {
        totalVectorScore += result.vectorScore;
        vectorCount++;
      }
      
      if (result.textScore !== undefined) {
        totalTextScore += result.textScore;
        textCount++;
      }

      // スコア分布
      if (result.combinedScore >= 0.8) {
        scoreDistribution.high++;
      } else if (result.combinedScore >= 0.5) {
        scoreDistribution.medium++;
      } else {
        scoreDistribution.low++;
      }
    }

    return {
      totalResults,
      searchTypes,
      averageScores: {
        combined: totalResults > 0 ? totalCombinedScore / totalResults : 0,
        vector: vectorCount > 0 ? totalVectorScore / vectorCount : undefined,
        text: textCount > 0 ? totalTextScore / textCount : undefined,
      },
      scoreDistribution,
    };
  }

  /**
   * 検索重み付けの最適化提案を取得する
   */
  async getWeightOptimizationSuggestion(
    searchDto: SearchInquiriesDto,
    currentResults: HybridSearchResult[]
  ): Promise<{
    currentWeights: { vector: number; text: number };
    suggestedWeights: { vector: number; text: number };
    reasoning: string;
    expectedImprovement: number;
  }> {
    // 現在の結果を分析
    const analytics = await this.getSearchAnalytics(searchDto, currentResults);
    
    let suggestedVectorWeight = 0.5;
    let suggestedTextWeight = 0.5;
    let reasoning = '';
    let expectedImprovement = 0;

    // ベクトル検索の結果が多い場合
    if ((analytics.searchTypes.vector || 0) > (analytics.searchTypes.text || 0)) {
      suggestedVectorWeight = 0.7;
      suggestedTextWeight = 0.3;
      reasoning = 'ベクトル検索でより多くの関連結果が見つかったため、ベクトル検索の重みを増加することを推奨します。';
      expectedImprovement = 0.15;
    }
    // 全文検索の結果が多い場合
    else if ((analytics.searchTypes.text || 0) > (analytics.searchTypes.vector || 0)) {
      suggestedVectorWeight = 0.3;
      suggestedTextWeight = 0.7;
      reasoning = '全文検索でより多くの関連結果が見つかったため、全文検索の重みを増加することを推奨します。';
      expectedImprovement = 0.15;
    }
    // ハイブリッド結果が多い場合
    else if ((analytics.searchTypes.hybrid || 0) > 0) {
      suggestedVectorWeight = 0.5;
      suggestedTextWeight = 0.5;
      reasoning = '両方の検索方法で良い結果が得られているため、現在の重み付けが最適です。';
      expectedImprovement = 0;
    }

    return {
      currentWeights: { vector: 0.5, text: 0.5 }, // デフォルト値
      suggestedWeights: { vector: suggestedVectorWeight, text: suggestedTextWeight },
      reasoning,
      expectedImprovement,
    };
  }

  /**
   * テキストをベクトル化する
   * VectorServiceのembedTextメソッドを呼び出す
   */
  async embedText(text: string): Promise<number[]> {
    return this.vectorService.embedText(text);
  }

  /**
   * ベクトルを保存する
   * VectorServiceのstoreVectorメソッドを呼び出す
   */
  async storeVector(id: string, vector: number[], metadata: any): Promise<void> {
    return this.vectorService.storeVector(id, vector, metadata);
  }

  /**
   * ベクトルを更新する
   * VectorServiceのupdateVectorメソッドを呼び出す
   */
  async updateVector(id: string, vector: number[], metadata: any): Promise<void> {
    return this.vectorService.updateVector(id, vector, metadata);
  }
}