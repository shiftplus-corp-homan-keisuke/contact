import { Test, TestingModule } from '@nestjs/testing';
import { HybridSearchService } from '../services/hybrid-search.service';
import { SearchService } from '../services/search.service';
import { VectorService, VectorSearchResult } from '../services/vector.service';
import { FullTextSearchResult, PaginatedResult } from '../types/search.types';

describe('HybridSearchService', () => {
    let service: HybridSearchService;
    let searchService: jest.Mocked<SearchService>;
    let vectorService: jest.Mocked<VectorService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HybridSearchService,
                {
                    provide: SearchService,
                    useValue: {
                        fullTextSearch: jest.fn(),
                    },
                },
                {
                    provide: VectorService,
                    useValue: {
                        embedText: jest.fn(),
                        vectorSearch: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<HybridSearchService>(HybridSearchService);
        searchService = module.get(SearchService);
        vectorService = module.get(VectorService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('hybridSearch', () => {
        it('ハイブリッド検索が正常に実行できること', async () => {
            // Arrange
            const query = 'テスト検索';
            const options = {
                vectorWeight: 0.6,
                textWeight: 0.4,
                limit: 10,
            };

            const mockTextResults: FullTextSearchResult[] = [
                {
                    id: 'text-1',
                    title: 'テスト問い合わせ1',
                    content: 'テスト内容1',
                    type: 'inquiry',
                    score: 0.8,
                    highlights: ['テスト'],
                    metadata: { appId: 'app-1', category: 'technical' },
                    createdAt: new Date('2024-01-01'),
                },
                {
                    id: 'text-2',
                    title: 'テスト問い合わせ2',
                    content: 'テスト内容2',
                    type: 'response',
                    score: 0.6,
                    highlights: ['テスト'],
                    metadata: { appId: 'app-1', category: 'general' },
                    createdAt: new Date('2024-01-02'),
                },
            ];

            const mockVectorResults: VectorSearchResult[] = [
                {
                    id: 'vector-1',
                    score: 0.9,
                    metadata: {
                        id: 'vector-1',
                        type: 'faq',
                        appId: 'app-1',
                        category: 'technical',
                        title: 'ベクトル検索結果1',
                        createdAt: '2024-01-03T00:00:00Z',
                    },
                },
                {
                    id: 'text-1', // 重複するID
                    score: 0.7,
                    metadata: {
                        id: 'text-1',
                        type: 'inquiry',
                        appId: 'app-1',
                        category: 'technical',
                        title: 'テスト問い合わせ1',
                        createdAt: '2024-01-01T00:00:00Z',
                    },
                },
            ];

            const mockTextSearchResult: PaginatedResult<FullTextSearchResult> = {
                items: mockTextResults,
                total: 2,
                page: 1,
                limit: 20,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
            };

            searchService.fullTextSearch.mockResolvedValue(mockTextSearchResult);
            vectorService.embedText.mockResolvedValue(new Array(1536).fill(0.5));
            vectorService.vectorSearch.mockResolvedValue(mockVectorResults);

            // Act
            const result = await service.hybridSearch(query, options);

            // Assert
            expect(result).toBeDefined();
            expect(result.items).toHaveLength(3); // text-1, text-2, vector-1
            expect(result.total).toBe(3);

            // text-1は両方の検索結果に含まれるため、統合スコアが高くなる
            const text1Result = result.items.find(item => item.id === 'text-1');
            expect(text1Result).toBeDefined();
            expect(text1Result?.vectorScore).toBeGreaterThan(0);
            expect(text1Result?.textScore).toBeGreaterThan(0);
            expect(text1Result?.combinedScore).toBeGreaterThan(0);

            // vector-1はベクトル検索のみ
            const vector1Result = result.items.find(item => item.id === 'vector-1');
            expect(vector1Result).toBeDefined();
            expect(vector1Result?.vectorScore).toBeGreaterThan(0);
            expect(vector1Result?.textScore).toBe(0);

            // text-2は全文検索のみ
            const text2Result = result.items.find(item => item.id === 'text-2');
            expect(text2Result).toBeDefined();
            expect(text2Result?.vectorScore).toBe(0);
            expect(text2Result?.textScore).toBeGreaterThan(0);
        });

        it('重みが正しく適用されること', async () => {
            // Arrange
            const query = 'テスト';
            const options = {
                vectorWeight: 0.8,
                textWeight: 0.2,
                limit: 10,
            };

            const mockTextResults: FullTextSearchResult[] = [
                {
                    id: 'same-id',
                    title: 'テスト',
                    content: 'テスト内容',
                    type: 'inquiry',
                    score: 1.0, // 最高スコア
                    highlights: ['テスト'],
                    metadata: { appId: 'app-1' },
                    createdAt: new Date('2024-01-01'),
                },
            ];

            const mockVectorResults: VectorSearchResult[] = [
                {
                    id: 'same-id',
                    score: 1.0, // 最高スコア
                    metadata: {
                        id: 'same-id',
                        type: 'inquiry',
                        appId: 'app-1',
                        title: 'テスト',
                        createdAt: '2024-01-01T00:00:00Z',
                    },
                },
            ];

            searchService.fullTextSearch.mockResolvedValue({
                items: mockTextResults,
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
            });
            vectorService.embedText.mockResolvedValue(new Array(1536).fill(0.5));
            vectorService.vectorSearch.mockResolvedValue(mockVectorResults);

            // Act
            const result = await service.hybridSearch(query, options);

            // Assert
            expect(result.items).toHaveLength(1);
            const item = result.items[0];

            // 正規化されたスコアは1.0、重みは0.8と0.2なので、統合スコアは1.0になる
            expect(item.combinedScore).toBeCloseTo(1.0, 2);
            expect(item.vectorScore).toBe(1.0); // 正規化後
            expect(item.textScore).toBe(1.0);   // 正規化後
        });

        it('検索エラーが発生しても処理が続行されること', async () => {
            // Arrange
            const query = 'テスト';
            const options = {
                vectorWeight: 0.5,
                textWeight: 0.5,
                limit: 10,
            };

            // 全文検索でエラー
            searchService.fullTextSearch.mockRejectedValue(new Error('Full text search error'));

            // ベクトル検索は成功
            vectorService.embedText.mockResolvedValue(new Array(1536).fill(0.5));
            vectorService.vectorSearch.mockResolvedValue([
                {
                    id: 'vector-1',
                    score: 0.8,
                    metadata: {
                        id: 'vector-1',
                        type: 'faq',
                        appId: 'app-1',
                        title: 'ベクトル結果',
                        createdAt: '2024-01-01T00:00:00Z',
                    },
                },
            ]);

            // Act
            const result = await service.hybridSearch(query, options);

            // Assert
            expect(result).toBeDefined();
            expect(result.items).toHaveLength(1);
            expect(result.items[0].id).toBe('vector-1');
            expect(result.items[0].vectorScore).toBeGreaterThan(0);
            expect(result.items[0].textScore).toBe(0);
        });
    });

    describe('rankSearchResults', () => {
        it('ユーザーコンテキストに基づいてランキングが適用されること', async () => {
            // Arrange
            const results = [
                {
                    id: 'result-1',
                    title: 'テスト1',
                    content: '内容1',
                    type: 'inquiry' as const,
                    vectorScore: 0.8,
                    textScore: 0.7,
                    combinedScore: 0.75,
                    highlights: [],
                    metadata: { appId: 'app-1', category: 'technical' },
                    createdAt: new Date('2024-01-01'),
                },
                {
                    id: 'result-2',
                    title: 'テスト2',
                    content: '内容2',
                    type: 'faq' as const,
                    vectorScore: 0.9,
                    textScore: 0.8,
                    combinedScore: 0.85,
                    highlights: [],
                    metadata: { appId: 'app-2', category: 'general' },
                    createdAt: new Date('2024-01-02'),
                },
            ];

            const userContext = {
                appId: 'app-1',
                recentCategories: ['technical'],
                preferredTypes: ['inquiry'],
            };

            // Act
            const rankedResults = await service.rankSearchResults(results, 'テスト', userContext);

            // Assert
            expect(rankedResults).toHaveLength(2);

            // result-1はユーザーコンテキストにマッチするため、ブーストされて上位になる
            expect(rankedResults[0].id).toBe('result-1');
            expect(rankedResults[0].combinedScore).toBeGreaterThan(0.75); // ブーストされている

            expect(rankedResults[1].id).toBe('result-2');
        });

        it('コンテキストなしでも正常に動作すること', async () => {
            // Arrange
            const results = [
                {
                    id: 'result-1',
                    title: 'テスト1',
                    content: '内容1',
                    type: 'inquiry' as const,
                    vectorScore: 0.7,
                    textScore: 0.6,
                    combinedScore: 0.65,
                    highlights: [],
                    metadata: { appId: 'app-1' },
                    createdAt: new Date('2024-01-01'),
                },
                {
                    id: 'result-2',
                    title: 'テスト2',
                    content: '内容2',
                    type: 'faq' as const,
                    vectorScore: 0.8,
                    textScore: 0.7,
                    combinedScore: 0.75,
                    highlights: [],
                    metadata: { appId: 'app-2' },
                    createdAt: new Date('2024-01-02'),
                },
            ];

            // Act
            const rankedResults = await service.rankSearchResults(results, 'テスト');

            // Assert
            expect(rankedResults).toHaveLength(2);
            // 元のスコア順が維持される
            expect(rankedResults[0].id).toBe('result-2');
            expect(rankedResults[1].id).toBe('result-1');
        });
    });

    describe('getSearchStats', () => {
        it('検索統計を取得できること', () => {
            // Act
            const stats = service.getSearchStats();

            // Assert
            expect(stats).toBeDefined();
            expect(stats.totalSearches).toBeDefined();
            expect(stats.averageResponseTime).toBeDefined();
            expect(stats.popularQueries).toBeDefined();
        });
    });
});