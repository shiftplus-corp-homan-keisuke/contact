import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { VectorService } from '../../search/services/vector.service';
import { FAQGenerationOptions, FAQCluster } from '../types';
import { FAQ } from '../entities';

@Injectable()
export class FAQClusteringService {
    private readonly logger = new Logger(FAQClusteringService.name);

    constructor(
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(Response)
        private readonly responseRepository: Repository<Response>,
        private readonly vectorService: VectorService,
    ) { }

    /**
     * 問い合わせクラスタリングによるFAQ生成
     */
    async generateFAQClusters(
        appId: string,
        options: FAQGenerationOptions,
    ): Promise<FAQCluster[]> {
        this.logger.log(`FAQ生成開始: appId=${appId}`);

        try {
            // 1. 対象問い合わせの取得
            const inquiries = await this.getTargetInquiries(appId, options);

            if (inquiries.length < options.minClusterSize) {
                this.logger.warn(`問い合わせ数が不足: ${inquiries.length} < ${options.minClusterSize}`);
                return [];
            }

            // 2. 問い合わせのベクトル化
            const inquiryVectors = await this.vectorizeInquiries(inquiries);

            // 3. クラスタリング実行
            const clusters = await this.performClustering(
                inquiries,
                inquiryVectors,
                options,
            );

            // 4. FAQ候補の生成
            const faqClusters = await this.generateFAQFromClusters(clusters, options);

            this.logger.log(`FAQ生成完了: ${faqClusters.length}件のFAQ候補を生成`);
            return faqClusters;

        } catch (error) {
            this.logger.error('FAQ生成中にエラーが発生しました', error);
            throw error;
        }
    }

    /**
     * FAQ生成のプレビュー
     */
    async previewFAQGeneration(
        appId: string,
        options: FAQGenerationOptions,
    ): Promise<FAQCluster[]> {
        // プレビューは実際の生成と同じロジックを使用
        return this.generateFAQClusters(appId, options);
    }

    /**
     * 対象問い合わせの取得
     */
    private async getTargetInquiries(
        appId: string,
        options: FAQGenerationOptions,
    ): Promise<Inquiry[]> {
        const queryBuilder = this.inquiryRepository
            .createQueryBuilder('inquiry')
            .leftJoinAndSelect('inquiry.responses', 'response')
            .where('inquiry.appId = :appId', { appId })
            .andWhere('inquiry.status = :status', { status: 'resolved' }) // 解決済みのみ
            .andWhere('response.id IS NOT NULL'); // 回答があるもののみ

        // 日付範囲フィルタ
        if (options.dateRange) {
            queryBuilder
                .andWhere('inquiry.createdAt >= :startDate', { startDate: options.dateRange.startDate })
                .andWhere('inquiry.createdAt <= :endDate', { endDate: options.dateRange.endDate });
        }

        // カテゴリフィルタ
        if (options.categories && options.categories.length > 0) {
            queryBuilder.andWhere('inquiry.category IN (:...categories)', { categories: options.categories });
        }

        return queryBuilder
            .orderBy('inquiry.createdAt', 'DESC')
            .limit(1000) // 処理量制限
            .getMany();
    }

    /**
     * 問い合わせのベクトル化
     */
    private async vectorizeInquiries(inquiries: Inquiry[]): Promise<number[][]> {
        const vectors: number[][] = [];

        for (const inquiry of inquiries) {
            try {
                // タイトルと内容を結合してベクトル化
                const text = `${inquiry.title} ${inquiry.content}`;
                const vector = await this.vectorService.embedText(text);
                vectors.push(vector);
            } catch (error) {
                this.logger.warn(`問い合わせ ${inquiry.id} のベクトル化に失敗`, error);
                // ダミーベクトルを追加（ゼロベクトル）
                vectors.push(new Array(1536).fill(0));
            }
        }

        return vectors;
    }

