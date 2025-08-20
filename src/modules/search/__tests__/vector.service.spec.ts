import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VectorService } from '../services/vector.service';
import axios from 'axios';

// axiosをモック化
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VectorService', () => {
    let service: VectorService;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VectorService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            const config = {
                                'openai.apiKey': 'test-api-key',
                                'openai.embeddingModel': 'text-embedding-3-small',
                                'openai.timeout': 30000,
                                'vector.faiss.dimension': 1536,
                                'vector.faiss.indexType': 'IndexFlatIP',
                                'vector.faiss.metricType': 'METRIC_INNER_PRODUCT',
                                'vector.faiss.nlist': 100,
                                'vector.faiss.nprobe': 10,
                                'vector.faiss.indexPath': './test/faiss_index',
                                'vector.search.defaultLimit': 10,
                                'vector.search.similarityThreshold': 0.7,
                            };
                            return config[key] || defaultValue;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<VectorService>(VectorService);
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('embedText', () => {
        it('テキストを正常にベクトル化できること', async () => {
            // Arrange
            const testText = 'テストテキスト';
            const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());

            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: [{ embedding: mockEmbedding }],
                },
            });

            // Act
            const result = await service.embedText(testText);

            // Assert
            expect(result).toEqual(mockEmbedding);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.openai.com/v1/embeddings',
                {
                    input: testText,
                    model: 'text-embedding-3-small',
                },
                {
                    headers: {
                        'Authorization': 'Bearer test-api-key',
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );
        });

        it('APIキーが設定されていない場合エラーが発生すること', async () => {
            // Arrange
            configService.get.mockImplementation((key: string) => {
                if (key === 'openai.apiKey') return undefined;
                return 'default-value';
            });

            // Act & Assert
            await expect(service.embedText('test')).rejects.toThrow('OpenAI API key is not configured');
        });

        it('不正な次元数の場合エラーが発生すること', async () => {
            // Arrange
            const mockEmbedding = new Array(100).fill(0); // 不正な次元数

            mockedAxios.post.mockResolvedValueOnce({
                data: {
                    data: [{ embedding: mockEmbedding }],
                },
            });

            // Act & Assert
            await expect(service.embedText('test')).rejects.toThrow('Invalid embedding dimension');
        });
    });

    describe('storeVector', () => {
        it('ベクトルを正常に保存できること', async () => {
            // Arrange
            const id = 'test-id';
            const vector = new Array(1536).fill(0.5);
            const metadata = {
                id,
                type: 'inquiry' as const,
                appId: 'app-1',
                category: 'technical',
                createdAt: '2024-01-01T00:00:00Z',
                title: 'テスト問い合わせ',
            };

            // Act
            await service.storeVector(id, vector, metadata);

            // Assert
            const stats = service.getStats();
            expect(stats.totalVectors).toBe(1);
        });

        it('不正な次元数の場合エラーが発生すること', async () => {
            // Arrange
            const id = 'test-id';
            const vector = new Array(100).fill(0.5); // 不正な次元数
            const metadata = {
                id,
                type: 'inquiry' as const,
                appId: 'app-1',
                createdAt: '2024-01-01T00:00:00Z',
            };

            // Act & Assert
            await expect(service.storeVector(id, vector, metadata)).rejects.toThrow('Vector dimension mismatch');
        });
    });

    describe('vectorSearch', () => {
        beforeEach(async () => {
            // テストデータを準備
            const vector1 = new Array(1536).fill(0.8);
            const vector2 = new Array(1536).fill(0.6);
            const vector3 = new Array(1536).fill(0.4);

            await service.storeVector('id1', vector1, {
                id: 'id1',
                type: 'inquiry',
                appId: 'app-1',
                createdAt: '2024-01-01T00:00:00Z',
                title: 'テスト1',
            });

            await service.storeVector('id2', vector2, {
                id: 'id2',
                type: 'response',
                appId: 'app-1',
                createdAt: '2024-01-02T00:00:00Z',
                title: 'テスト2',
            });

            await service.storeVector('id3', vector3, {
                id: 'id3',
                type: 'faq',
                appId: 'app-2',
                createdAt: '2024-01-03T00:00:00Z',
                title: 'テスト3',
            });
        });

        it('ベクトル検索が正常に実行できること', async () => {
            // Arrange
            const queryVector = new Array(1536).fill(0.7);

            // Act
            const results = await service.vectorSearch(queryVector, 2);

            // Assert
            expect(results).toHaveLength(2);
            expect(results[0].score).toBeGreaterThanOrEqual(results[1].score); // スコア順にソートされている
            expect(results[0].metadata).toBeDefined();
        });

        it('制限数が正しく適用されること', async () => {
            // Arrange
            const queryVector = new Array(1536).fill(0.5);

            // Act
            const results = await service.vectorSearch(queryVector, 1);

            // Assert
            expect(results).toHaveLength(1);
        });

        it('不正な次元数の場合エラーが発生すること', async () => {
            // Arrange
            const queryVector = new Array(100).fill(0.5); // 不正な次元数

            // Act & Assert
            await expect(service.vectorSearch(queryVector)).rejects.toThrow('Query vector dimension mismatch');
        });
    });

    describe('ragSearch', () => {
        beforeEach(async () => {
            // テストデータを準備
            const vector1 = new Array(1536).fill(0.9);
            const vector2 = new Array(1536).fill(0.8);

            await service.storeVector('id1', vector1, {
                id: 'id1',
                type: 'inquiry',
                appId: 'app-1',
                category: 'technical',
                createdAt: '2024-01-01T00:00:00Z',
                title: 'テスト問い合わせ1',
            });

            await service.storeVector('id2', vector2, {
                id: 'id2',
                type: 'response',
                appId: 'app-1',
                category: 'general',
                createdAt: '2024-01-02T00:00:00Z',
                title: 'テスト回答2',
            });

            // embedTextをモック化
            const mockEmbedding = new Array(1536).fill(0.85);
            mockedAxios.post.mockResolvedValue({
                data: {
                    data: [{ embedding: mockEmbedding }],
                },
            });
        });

        it('RAG検索が正常に実行できること', async () => {
            // Act
            const result = await service.ragSearch('テスト検索');

            // Assert
            expect(result.query).toBe('テスト検索');
            expect(result.results).toBeDefined();
            expect(result.context).toBeDefined();
            expect(result.totalResults).toBeGreaterThanOrEqual(0);
        });

        it('アプリIDフィルターが正しく動作すること', async () => {
            // Act
            const result = await service.ragSearch('テスト検索', { appId: 'app-1' });

            // Assert
            expect(result.results.every(r => r.metadata.appId === 'app-1')).toBe(true);
        });

        it('カテゴリフィルターが正しく動作すること', async () => {
            // Act
            const result = await service.ragSearch('テスト検索', { category: 'technical' });

            // Assert
            expect(result.results.every(r => r.metadata.category === 'technical')).toBe(true);
        });
    });

    describe('deleteVector', () => {
        it('ベクトルを正常に削除できること', async () => {
            // Arrange
            const id = 'test-id';
            const vector = new Array(1536).fill(0.5);
            const metadata = {
                id,
                type: 'inquiry' as const,
                appId: 'app-1',
                createdAt: '2024-01-01T00:00:00Z',
            };

            await service.storeVector(id, vector, metadata);
            expect(service.getStats().totalVectors).toBe(1);

            // Act
            await service.deleteVector(id);

            // Assert
            expect(service.getStats().totalVectors).toBe(0);
        });
    });
});