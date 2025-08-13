/**
 * テンプレート提案サービス
 * 要件: 10.2 (AI支援テンプレート提案の実装)
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../../../common/entities/template.entity';
import { TemplateUsage } from '../../../common/entities/template-usage.entity';
import { Inquiry } from '../../../common/entities/inquiry.entity';
import { TemplateRepository } from '../../../common/repositories/template.repository';
import { HybridSearchService } from '../../../common/services/hybrid-search.service';
import {
  TemplateSuggestion,
  TemplateAnalytics,
  TemplateUsageContext
} from '../../../common/types/template.types';

export interface TemplateSuggestionOptions {
  content: string;
  category?: string;
  appId?: string;
  userId?: string;
  limit?: number;
  includeUsageStats?: boolean;
  contextualBoost?: boolean;
}

export interface TemplateEffectivenessMetrics {
  templateId: string;
  averageRating: number;
  usageCount: number;
  successRate: number;
  responseTime: number;
  userSatisfaction: number;
}

@Injectable()
export class TemplateSuggestionService {
  private readonly logger = new Logger(TemplateSuggestionService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    private readonly templateRepository: TemplateRepository,
    private readonly hybridSearchService: HybridSearchService,
  ) {}

  /**
   * 問い合わせ内容に基づくテンプレート提案
   * 要件: 10.2 (問い合わせ内容に基づくテンプレート提案)
   */
  async suggestTemplates(options: TemplateSuggestionOptions): Promise<TemplateSuggestion[]> {
    this.logger.log(`テンプレート提案開始: content length=${options.content.length}`);

    try {
      // 1. ハイブリッド検索でテンプレート候補を取得
      const searchDto = {
        query: options.content,
        limit: options.limit ? options.limit * 3 : 30,
        page: 1,
        skip: 0,
        appId: options.appId,
        category: options.category ? [options.category] : undefined,
      };
      
      const searchResults = await this.hybridSearchService.hybridSearch(
        searchDto,
        {
          vectorWeight: 0.7,
          textWeight: 0.3,
          limit: options.limit ? options.limit * 3 : 30, // 多めに取得してフィルタリング
        }
      );

      // 2. テンプレート詳細情報を取得
      const templateSuggestions: TemplateSuggestion[] = [];
      
      for (const result of searchResults.items) {
        const template = await this.templateRepository.findById(result.id);
        if (!template || !template.isActive) continue;

        // 3. 使用統計とコンテキスト情報を取得
        const usageStats = options.includeUsageStats 
          ? await this.getTemplateUsageStats(template.id)
          : null;

        // 4. コンテキストブースト適用
        let relevanceScore = result.combinedScore;
        if (options.contextualBoost) {
          relevanceScore = await this.applyContextualBoost(
            relevanceScore,
            template,
            options
          );
        }

        // 5. マッチしたキーワードを抽出
        const matchedKeywords = this.extractMatchedKeywords(
          options.content,
          template.content + ' ' + template.name
        );

        templateSuggestions.push({
          templateId: template.id,
          templateName: template.name,
          category: template.category || 'その他',
          relevanceScore,
          matchedKeywords,
          usageCount: template.usageCount,
          effectivenessScore: template.effectivenessScore,
          ...(usageStats && { usageStats }),
        });

        if (templateSuggestions.length >= (options.limit || 10)) break;
      }

      // 6. スコア順でソート
      templateSuggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

      this.logger.log(`テンプレート提案完了: 提案数=${templateSuggestions.length}`);
      return templateSuggestions;

    } catch (error) {
      this.logger.error(`テンプレート提案エラー: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 人気テンプレート取得
   * 要件: 10.2 (使用統計に基づく人気テンプレート表示)
   */
  async getPopularTemplates(
    appId?: string,
    category?: string,
    limit: number = 10,
    timeRange?: { from: Date; to: Date }
  ): Promise<TemplateSuggestion[]> {
    this.logger.log(`人気テンプレート取得開始: appId=${appId}, category=${category}`);

    try {
      // 期間指定がある場合は使用履歴から計算
      if (timeRange) {
        return await this.getPopularTemplatesByTimeRange(appId, category, limit, timeRange);
      }

      // 通常の人気テンプレート取得
      const templates = await this.templateRepository.findPopularTemplates(limit * 2, appId);

      const popularTemplates: TemplateSuggestion[] = [];

      for (const template of templates) {
        if (category && template.category !== category) continue;

        const usageStats = await this.getTemplateUsageStats(template.id);
        
        popularTemplates.push({
          templateId: template.id,
          templateName: template.name,
          category: template.category || 'その他',
          relevanceScore: this.calculatePopularityScore(template, usageStats),
          matchedKeywords: [],
          usageCount: template.usageCount,
          effectivenessScore: template.effectivenessScore,
          // usageStats,
        });

        if (popularTemplates.length >= limit) break;
      }

      // 人気度スコア順でソート
      popularTemplates.sort((a, b) => b.relevanceScore - a.relevanceScore);

      this.logger.log(`人気テンプレート取得完了: 取得数=${popularTemplates.length}`);
      return popularTemplates;

    } catch (error) {
      this.logger.error(`人気テンプレート取得エラー: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * テンプレート効果測定
   * 要件: 10.2 (テンプレート効果測定機能)
   */
  async measureTemplateEffectiveness(templateId: string): Promise<TemplateEffectivenessMetrics> {
    this.logger.log(`テンプレート効果測定開始: templateId=${templateId}`);

    try {
      const template = await this.templateRepository.findById(templateId);
      if (!template) {
        throw new Error(`テンプレートが見つかりません: ${templateId}`);
      }

      // 使用履歴を取得
      const usageHistory = await this.templateRepository.findUsageHistory(templateId, 1000);

      // 効果指標を計算
      const metrics: TemplateEffectivenessMetrics = {
        templateId,
        averageRating: this.calculateAverageRating(usageHistory),
        usageCount: template.usageCount,
        successRate: this.calculateSuccessRate(usageHistory),
        responseTime: await this.calculateAverageResponseTime(usageHistory),
        userSatisfaction: this.calculateUserSatisfaction(usageHistory),
      };

      this.logger.log(`テンプレート効果測定完了: templateId=${templateId}`);
      return metrics;

    } catch (error) {
      this.logger.error(`テンプレート効果測定エラー: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ユーザー別テンプレート推奨
   */
  async getPersonalizedTemplateRecommendations(
    userId: string,
    limit: number = 5
  ): Promise<TemplateSuggestion[]> {
    this.logger.log(`個人化テンプレート推奨開始: userId=${userId}`);

    try {
      // ユーザーの使用履歴を分析
      const userUsageHistory = await this.templateRepository.findUserUsageHistory(userId, 100);
      
      // ユーザーの好みを分析
      const userPreferences = this.analyzeUserPreferences(userUsageHistory);

      // 類似ユーザーの使用パターンを取得
      const similarUserTemplates = await this.findSimilarUserTemplates(userId, userPreferences);

      // 推奨テンプレートを生成
      const recommendations: TemplateSuggestion[] = [];

      for (const templateId of similarUserTemplates) {
        const template = await this.templateRepository.findById(templateId);
        if (!template || !template.isActive) continue;

        // ユーザーがまだ使用していないテンプレートのみ推奨
        const hasUsed = userUsageHistory.some(usage => usage.templateId === templateId);
        if (hasUsed) continue;

        const usageStats = await this.getTemplateUsageStats(templateId);
        const personalizedScore = this.calculatePersonalizedScore(template, userPreferences);

        recommendations.push({
          templateId: template.id,
          templateName: template.name,
          category: template.category || 'その他',
          relevanceScore: personalizedScore,
          matchedKeywords: [],
          usageCount: template.usageCount,
          effectivenessScore: template.effectivenessScore,
          // usageStats,
        });

        if (recommendations.length >= limit) break;
      }

      // スコア順でソート
      recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

      this.logger.log(`個人化テンプレート推奨完了: 推奨数=${recommendations.length}`);
      return recommendations;

    } catch (error) {
      this.logger.error(`個人化テンプレート推奨エラー: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * テンプレート使用統計取得
   */
  private async getTemplateUsageStats(templateId: string): Promise<any> {
    const usageHistory = await this.templateRepository.findUsageHistory(templateId, 100);
    
    return {
      totalUsage: usageHistory.length,
      averageRating: this.calculateAverageRating(usageHistory),
      recentUsage: usageHistory.filter(usage => 
        usage.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length,
      contextDistribution: this.calculateContextDistribution(usageHistory),
    };
  }

  /**
   * コンテキストブースト適用
   */
  private async applyContextualBoost(
    baseScore: number,
    template: Template,
    options: TemplateSuggestionOptions
  ): Promise<number> {
    let boostedScore = baseScore;

    // カテゴリマッチブースト
    if (options.category && template.category === options.category) {
      boostedScore *= 1.2;
    }

    // アプリ固有テンプレートブースト
    if (options.appId && template.appId === options.appId) {
      boostedScore *= 1.15;
    }

    // 最近の使用頻度ブースト
    const recentUsage = await this.getRecentUsageCount(template.id, 7); // 過去7日
    if (recentUsage > 0) {
      boostedScore *= (1 + Math.min(recentUsage * 0.1, 0.5));
    }

    // 効果スコアブースト
    if (template.effectivenessScore && template.effectivenessScore > 3.5) {
      boostedScore *= (1 + (template.effectivenessScore - 3.5) * 0.1);
    }

    return Math.min(boostedScore, 1.0); // 最大値を1.0に制限
  }

  /**
   * マッチしたキーワード抽出
   */
  private extractMatchedKeywords(query: string, content: string): string[] {
    const queryWords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    const contentWords = content.toLowerCase()
      .split(/\s+/);
    
    return queryWords.filter(word => 
      contentWords.some(contentWord => contentWord.includes(word))
    ).slice(0, 5); // 最大5個まで
  }

  /**
   * 期間指定人気テンプレート取得
   */
  private async getPopularTemplatesByTimeRange(
    appId?: string,
    category?: string,
    limit: number = 10,
    timeRange: { from: Date; to: Date } = { from: new Date(), to: new Date() }
  ): Promise<TemplateSuggestion[]> {
    // 実装は簡略化 - 実際にはより複雑な集計クエリが必要
    return [];
  }

  /**
   * 人気度スコア計算
   */
  private calculatePopularityScore(template: Template, usageStats: any): number {
    const usageWeight = 0.4;
    const effectivenessWeight = 0.3;
    const recentUsageWeight = 0.3;

    const usageScore = Math.min(template.usageCount / 100, 1.0);
    const effectivenessScore = (template.effectivenessScore || 0) / 5.0;
    const recentUsageScore = Math.min((usageStats?.recentUsage || 0) / 10, 1.0);

    return (
      usageScore * usageWeight +
      effectivenessScore * effectivenessWeight +
      recentUsageScore * recentUsageWeight
    );
  }

  /**
   * 平均評価計算
   */
  private calculateAverageRating(usageHistory: TemplateUsage[]): number {
    const ratings = usageHistory
      .filter(usage => usage.effectivenessRating !== null)
      .map(usage => usage.effectivenessRating);

    if (ratings.length === 0) return 0;

    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  /**
   * 成功率計算
   */
  private calculateSuccessRate(usageHistory: TemplateUsage[]): number {
    if (usageHistory.length === 0) return 0;

    const successfulUsages = usageHistory.filter(usage => 
      usage.effectivenessRating && usage.effectivenessRating >= 4
    ).length;

    return successfulUsages / usageHistory.length;
  }

  /**
   * 平均応答時間計算
   */
  private async calculateAverageResponseTime(usageHistory: TemplateUsage[]): Promise<number> {
    // 実装は簡略化 - 実際には問い合わせと回答の時間差を計算
    return 0;
  }

  /**
   * ユーザー満足度計算
   */
  private calculateUserSatisfaction(usageHistory: TemplateUsage[]): number {
    const ratings = usageHistory
      .filter(usage => usage.effectivenessRating !== null)
      .map(usage => usage.effectivenessRating);

    if (ratings.length === 0) return 0;

    // 4以上の評価を満足とみなす
    const satisfiedCount = ratings.filter(rating => rating >= 4).length;
    return satisfiedCount / ratings.length;
  }

  /**
   * ユーザー好み分析
   */
  private analyzeUserPreferences(usageHistory: TemplateUsage[]): any {
    const categories = usageHistory.map(usage => usage.template?.category).filter(Boolean);
    const contexts = usageHistory.map(usage => usage.usageContext);
    
    return {
      preferredCategories: this.getMostFrequent(categories),
      preferredContexts: this.getMostFrequent(contexts),
      averageRating: this.calculateAverageRating(usageHistory),
    };
  }

  /**
   * 類似ユーザーテンプレート検索
   */
  private async findSimilarUserTemplates(userId: string, userPreferences: any): Promise<string[]> {
    // 実装は簡略化 - 実際にはより複雑な協調フィルタリングが必要
    return [];
  }

  /**
   * 個人化スコア計算
   */
  private calculatePersonalizedScore(template: Template, userPreferences: any): number {
    let score = 0.5; // ベーススコア

    // カテゴリ好み
    if (userPreferences.preferredCategories.includes(template.category)) {
      score += 0.3;
    }

    // 効果スコア
    if (template.effectivenessScore) {
      score += (template.effectivenessScore / 5.0) * 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 最頻値取得
   */
  private getMostFrequent(items: any[]): any[] {
    const frequency = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(frequency)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([item]) => item);
  }

  /**
   * 最近の使用回数取得
   */
  private async getRecentUsageCount(templateId: string, days: number): Promise<number> {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const usageHistory = await this.templateRepository.findUsageHistory(templateId, 100);
    
    return usageHistory.filter(usage => usage.createdAt > fromDate).length;
  }

  /**
   * コンテキスト分布計算
   */
  private calculateContextDistribution(usageHistory: TemplateUsage[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    usageHistory.forEach(usage => {
      const context = usage.usageContext || 'unknown';
      distribution[context] = (distribution[context] || 0) + 1;
    });

    return distribution;
  }
}