    /**
     * K-meansクラスタリング実行
     */
    private async performClustering(
        inquiries: Inquiry[],
        vectors: number[][],
        options: FAQGenerationOptions,
    ): Promise<Array<{ inquiries: Inquiry[]; centroid: number[] }>> {
        const k = Math.min(options.maxClusters, Math.floor(inquiries.length / options.minClusterSize));

        if (k < 1) {
            return [];
        }

        // 簡単なK-meansアルゴリズムの実装
        const clusters = this.kMeansClustering(vectors, k, options.similarityThreshold);

        // クラスタに問い合わせを割り当て
        const result: Array<{ inquiries: Inquiry[]; centroid: number[] }> = [];

        for (let i = 0; i < k; i++) {
            const clusterInquiries: Inquiry[] = [];

            clusters.assignments.forEach((clusterIndex, inquiryIndex) => {
                if (clusterIndex === i) {
                    clusterInquiries.push(inquiries[inquiryIndex]);
                }
            });

            // 最小クラスタサイズを満たすもののみ追加
            if (clusterInquiries.length >= options.minClusterSize) {
                result.push({
                    inquiries: clusterInquiries,
                    centroid: clusters.centroids[i],
                });
            }
        }

        return result;
    }

    /**
     * K-meansクラスタリングアルゴリズム
     */
    private kMeansClustering(
        vectors: number[][],
        k: number,
        threshold: number,
    ): { centroids: number[][]; assignments: number[] } {
        const dimension = vectors[0].length;
        const maxIterations = 100;

        // 初期セントロイドをランダムに選択
        const centroids: number[][] = [];
        for (let i = 0; i < k; i++) {
            const randomIndex = Math.floor(Math.random() * vectors.length);
            centroids.push([...vectors[randomIndex]]);
        }

        let assignments = new Array(vectors.length).fill(0);
        let converged = false;
        let iteration = 0;

        while (!converged && iteration < maxIterations) {
            const newAssignments = new Array(vectors.length);

            // 各ベクトルを最も近いセントロイドに割り当て
            for (let i = 0; i < vectors.length; i++) {
                let minDistance = Infinity;
                let bestCluster = 0;

                for (let j = 0; j < k; j++) {
                    const distance = this.cosineSimilarity(vectors[i], centroids[j]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestCluster = j;
                    }
                }

                newAssignments[i] = bestCluster;
            }

            // セントロイドを更新
            for (let i = 0; i < k; i++) {
                const clusterVectors = vectors.filter((_, index) => newAssignments[index] === i);

                if (clusterVectors.length > 0) {
                    for (let j = 0; j < dimension; j++) {
                        centroids[i][j] = clusterVectors.reduce((sum, vec) => sum + vec[j], 0) / clusterVectors.length;
                    }
                }
            }

            // 収束判定
            converged = assignments.every((assignment, index) => assignment === newAssignments[index]);
            assignments = newAssignments;
            iteration++;
        }

        return { centroids, assignments };
    }

    /**
     * コサイン類似度計算
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }

        return 1 - (dotProduct / (magnitudeA * magnitudeB)); // 距離として使用するため1から引く
    }

    /**
     * クラスタからFAQ候補を生成
     */
    private async generateFAQFromClusters(
        clusters: Array<{ inquiries: Inquiry[]; centroid: number[] }>,
        options: FAQGenerationOptions,
    ): Promise<FAQCluster[]> {
        const faqClusters: FAQCluster[] = [];

        for (let i = 0; i < clusters.length; i++) {
            const cluster = clusters[i];

            try {
                // 代表的な質問を選択（最も短くて明確なもの）
                const representativeInquiry = this.selectRepresentativeInquiry(cluster.inquiries);

                // 最も良い回答を選択
                const bestResponse = await this.selectBestResponse(cluster.inquiries);

                if (representativeInquiry && bestResponse) {
                    // 類似度スコアを計算
                    const similarity = this.calculateClusterSimilarity(cluster.inquiries);

                    faqClusters.push({
                        id: `cluster-${i}`,
                        inquiryIds: cluster.inquiries.map(inq => inq.id),
                        representativeQuestion: representativeInquiry.title,
                        suggestedAnswer: bestResponse.content,
                        similarity,
                        category: this.determineCategory(cluster.inquiries),
                    });
                }
            } catch (error) {
                this.logger.warn(`クラスタ ${i} のFAQ生成に失敗`, error);
            }
        }

        return faqClusters;
    }

