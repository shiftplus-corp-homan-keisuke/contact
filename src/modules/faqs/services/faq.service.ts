/**
 * FAQサービス
 * 要件: 6.3, 6.4 (FAQ管理機能)
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FAQ } from '../../../common/entities/faq.entity';
import { Application } from '../../../common/entities/application.entity';
import { FAQRepository, FAQSearchOptions } from '../../../common/repositories/faq.repository';
import { FAQClusteringService, ClusteringResult } from './faq-clustering.service';
import { FAQGenerationOptions, FAQCluster } from '../../../common/types/faq.types';
import {
  CreateFAQDto,
  UpdateFAQDto,
  SearchFAQDto,
  BulkUpdateFAQPublishStatusDto,
  UpdateFAQOrderDto,
  FAQResponseDto,
  FAQSearchResultDto,
  FAQStatisticsDto
} from '../../../common/dto/faq.dto';

@Injectable()
export class FAQService {
  private readonly logger = new Logger(FAQService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly faqRepository: FAQRepository,
    private readonly faqClusteringService: FAQClusteringService,
  ) {}

  /**
   * FAQ作成
   * 要件: 6.3 (FAQ作成・編集・削除機能)
   */
  async createFAQ(createFAQDto: CreateFAQDto): Promise<FAQResponseDto> {
    this.logger.log(`FAQ作成開始: appId=${createFAQDto.appId}`);

    // アプリケーション存在確認
    const application = await this.applicationRepository.findOne({
      where: { id: createFAQDto.appId }
    });

    if (!application) {
      throw new NotFoundException(`アプリケーションが見つかりません: ${createFAQDto.appId}`);
    }

    // orderIndexが指定されていない場合は最大値+1を設定
    let orderIndex = createFAQDto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await this.faqRepository.getMaxOrderIndex(createFAQDto.appId);
      orderIndex = maxOrder + 1;
    }

    // FAQ作成
    const faq = await this.faqRepository.create({
      ...createFAQDto,
      orderIndex,
      tags: createFAQDto.tags || [],
      isPublished: createFAQDto.isPublished || false,
    });

    this.logger.log(`FAQ作成完了: id=${faq.id}`);
    return this.mapToResponseDto(faq);
  }

  /**
   * FAQ取得
   * 要件: 6.3 (FAQ管理機能)
   */
  async getFAQ(id: string): Promise<FAQResponseDto> {
    // Use the repository directly to get relations
    const faq = await this.faqRepository.findOne({ id } as any);

    if (!faq) {
      throw new NotFoundException(`FAQが見つかりません: ${id}`);
    }

    return this.mapToResponseDto(faq);
  }

  /**
   * FAQ更新
   * 要件: 6.3 (FAQ作成・編集・削除機能)
   */
  async updateFAQ(id: string, updateFAQDto: UpdateFAQDto): Promise<FAQResponseDto> {
    this.logger.log(`FAQ更新開始: id=${id}`);

    const faq = await this.faqRepository.findOne({ id } as any);
    if (!faq) {
      throw new NotFoundException(`FAQが見つかりません: ${id}`);
    }

    // 更新実行
    const updatedFAQ = await this.faqRepository.update(id, updateFAQDto);

    this.logger.log(`FAQ更新完了: id=${id}`);
    return this.mapToResponseDto(updatedFAQ);
  }

  /**
   * FAQ削除
   * 要件: 6.3 (FAQ作成・編集・削除機能)
   */
  async deleteFAQ(id: string): Promise<void> {
    this.logger.log(`FAQ削除開始: id=${id}`);

    const faq = await this.faqRepository.findOne({ id } as any);
    if (!faq) {
      throw new NotFoundException(`FAQが見つかりません: ${id}`);
    }

    await this.faqRepository.delete(id);
    this.logger.log(`FAQ削除完了: id=${id}`);
  }

  /**
   * アプリ別FAQ取得
   * 要件: 6.4 (アプリ別FAQ管理機能)
   */
  async getFAQsByApp(appId: string, searchDto?: SearchFAQDto): Promise<FAQSearchResultDto> {
    // アプリケーション存在確認
    const application = await this.applicationRepository.findOne({
      where: { id: appId }
    });

    if (!application) {
      throw new NotFoundException(`アプリケーションが見つかりません: ${appId}`);
    }

    const options: FAQSearchOptions = {
      query: searchDto?.query,
      filters: {
        appId,
        category: searchDto?.category,
        isPublished: searchDto?.isPublished,
        tags: searchDto?.tags,
      },
      sortBy: searchDto?.sortBy || 'orderIndex',
      sortOrder: searchDto?.sortOrder || 'ASC',
      page: searchDto?.page || 1,
      limit: searchDto?.limit || 20,
    };

    const { items, total } = await this.faqRepository.searchFAQs(options);
    const totalPages = Math.ceil(total / options.limit);

    return {
      items: items.map(item => this.mapToResponseDto(item)),
      total,
      page: options.page,
      limit: options.limit,
      totalPages,
    };
  }

  /**
   * 公開済みFAQ取得
   * 要件: 6.4 (FAQ公開・非公開制御機能)
   */
  async getPublishedFAQs(appId: string): Promise<FAQResponseDto[]> {
    const faqs = await this.faqRepository.findPublishedByAppId(appId);
    return faqs.map(faq => this.mapToResponseDto(faq));
  }

  /**
   * カテゴリ別FAQ取得
   * 要件: 6.4 (アプリ別FAQ管理機能)
   */
  async getFAQsByCategory(appId: string, category: string): Promise<FAQResponseDto[]> {
    const faqs = await this.faqRepository.findByCategory(appId, category);
    return faqs.map(faq => this.mapToResponseDto(faq));
  }

  /**
   * FAQ検索
   * 要件: 6.3 (FAQ管理機能)
   */
  async searchFAQs(searchDto: SearchFAQDto): Promise<FAQSearchResultDto> {
    const options: FAQSearchOptions = {
      query: searchDto.query,
      filters: {
        appId: searchDto.appId,
        category: searchDto.category,
        isPublished: searchDto.isPublished,
        tags: searchDto.tags,
      },
      sortBy: searchDto.sortBy || 'updatedAt',
      sortOrder: searchDto.sortOrder || 'DESC',
      page: searchDto.page || 1,
      limit: searchDto.limit || 20,
    };

    const { items, total } = await this.faqRepository.searchFAQs(options);
    const totalPages = Math.ceil(total / options.limit);

    return {
      items: items.map(item => this.mapToResponseDto(item)),
      total,
      page: options.page,
      limit: options.limit,
      totalPages,
    };
  }

  /**
   * FAQ公開状態更新
   * 要件: 6.4 (FAQ公開・非公開制御機能)
   */
  async updatePublishStatus(id: string, isPublished: boolean): Promise<FAQResponseDto> {
    this.logger.log(`FAQ公開状態更新: id=${id}, isPublished=${isPublished}`);

    const faq = await this.faqRepository.findOne({ id } as any);
    if (!faq) {
      throw new NotFoundException(`FAQが見つかりません: ${id}`);
    }

    const updatedFAQ = await this.faqRepository.update(id, { isPublished });
    this.logger.log(`FAQ公開状態更新完了: id=${id}`);

    return this.mapToResponseDto(updatedFAQ);
  }

  /**
   * FAQ公開状態一括更新
   * 要件: 6.4 (FAQ公開・非公開制御機能)
   */
  async bulkUpdatePublishStatus(bulkUpdateDto: BulkUpdateFAQPublishStatusDto): Promise<void> {
    this.logger.log(`FAQ公開状態一括更新: ids=${bulkUpdateDto.ids.length}件`);

    if (bulkUpdateDto.ids.length === 0) {
      throw new BadRequestException('更新対象のFAQ IDが指定されていません');
    }

    await this.faqRepository.bulkUpdatePublishStatus(bulkUpdateDto.ids, bulkUpdateDto.isPublished);
    this.logger.log(`FAQ公開状態一括更新完了: ${bulkUpdateDto.ids.length}件`);
  }

  /**
   * FAQ表示順序更新
   * 要件: 6.3 (FAQ管理機能)
   */
  async updateFAQOrder(updateOrderDto: UpdateFAQOrderDto): Promise<void> {
    this.logger.log(`FAQ表示順序更新: ${updateOrderDto.items.length}件`);

    if (updateOrderDto.items.length === 0) {
      throw new BadRequestException('更新対象のFAQが指定されていません');
    }

    // 重複チェック
    const ids = updateOrderDto.items.map(item => item.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new BadRequestException('重複するFAQ IDが含まれています');
    }

    // FAQ存在確認
    const faqs = await this.faqRepository.findByIds(ids);
    if (faqs.length !== ids.length) {
      throw new BadRequestException('存在しないFAQ IDが含まれています');
    }

    // 順序更新実行
    const updates = updateOrderDto.items.map(item => ({
      id: item.id,
      orderIndex: item.orderIndex
    }));

    await this.faqRepository.updateOrderIndexes(updates);
    this.logger.log(`FAQ表示順序更新完了: ${updateOrderDto.items.length}件`);
  }

  /**
   * FAQ統計取得
   * 要件: 6.4 (アプリ別FAQ管理機能)
   */
  async getFAQStatistics(appId: string): Promise<FAQStatisticsDto> {
    // アプリケーション存在確認
    const application = await this.applicationRepository.findOne({
      where: { id: appId }
    });

    if (!application) {
      throw new NotFoundException(`アプリケーションが見つかりません: ${appId}`);
    }

    return await this.faqRepository.getFAQStatistics(appId);
  }

  /**
   * 全アプリのFAQ統計取得
   */
  async getAllFAQStatistics(): Promise<{ [appId: string]: FAQStatisticsDto }> {
    const applications = await this.applicationRepository.find();
    const statistics: { [appId: string]: FAQStatisticsDto } = {};

    for (const app of applications) {
      statistics[app.id] = await this.faqRepository.getFAQStatistics(app.id);
    }

    return statistics;
  }

  /**
   * FAQ自動生成
   * 要件: 6.1, 6.2 (問い合わせクラスタリングアルゴリズムの実装、FAQ項目の自動生成)
   */
  async generateFAQ(appId: string, options: FAQGenerationOptions): Promise<FAQCluster[]> {
    this.logger.log(`FAQ自動生成開始: appId=${appId}`);

    // アプリケーション存在確認
    const application = await this.applicationRepository.findOne({
      where: { id: appId }
    });

    if (!application) {
      throw new NotFoundException(`アプリケーションが見つかりません: ${appId}`);
    }

    // クラスタリング実行
    const clusteringResult = await this.faqClusteringService.clusterInquiries(appId, options);

    this.logger.log(`FAQ自動生成完了: ${clusteringResult.clusters.length}件のFAQ候補を生成`);
    return clusteringResult.clusters;
  }

  /**
   * FAQ自動生成プレビュー
   * 要件: 6.2 (FAQ項目の自動生成とプレビュー機能)
   */
  async previewGeneratedFAQ(appId: string, options: FAQGenerationOptions): Promise<{
    clusters: FAQCluster[];
    statistics: {
      totalInquiries: number;
      clusteredInquiries: number;
      unclustered: number;
      generatedFAQs: number;
    };
  }> {
    this.logger.log(`FAQ自動生成プレビュー開始: appId=${appId}`);

    // アプリケーション存在確認
    const application = await this.applicationRepository.findOne({
      where: { id: appId }
    });

    if (!application) {
      throw new NotFoundException(`アプリケーションが見つかりません: ${appId}`);
    }

    // クラスタリング実行
    const clusteringResult = await this.faqClusteringService.clusterInquiries(appId, options);

    const statistics = {
      totalInquiries: clusteringResult.totalInquiries,
      clusteredInquiries: clusteringResult.clusteredInquiries,
      unclustered: clusteringResult.unclustered.length,
      generatedFAQs: clusteringResult.clusters.length,
    };

    this.logger.log(`FAQ自動生成プレビュー完了: ${statistics.generatedFAQs}件のFAQ候補`);

    return {
      clusters: clusteringResult.clusters,
      statistics
    };
  }

  /**
   * 自動生成されたFAQクラスタからFAQを作成
   * 要件: 6.2 (FAQ項目の自動生成)
   */
  async createFAQFromCluster(
    appId: string,
    cluster: FAQCluster,
    options?: {
      isPublished?: boolean;
      category?: string;
      tags?: string[];
    }
  ): Promise<FAQResponseDto> {
    this.logger.log(`クラスタからFAQ作成: clusterId=${cluster.id}`);

    // アプリケーション存在確認
    const application = await this.applicationRepository.findOne({
      where: { id: appId }
    });

    if (!application) {
      throw new NotFoundException(`アプリケーションが見つかりません: ${appId}`);
    }

    // FAQ作成データの準備
    const createFAQDto: CreateFAQDto = {
      appId,
      question: cluster.representativeQuestion,
      answer: cluster.suggestedAnswer,
      category: options?.category || cluster.category,
      tags: options?.tags || this.generateTagsFromCluster(cluster),
      isPublished: options?.isPublished || false,
    };

    // FAQ作成
    const faq = await this.createFAQ(createFAQDto);

    this.logger.log(`クラスタからFAQ作成完了: faqId=${faq.id}`);
    return faq;
  }

  /**
   * 複数のクラスタから一括でFAQを作成
   * 要件: 6.2 (FAQ項目の自動生成)
   */
  async createFAQsFromClusters(
    appId: string,
    clusters: FAQCluster[],
    options?: {
      isPublished?: boolean;
      autoPublishThreshold?: number; // 信頼度がこの値以上の場合は自動公開
    }
  ): Promise<{
    created: FAQResponseDto[];
    failed: { cluster: FAQCluster; error: string }[];
  }> {
    this.logger.log(`複数クラスタからFAQ一括作成: ${clusters.length}件`);

    const created: FAQResponseDto[] = [];
    const failed: { cluster: FAQCluster; error: string }[] = [];

    for (const cluster of clusters) {
      try {
        // 信頼度に基づく自動公開判定
        const shouldPublish = options?.isPublished || 
          (options?.autoPublishThreshold && cluster.confidence >= options.autoPublishThreshold);

        const faq = await this.createFAQFromCluster(appId, cluster, {
          isPublished: shouldPublish,
        });

        created.push(faq);
      } catch (error) {
        this.logger.error(`クラスタからFAQ作成エラー: clusterId=${cluster.id}`, error);
        failed.push({
          cluster,
          error: error instanceof Error ? error.message : '不明なエラー'
        });
      }
    }

    this.logger.log(`複数クラスタからFAQ一括作成完了: 成功=${created.length}件, 失敗=${failed.length}件`);

    return { created, failed };
  }

  /**
   * クラスタからタグを生成
   */
  private generateTagsFromCluster(cluster: FAQCluster): string[] {
    const tags: string[] = [];

    // カテゴリをタグに追加
    if (cluster.category) {
      tags.push(cluster.category);
    }

    // 質問から重要なキーワードを抽出
    const keywords = this.extractKeywordsFromText(cluster.representativeQuestion);
    tags.push(...keywords);

    // 回答から重要なキーワードを抽出
    const answerKeywords = this.extractKeywordsFromText(cluster.suggestedAnswer);
    tags.push(...answerKeywords.slice(0, 2)); // 最大2個まで

    // 重複除去と制限
    const uniqueTags = Array.from(new Set(tags));
    return uniqueTags.slice(0, 5); // 最大5個まで
  }

  /**
   * テキストからキーワードを抽出
   */
  private extractKeywordsFromText(text: string): string[] {
    const keywords: string[] = [];

    // 技術的なキーワード
    const techKeywords = [
      'ログイン', 'パスワード', 'エラー', '設定', 'インストール', 'アップデート',
      'アカウント', '登録', '削除', '変更', '確認', '通知', 'データ', 'ファイル',
      '同期', 'バックアップ', '復元', '接続', 'ネットワーク', 'セキュリティ'
    ];

    for (const keyword of techKeywords) {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    }

    return keywords;
  }

  /**
   * エンティティをレスポンスDTOに変換
   */
  private mapToResponseDto(faq: FAQ): FAQResponseDto {
    return {
      id: faq.id,
      appId: faq.appId,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags,
      orderIndex: faq.orderIndex,
      isPublished: faq.isPublished,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
      application: faq.application ? {
        id: faq.application.id,
        name: faq.application.name,
        description: faq.application.description,
      } : undefined,
    };
  }
}