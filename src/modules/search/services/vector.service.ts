import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// ベクトル検索関連の型定義
export interface VectorMetadata {
    id: string;
    type: 'inquiry' | 'response' | 'faq';
    appId: string;
    category?: string;
    status?: string;
    createdAt: string;
    title?: string;
}

export interface VectorSearchResult {
    id: string;
    score: number;
    metadata: VectorMetadata;
}

export interface RAGContext {
    appId?: string;
    category?: string;
    maxResults?: number;
}

export interface RAGResult {
    query: string;
    results: VectorSearchResult[];
    context: string;
    totalResults: number;
}

// Faissインデックス設定
export interface FaissIndexConfig {
    dimension: number;
    indexType: 'IndexFlatIP' | 'IndexIVFFlat' | 'IndexHNSWFlat';
    metricType: 'METRIC_INNER_PRODUCT' | 'METRIC_L2';
    nlist?: number;
    nprobe?: number;
}

// ベクトルデータストレージ（メモリ内実装）
interface VectorData {
    id: string;
    vector: number[];
    metadata: VectorMetadata;
}

@Injectable()
export class VectorService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(VectorService.name);
    private vectorStore: Map<string, VectorData> = new Map();
    private indexConfig: FaissIndexConfig;
    private indexPath: string;

    constructor(
        private readonly configService: ConfigService,
    ) {
        this.indexConfig = {
            dimension: this.configService.get<number>('vector.faiss.dimension', 1536),
            indexType: this.configService.get<string>('vector.faiss.indexType', 'IndexFlatIP') as any,
            metricType: this.configService.get<string>('vector.faiss.metricType', 'METRIC_INNER_PRODUCT') as any,
            nlist: this.configService.get<number>('vector.faiss.nlist', 100),
            nprobe: this.configService.get<number>('vector.faiss.nprobe', 10),
        };
        this.indexPath = this.configService.get<string>('vector.faiss.indexPath', './data/faiss_index');
    }

    async onModuleInit() {
        this.logger.log('ベクトルサービス初期化開始');
        await this.initializeIndex();
        await this.loadIndex();
        this.logger.log('ベクトルサービス初期化完了');
    }

    async onModuleDestroy() {
        this.logger.log('ベクトルサービス終了処理開始');
        await this.saveIndex();
        this.logger.log('ベクトルサービス終了処理完了');
    }

    /**
     * テキストをベクトル化する
     * 要件3.1対応: OpenAI Embeddings APIとの連携
     */
    async embedText(text: string): Promise<number[]> {
        try {
            const apiKey = this.configService.get<string>('openai.apiKey');
            const model = this.configService.get<string>('openai.embeddingModel', 'text-embedding-3-small');
            const timeout = this.configService.get<number>('openai.timeout', 30000);

            if (!apiKey) {
                throw new Error('OpenAI API key is not configured');
            }

            this.logger.debug(`テキストベクトル化開始: ${text.substring(0, 100)}...`);

            const response = await axios.post(
                'https://api.openai.com/v1/embeddings',
                {
                    input: text,
                    model: model,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: timeout,
                }
            );

            const embedding = response.data.data[0].embedding;

            if (!Array.isArray(embedding) || embedding.length !== this.indexConfig.dimension) {
                throw new Error(`Invalid embedding dimension: expected ${this.indexConfig.dimension}, got ${embedding.length}`);
            }

            this.logger.debug(`テキストベクトル化完了: 次元数=${embedding.length}`);
            return embedding;
        } catch (error) {
            this.logger.error(`テキストベクトル化エラー: ${error.message}`, error.stack);
            throw new Error(`Failed to embed text: ${error.message}`);
        }
    }

    /**
     * ベクトルを保存する
     * 要件3.1対応: ベクトル化と保存機能
     */
    async storeVector(id: string, vector: number[], metadata: VectorMetadata): Promise<void> {
        try {
            if (vector.length !== this.indexConfig.dimension) {
                throw new Error(`Vector dimension mismatch: expected ${this.indexConfig.dimension}, got ${vector.length}`);
            }

            // ベクトルを正規化（コサイン類似度用）
            const normalizedVector = this.normalizeVector(vector);

            const vectorData: VectorData = {
                id,
                vector: normalizedVector,
                metadata,
            };

            this.vectorStore.set(id, vectorData);
            this.logger.debug(`ベクトル保存完了: ID=${id}, type=${metadata.type}`);
        } catch (error) {
            this.logger.error(`ベクトル保存エラー: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * ベクトル検索を実行する
     * 要件3.2対応: 類似する問い合わせ・回答の検索
     */
    async vectorSearch(queryVector: number[], limit: number = 10): Promise<VectorSearchResult[]> {
        try {
            if (queryVector.length !== this.indexConfig.dimension) {
                throw new Error(`Query vector dimension mismatch: expected ${this.indexConfig.dimension}, got ${queryVector.length}`);
            }

            const normalizedQuery = this.normalizeVector(queryVector);
            const results: Array<{ id: string; score: number; metadata: VectorMetadata }> = [];

            // 全ベクトルとの類似度を計算
            for (const [id, vectorData] of this.vectorStore.entries()) {
                const similarity = this.calculateCosineSimilarity(normalizedQuery, vectorData.vector);
                results.push({
                    id,
                    score: similarity,
                    metadata: vectorData.metadata,
                });
            }

            // スコアでソートして上位を返す
            results.sort((a, b) => b.score - a.score);
            const topResults = results.slice(0, limit);

            this.logger.debug(`ベクトル検索完了: 検索件数=${this.vectorStore.size}, 結果件数=${topResults.length}`);
            return topResults;
        } catch (error) {
            this.logger.error(`ベクトル検索エラー: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * RAG検索を実行する
     * 要件3.2対応: RAG機能
     */
    async ragSearch(query: string, context: RAGContext = {}): Promise<RAGResult> {
        try {
            this.logger.log(`RAG検索開始: query="${query}"`);

            // クエリをベクトル化
            const queryVector = await this.embedText(query);

            // ベクトル検索を実行
            const maxResults = context.maxResults || this.configService.get<number>('vector.search.defaultLimit', 10);
            const searchResults = await this.vectorSearch(queryVector, maxResults * 2); // 多めに取得してフィルタリング

            // コンテキストフィルタリング
            let filteredResults = searchResults;
            if (context.appId) {
                filteredResults = filteredResults.filter(result => result.metadata.appId === context.appId);
            }
            if (context.category) {
                filteredResults = filteredResults.filter(result => result.metadata.category === context.category);
            }

            // 類似度閾値でフィルタリング
            const similarityThreshold = this.configService.get<number>('vector.search.similarityThreshold', 0.7);
            filteredResults = filteredResults.filter(result => result.score >= similarityThreshold);

            // 最終結果を制限
            const finalResults = filteredResults.slice(0, maxResults);

            // コンテキスト文字列を生成
            const contextString = finalResults
                .map(result => `[${result.metadata.type}] ${result.metadata.title || result.id}: Score=${result.score.toFixed(3)}`)
                .join('\n');

            const ragResult: RAGResult = {
                query,
                results: finalResults,
                context: contextString,
                totalResults: finalResults.length,
            };

            this.logger.log(`RAG検索完了: 結果件数=${finalResults.length}`);
            return ragResult;
        } catch (error) {
            this.logger.error(`RAG検索エラー: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * ベクトルを更新する
     */
    async updateVector(id: string, vector: number[], metadata: VectorMetadata): Promise<void> {
        await this.storeVector(id, vector, metadata);
    }

    /**
     * ベクトルを削除する
     */
    async deleteVector(id: string): Promise<void> {
        const deleted = this.vectorStore.delete(id);
        if (deleted) {
            this.logger.debug(`ベクトル削除完了: ID=${id}`);
        } else {
            this.logger.warn(`ベクトル削除失敗: ID=${id} (存在しません)`);
        }
    }

    /**
     * インデックスを初期化する
     */
    private async initializeIndex(): Promise<void> {
        try {
            // データディレクトリを作成
            const dataDir = path.dirname(this.indexPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
                this.logger.log(`データディレクトリ作成: ${dataDir}`);
            }

            this.logger.log(`Faissインデックス初期化: ${JSON.stringify(this.indexConfig)}`);
        } catch (error) {
            this.logger.error(`インデックス初期化エラー: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * インデックスをロードする
     * 要件3.1対応: Faissインデックスの永続化とロード機能
     */
    private async loadIndex(): Promise<void> {
        try {
            const indexFile = `${this.indexPath}.json`;

            if (fs.existsSync(indexFile)) {
                const data = fs.readFileSync(indexFile, 'utf8');
                const savedData = JSON.parse(data);

                // ベクトルストアを復元
                this.vectorStore.clear();
                for (const [id, vectorData] of Object.entries(savedData.vectors || {})) {
                    this.vectorStore.set(id, vectorData as VectorData);
                }

                this.logger.log(`インデックスロード完了: ${this.vectorStore.size}件のベクトル`);
            } else {
                this.logger.log('インデックスファイルが存在しません。新規作成します。');
            }
        } catch (error) {
            this.logger.error(`インデックスロードエラー: ${error.message}`, error.stack);
            // エラーが発生しても続行（新規作成として扱う）
        }
    }

    /**
     * インデックスを保存する
     * 要件3.1対応: Faissインデックスの永続化機能
     */
    private async saveIndex(): Promise<void> {
        try {
            const indexFile = `${this.indexPath}.json`;

            const saveData = {
                config: this.indexConfig,
                vectors: Object.fromEntries(this.vectorStore.entries()),
                timestamp: new Date().toISOString(),
            };

            fs.writeFileSync(indexFile, JSON.stringify(saveData, null, 2));
            this.logger.log(`インデックス保存完了: ${this.vectorStore.size}件のベクトル`);
        } catch (error) {
            this.logger.error(`インデックス保存エラー: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * ベクトルを正規化する（コサイン類似度用）
     */
    private normalizeVector(vector: number[]): number[] {
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (magnitude === 0) return vector;
        return vector.map(val => val / magnitude);
    }

    /**
     * コサイン類似度を計算する
     */
    private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
        if (vectorA.length !== vectorB.length) {
            throw new Error('Vector dimensions must match');
        }

        let dotProduct = 0;
        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
        }

        // 正規化済みベクトルの場合、内積がコサイン類似度
        return Math.max(0, Math.min(1, dotProduct));
    }

    /**
     * 統計情報を取得する
     */
    getStats(): { totalVectors: number; indexConfig: FaissIndexConfig } {
        return {
            totalVectors: this.vectorStore.size,
            indexConfig: this.indexConfig,
        };
    }
}