    /**
     * 代表的な問い合わせを選択
     */
    private selectRepresentativeInquiry(inquiries: Inquiry[]): Inquiry | null {
        if (inquiries.length === 0) return null;

        // タイトルの長さと明確さで評価
        return inquiries.reduce((best, current) => {
            const bestScore = this.calculateQuestionScore(best);
            const currentScore = this.calculateQuestionScore(current);
            return currentScore > bestScore ? current : best;
        });
    }

    /**
     * 質問のスコアを計算
     */
    private calculateQuestionScore(inquiry: Inquiry): number {
        let score = 0;

        // タイトルの長さ（適度な長さが良い）
        const titleLength = inquiry.title.length;
        if (titleLength >= 10 && titleLength <= 100) {
            score += 10;
        }

        // 疑問符の存在
        if (inquiry.title.includes('?') || inquiry.title.includes('？')) {
            score += 5;
        }

        // 一般的な質問キーワード
        const questionWords = ['どう', 'なぜ', 'いつ', 'どこ', 'だれ', 'なに', 'how', 'why', 'when', 'where', 'who', 'what'];
        if (questionWords.some(word => inquiry.title.toLowerCase().includes(word))) {
            score += 5;
        }

        return score;
    }

    /**
     * 最適な回答を選択
     */
    private async selectBestResponse(inquiries: Inquiry[]): Promise<Response | null> {
        const allResponses: Response[] = [];

        for (const inquiry of inquiries) {
            if (inquiry.responses && inquiry.responses.length > 0) {
                allResponses.push(...inquiry.responses);
            }
        }

        if (allResponses.length === 0) return null;

        // 回答の品質でソート
        return allResponses.reduce((best, current) => {
            const bestScore = this.calculateResponseScore(best);
            const currentScore = this.calculateResponseScore(current);
            return currentScore > bestScore ? current : best;
        });
    }

    /**
     * 回答のスコアを計算
     */
    private calculateResponseScore(response: Response): number {
        let score = 0;

        // 回答の長さ（適度な長さが良い）
        const contentLength = response.content.length;
        if (contentLength >= 50 && contentLength <= 1000) {
            score += 10;
        }

        // 公開回答は優先
        if (response.isPublic) {
            score += 5;
        }

        // 構造化された回答（箇条書きなど）
        if (response.content.includes('・') || response.content.includes('-') || response.content.includes('1.')) {
            score += 3;
        }

        return score;
    }

    /**
     * クラスタの類似度を計算
     */
    private calculateClusterSimilarity(inquiries: Inquiry[]): number {
        if (inquiries.length < 2) return 1.0;

        // 簡単な類似度計算（キーワードの重複度）
        const allTitles = inquiries.map(inq => inq.title.toLowerCase());
        const commonWords = this.findCommonWords(allTitles);

        return Math.min(1.0, commonWords.length / 5); // 最大5個の共通語で正規化
    }

    /**
     * 共通語を見つける
     */
    private findCommonWords(titles: string[]): string[] {
        const wordCounts = new Map<string, number>();

        titles.forEach(title => {
            const words = title.split(/\s+/).filter(word => word.length > 2);
            words.forEach(word => {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            });
        });

        const threshold = Math.ceil(titles.length * 0.5); // 50%以上で出現
        return Array.from(wordCounts.entries())
            .filter(([_, count]) => count >= threshold)
            .map(([word, _]) => word);
    }

    /**
     * カテゴリを決定
     */
    private determineCategory(inquiries: Inquiry[]): string | undefined {
        const categories = inquiries
            .map(inq => inq.category)
            .filter(Boolean);

        if (categories.length === 0) return undefined;

        // 最も多いカテゴリを選択
        const categoryCount = new Map<string, number>();
        categories.forEach(category => {
            categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
        });

        return Array.from(categoryCount.entries())
            .sort(([, a], [, b]) => b - a)[0][0];
    }
}