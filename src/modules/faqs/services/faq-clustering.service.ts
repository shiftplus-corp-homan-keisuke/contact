/**
 * FAQ自動生成のためのクラスタリングサービス
 * 要件: 6.1, 6.2 (問い合わせクラスタリングアルゴリズムの実装)
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../../../common/entities/inquiry.entity';
import { Response } from '../../../common/entities/response.entity';
import { VectorService } from '../../search/services/vector.service';
import { FAQGenerationOptions, FAQCluster } from '../../../common/types/faq.types';

export interface InquiryClusterData {
  id: string;
  title: string;
  content: string;
  category?: string;
  responses: {
    id: string;
    content: string;
    isPublic: boolean;
  }[];
  vector?: number[];
}

export interface ClusteringResult {
  clusters: FAQCluster[];
  totalInquiries: number;
  clusteredInquiries: number;
  unclustered: string[];
}

@Injectable()
export class FAQClusteringService {
  private readonly logger = new Logger(FAQClusteringService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @InjectRepository(Response)
    private readonly responseRepository: Repository<Response>,
    private readonly vectorService: VectorService,
  ) {}

  /**
   * 問い合わせクラスタリングの実行
   * 要件: 6.1 (問い合わせクラスタリングアルゴリズムの実装)
   */
  async clusterInquiries(
    appId: string,
    options: FAQGenerationOptions
  ): Promise<ClusteringResult> {
    this.logger.log(`問い合わせクラスタリング開始: appId=${appId}`);

    // 1. 対象問い合わせの取得
    const inquiries = await this.getInquiriesForClustering(appId, options);
    
    if (inquiries.length < options.minClusterSize) {
      this.logger.warn(`クラスタリング対象の問い合わせが不足: ${inquiries.length}件`);
      return {
        clusters: [],
        totalInquiries: inquiries.length,
        clusteredInquiries: 0,
        unclustered: inquiries.map(i => i.id)
      };
    }

    // 2. ベクトル化
    const inquiriesWithVectors = await this.vectorizeInquiries(inquiries);

    // 3. クラスタリング実行
    const clusters = await this.performClustering(inquiriesWithVectors, options);

    // 4. FAQ候補の生成
    const faqClusters = await this.generateFAQCandidates(clusters, inquiriesWithVectors);

    const clusteredInquiryIds = new Set(
      faqClusters.flatMap(cluster => cluster.inquiries)
    );
    const unclustered = inquiries
      .filter(inquiry => !clusteredInquiryIds.has(inquiry.id))
      .map(inquiry => inquiry.id);

    this.logger.log(`クラスタリング完了: ${faqClusters.length}クラスタ, ${clusteredInquiryIds.size}件クラスタ化`);

    return {
      clusters: faqClusters,
      totalInquiries: inquiries.length,
      clusteredInquiries: clusteredInquiryIds.size,
      unclustered
    };
  }

  /**
   * クラスタリング対象の問い合わせ取得
   */
  private async getInquiriesForClustering(
    appId: string,
    options: FAQGenerationOptions
  ): Promise<InquiryClusterData[]> {
    const queryBuilder = this.inquiryRepository
      .createQueryBuilder('inquiry')
      .leftJoinAndSelect('inquiry.responses', 'response')
      .where('inquiry.appId = :appId', { appId })
      .andWhere('inquiry.status IN (:...statuses)', { 
        statuses: ['resolved', 'closed'] // 解決済みの問い合わせのみ
      });

    // 日付範囲フィルター
    if (options.dateRange) {
      queryBuilder
        .andWhere('inquiry.createdAt >= :startDate', { 
          startDate: options.dateRange.startDate 
        })
        .andWhere('inquiry.createdAt <= :endDate', { 
          endDate: options.dateRange.endDate 
        });
    }

    // カテゴリフィルター
    if (options.categories && options.categories.length > 0) {
      queryBuilder.andWhere('inquiry.category IN (:...categories)', { 
        categories: options.categories 
      });
    }

    const inquiries = await queryBuilder.getMany();

    return inquiries.map(inquiry => ({
      id: inquiry.id,
      title: inquiry.title,
      content: inquiry.content,
      category: inquiry.category,
      responses: inquiry.responses
        .filter(response => response.isPublic) // 公開回答のみ
        .map(response => ({
          id: response.id,
          content: response.content,
          isPublic: response.isPublic
        }))
    }));
  }

  /**
   * 問い合わせのベクトル化
   */
  private async vectorizeInquiries(
    inquiries: InquiryClusterData[]
  ): Promise<InquiryClusterData[]> {
    this.logger.log(`問い合わせベクトル化開始: ${inquiries.length}件`);

    const inquiriesWithVectors: InquiryClusterData[] = [];

    for (const inquiry of inquiries) {
      try {
        // タイトルと内容を結合してベクトル化
        const text = `${inquiry.title} ${inquiry.content}`;
        const vector = await this.vectorService.embedText(text);
        
        inquiriesWithVectors.push({
          ...inquiry,
          vector
        });
      } catch (error) {
        this.logger.error(`ベクトル化エラー: inquiryId=${inquiry.id}`, error);
        // ベクトル化に失敗した問い合わせは除外
      }
    }

    this.logger.log(`ベクトル化完了: ${inquiriesWithVectors.length}件`);
    return inquiriesWithVectors;
  }

  /**
   * K-meansクラスタリングの実行
   */
  private async performClustering(
    inquiries: InquiryClusterData[],
    options: FAQGenerationOptions
  ): Promise<number[][]> {
    this.logger.log(`クラスタリング実行開始: ${inquiries.length}件`);

    // 簡易K-meansアルゴリズムの実装
    const vectors = inquiries.map(inquiry => inquiry.vector!);
    const k = Math.min(options.maxClusters, Math.floor(inquiries.length / options.minClusterSize));
    
    if (k <= 1) {
      // クラスタ数が1以下の場合は全て1つのクラスタに
      return [Array.from({ length: inquiries.length }, (_, i) => i)];
    }

    // 初期中心点をランダムに選択
    const centroids = this.initializeCentroids(vectors, k);
    let clusters: number[][] = [];
    let previousClusters: number[][] = [];
    let iterations = 0;
    const maxIterations = 100;

    do {
      previousClusters = [...clusters];
      clusters = this.assignToClusters(vectors, centroids, options.similarityThreshold);
      
      // 空のクラスタを除去
      clusters = clusters.filter(cluster => cluster.length >= options.minClusterSize);
      
      if (clusters.length === 0) {
        break;
      }

      // 中心点を更新
      this.updateCentroids(vectors, clusters, centroids);
      
      iterations++;
    } while (
      iterations < maxIterations && 
      !this.clustersEqual(clusters, previousClusters)
    );

    this.logger.log(`クラスタリング完了: ${clusters.length}クラスタ, ${iterations}回反復`);
    return clusters;
  }

  /**
   * 初期中心点の設定
   */
  private initializeCentroids(vectors: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const vectorDim = vectors[0].length;
    
    // K-means++アルゴリズムで初期中心点を選択
    const usedIndices = new Set<number>();
    
    // 最初の中心点をランダムに選択
    const firstIndex = Math.floor(Math.random() * vectors.length);
    centroids.push([...vectors[firstIndex]]);
    usedIndices.add(firstIndex);
    
    // 残りの中心点を距離に基づいて選択
    for (let i = 1; i < k; i++) {
      const distances: number[] = [];
      
      for (let j = 0; j < vectors.length; j++) {
        if (usedIndices.has(j)) {
          distances.push(0);
          continue;
        }
        
        // 最も近い中心点との距離を計算
        let minDistance = Infinity;
        for (const centroid of centroids) {
          const distance = this.calculateDistance(vectors[j], centroid);
          minDistance = Math.min(minDistance, distance);
        }
        distances.push(minDistance);
      }
      
      // 距離に比例した確率で次の中心点を選択
      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      if (totalDistance === 0) break;
      
      let random = Math.random() * totalDistance;
      let selectedIndex = 0;
      
      for (let j = 0; j < distances.length; j++) {
        random -= distances[j];
        if (random <= 0) {
          selectedIndex = j;
          break;
        }
      }
      
      centroids.push([...vectors[selectedIndex]]);
      usedIndices.add(selectedIndex);
    }
    
    return centroids;
  }

  /**
   * ベクトルをクラスタに割り当て
   */
  private assignToClusters(
    vectors: number[][],
    centroids: number[][],
    threshold: number
  ): number[][] {
    const clusters: number[][] = Array.from({ length: centroids.length }, () => []);
    
    for (let i = 0; i < vectors.length; i++) {
      let bestCluster = 0;
      let bestSimilarity = -1;
      
      for (let j = 0; j < centroids.length; j++) {
        const similarity = this.calculateCosineSimilarity(vectors[i], centroids[j]);
        if (similarity > bestSimilarity && similarity >= threshold) {
          bestSimilarity = similarity;
          bestCluster = j;
        }
      }
      
      // 閾値を満たす場合のみクラスタに追加
      if (bestSimilarity >= threshold) {
        clusters[bestCluster].push(i);
      }
    }
    
    return clusters;
  }

  /**
   * 中心点の更新
   */
  private updateCentroids(
    vectors: number[][],
    clusters: number[][],
    centroids: number[][]
  ): void {
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].length === 0) continue;
      
      const vectorDim = vectors[0].length;
      const newCentroid = new Array(vectorDim).fill(0);
      
      // クラスタ内のベクトルの平均を計算
      for (const vectorIndex of clusters[i]) {
        for (let j = 0; j < vectorDim; j++) {
          newCentroid[j] += vectors[vectorIndex][j];
        }
      }
      
      for (let j = 0; j < vectorDim; j++) {
        newCentroid[j] /= clusters[i].length;
      }
      
      centroids[i] = newCentroid;
    }
  }

  /**
   * コサイン類似度の計算
   */
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * ユークリッド距離の計算
   */
  private calculateDistance(vectorA: number[], vectorB: number[]): number {
    let sum = 0;
    for (let i = 0; i < vectorA.length; i++) {
      const diff = vectorA[i] - vectorB[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * クラスタの等価性チェック
   */
  private clustersEqual(clusters1: number[][], clusters2: number[][]): boolean {
    if (clusters1.length !== clusters2.length) return false;
    
    for (let i = 0; i < clusters1.length; i++) {
      if (clusters1[i].length !== clusters2[i].length) return false;
      
      const sorted1 = [...clusters1[i]].sort();
      const sorted2 = [...clusters2[i]].sort();
      
      for (let j = 0; j < sorted1.length; j++) {
        if (sorted1[j] !== sorted2[j]) return false;
      }
    }
    
    return true;
  }

  /**
   * FAQ候補の生成
   * 要件: 6.2 (FAQ項目の自動生成とプレビュー機能)
   */
  private async generateFAQCandidates(
    clusters: number[][],
    inquiries: InquiryClusterData[]
  ): Promise<FAQCluster[]> {
    this.logger.log(`FAQ候補生成開始: ${clusters.length}クラスタ`);

    const faqClusters: FAQCluster[] = [];

    for (let i = 0; i < clusters.length; i++) {
      const clusterIndices = clusters[i];
      if (clusterIndices.length === 0) continue;

      const clusterInquiries = clusterIndices.map(index => inquiries[index]);
      
      // 代表的な質問を選択（最も短くて明確な質問）
      const representativeQuestion = this.selectRepresentativeQuestion(clusterInquiries);
      
      // 統合回答を生成
      const suggestedAnswer = this.generateSuggestedAnswer(clusterInquiries);
      
      // カテゴリを決定（最も多いカテゴリ）
      const category = this.determineCategory(clusterInquiries);
      
      // 信頼度を計算
      const confidence = this.calculateClusterConfidence(clusterInquiries);

      faqClusters.push({
        id: `cluster-${i}`,
        inquiries: clusterInquiries.map(inquiry => inquiry.id),
        representativeQuestion,
        suggestedAnswer,
        category,
        confidence
      });
    }

    this.logger.log(`FAQ候補生成完了: ${faqClusters.length}件`);
    return faqClusters;
  }

  /**
   * 代表的な質問の選択
   */
  private selectRepresentativeQuestion(inquiries: InquiryClusterData[]): string {
    // 最も短くて明確な質問を選択
    let bestQuestion = inquiries[0].title;
    let bestScore = this.calculateQuestionScore(bestQuestion);

    for (const inquiry of inquiries) {
      const score = this.calculateQuestionScore(inquiry.title);
      if (score > bestScore) {
        bestScore = score;
        bestQuestion = inquiry.title;
      }
    }

    return bestQuestion;
  }

  /**
   * 質問の品質スコア計算
   */
  private calculateQuestionScore(question: string): number {
    let score = 0;
    
    // 長さによるスコア（短すぎず長すぎない）
    const length = question.length;
    if (length >= 10 && length <= 100) {
      score += 10;
    } else if (length > 100) {
      score -= (length - 100) * 0.1;
    }
    
    // 疑問符の存在
    if (question.includes('?') || question.includes('？')) {
      score += 5;
    }
    
    // 疑問詞の存在
    const questionWords = ['何', 'どう', 'どの', 'いつ', 'どこ', 'なぜ', 'どれ'];
    for (const word of questionWords) {
      if (question.includes(word)) {
        score += 3;
        break;
      }
    }
    
    // 明確性（具体的な単語の存在）
    const specificWords = ['エラー', '問題', '方法', '設定', 'ログイン', '登録'];
    for (const word of specificWords) {
      if (question.includes(word)) {
        score += 2;
      }
    }
    
    return score;
  }

  /**
   * 統合回答の生成
   */
  private generateSuggestedAnswer(inquiries: InquiryClusterData[]): string {
    // 最も詳細で有用な回答を選択
    let bestAnswer = '';
    let bestScore = 0;

    for (const inquiry of inquiries) {
      for (const response of inquiry.responses) {
        const score = this.calculateAnswerScore(response.content);
        if (score > bestScore) {
          bestScore = score;
          bestAnswer = response.content;
        }
      }
    }

    // 回答が見つからない場合は基本的な回答を生成
    if (!bestAnswer) {
      bestAnswer = 'この問題については、サポートチームにお問い合わせください。';
    }

    return bestAnswer;
  }

  /**
   * 回答の品質スコア計算
   */
  private calculateAnswerScore(answer: string): number {
    let score = 0;
    
    // 長さによるスコア
    const length = answer.length;
    if (length >= 50 && length <= 1000) {
      score += 10;
    }
    
    // 有用な情報の存在
    const usefulWords = ['手順', '方法', '解決', '確認', '設定', '更新', 'インストール'];
    for (const word of usefulWords) {
      if (answer.includes(word)) {
        score += 2;
      }
    }
    
    // 構造化された回答（番号付きリストなど）
    if (answer.includes('1.') || answer.includes('①') || answer.includes('・')) {
      score += 5;
    }
    
    return score;
  }

  /**
   * カテゴリの決定
   */
  private determineCategory(inquiries: InquiryClusterData[]): string | undefined {
    const categoryCount = new Map<string, number>();
    
    for (const inquiry of inquiries) {
      if (inquiry.category) {
        const count = categoryCount.get(inquiry.category) || 0;
        categoryCount.set(inquiry.category, count + 1);
      }
    }
    
    if (categoryCount.size === 0) return undefined;
    
    // 最も多いカテゴリを返す
    let maxCount = 0;
    let mostCommonCategory = '';
    
    for (const [category, count] of categoryCount) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonCategory = category;
      }
    }
    
    return mostCommonCategory;
  }

  /**
   * クラスタの信頼度計算
   */
  private calculateClusterConfidence(inquiries: InquiryClusterData[]): number {
    // クラスタサイズによる基本信頼度
    let confidence = Math.min(inquiries.length / 10, 1.0);
    
    // 回答の存在による信頼度向上
    const inquiriesWithResponses = inquiries.filter(i => i.responses.length > 0);
    confidence *= inquiriesWithResponses.length / inquiries.length;
    
    // カテゴリの一致度による信頼度調整
    const categories = inquiries.map(i => i.category).filter(c => c);
    if (categories.length > 0) {
      const uniqueCategories = new Set(categories);
      confidence *= 1 - (uniqueCategories.size - 1) / categories.length;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }
}