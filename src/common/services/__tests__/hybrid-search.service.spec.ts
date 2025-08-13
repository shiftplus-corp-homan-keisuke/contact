/**
 * ハイブリッド検索サービスのテスト
 * 要件: 8.3, 3.2 (ハイブリッド検索機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HybridSearchService } from '../../../modules/search/services/hybrid-search.service';
import { SearchService } from '../search.service';
import { VectorService } from '../../../modules/search/services/vector.service';
import { SearchInquiriesDto } from '../../dto/search.dto';
import { InquiryStatus, InquiryPriority } from '../../types/inquiry.types';
import { Inquiry } from '../../entities/inquiry.entity';

describe('HybridSearchService', () => {
  let service: HybridSearchService;
  let searchService: SearchService;
  let vectorService: VectorService;

  const mockInquiry: Partial<Inquiry> = {
    id: '1',
    title: 'ログインエラーについて',
    content: 'ログインできません',
    status: InquiryStatus.NEW,
    priority: InquiryPriority.HIGH,
    category: '技術的問題',
    appId: 'app-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockSearchService = {
    searchInquiries: jest.fn(),
  };

  const mockVectorService = {
    ragSearch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridSearchService,
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: VectorService,
          useValue: mockVectorService,
        },
      ],
    }).compile();

    service = module.get<HybridSearchService>(HybridSearchService);
    searchService = module.get<SearchService>(SearchService);
    vectorService = module.get<VectorService>(VectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hybridSearch', () => {
    it('全文検索とベクトル検索を組み合わせて実行できること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';
      searchDto.page = 1;
      searchDto.limit = 10;

      // 全文検索の結果をモック
      mockSearchService.searchInquiries.mockResolvedValue({
        items: [mockInquiry],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      // ベクトル検索の結果をモック
      mockVectorService.ragSearch.mockResolvedValue([
        {
          id: '1',
          score: 0.9,
          metadata: {
            id: '1',
            type: 'inquiry',
            appId: 'app-1',
            category: '技術的問題',
            status: 'new',
            createdAt: '2024-01-01T00:00:00.000Z',
            title: 'ログインエラーについて',
            content: 'ログインできません',
          },
          content: 'ログインエラーについて ログインできません',
        }
      ]);

      const result = await service.hybridSearch(searchDto);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].searchType).toBe('hybrid');
      expect(result.items[0].vectorScore).toBeDefined();
      expect(result.items[0].textScore).toBeDefined();
      expect(result.items[0].combinedScore).toBeDefined();
      expect(result.appliedFilters.vectorWeight).toBe(0.5);
      expect(result.appliedFilters.textWeight).toBe(0.5);
      expect(mockSearchService.searchInquiries).toHaveBeenCalled();
      expect(mockVectorService.ragSearch).toHaveBeenCalled();
    });

    it('ベクトル検索のみを使用できること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';
      searchDto.page = 1;
      searchDto.limit = 10;

      const options = {
        useVectorSearch: true,
        useTextSearch: false,
        vectorWeight: 1.0,
        textWeight: 0.0,
      };

      mockVectorService.ragSearch.mockResolvedValue([
        {
          id: '1',
          score: 0.9,
          metadata: {
            id: '1',
            type: 'inquiry',
            appId: 'app-1',
            createdAt: '2024-01-01T00:00:00.000Z',
            title: 'ログインエラーについて',
            content: 'ログインできません',
          },
          content: 'ログインエラーについて ログインできません',
        }
      ]);

      const result = await service.hybridSearch(searchDto, options);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].searchType).toBe('vector');
      expect(result.items[0].vectorScore).toBeDefined();
      expect(result.items[0].textScore).toBeUndefined();
      expect(result.appliedFilters.vectorWeight).toBe(1.0);
      expect(result.appliedFilters.textWeight).toBe(0.0);
      expect(mockSearchService.searchInquiries).not.toHaveBeenCalled();
      expect(mockVectorService.ragSearch).toHaveBeenCalled();
    });

    it('全文検索のみを使用できること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';
      searchDto.page = 1;
      searchDto.limit = 10;

      const options = {
        useVectorSearch: false,
        useTextSearch: true,
        vectorWeight: 0.0,
        textWeight: 1.0,
      };

      mockSearchService.searchInquiries.mockResolvedValue({
        items: [mockInquiry],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await service.hybridSearch(searchDto, options);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].searchType).toBe('text');
      expect(result.items[0].textScore).toBeDefined();
      expect(result.items[0].vectorScore).toBeUndefined();
      expect(result.appliedFilters.vectorWeight).toBe(0.0);
      expect(result.appliedFilters.textWeight).toBe(1.0);
      expect(mockSearchService.searchInquiries).toHaveBeenCalled();
      expect(mockVectorService.ragSearch).not.toHaveBeenCalled();
    });

    it('重み付けが正しく適用されること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';
      searchDto.page = 1;
      searchDto.limit = 10;

      const options = {
        vectorWeight: 0.7,
        textWeight: 0.3,
      };

      mockSearchService.searchInquiries.mockResolvedValue({
        items: [mockInquiry],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      mockVectorService.ragSearch.mockResolvedValue([
        {
          id: '1',
          score: 0.9,
          metadata: {
            id: '1',
            type: 'inquiry',
            appId: 'app-1',
            createdAt: '2024-01-01T00:00:00.000Z',
            title: 'ログインエラーについて',
            content: 'ログインできません',
          },
          content: 'ログインエラーについて ログインできません',
        }
      ]);

      const result = await service.hybridSearch(searchDto, options);

      expect(result.appliedFilters.vectorWeight).toBe(0.7);
      expect(result.appliedFilters.textWeight).toBe(0.3);
      expect(result.items[0].combinedScore).toBeGreaterThan(0);
    });

    it('検索エラーが発生しても他の検索方法は継続されること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';
      searchDto.page = 1;
      searchDto.limit = 10;

      // 全文検索でエラーが発生
      mockSearchService.searchInquiries.mockRejectedValue(new Error('全文検索エラー'));

      // ベクトル検索は成功
      mockVectorService.ragSearch.mockResolvedValue([
        {
          id: '1',
          score: 0.9,
          metadata: {
            id: '1',
            type: 'inquiry',
            appId: 'app-1',
            createdAt: '2024-01-01T00:00:00.000Z',
            title: 'ログインエラーについて',
            content: 'ログインできません',
          },
          content: 'ログインエラーについて ログインできません',
        }
      ]);

      const result = await service.hybridSearch(searchDto);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].searchType).toBe('vector');
    });

    it('フィルターが正しく適用されること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';
      searchDto.status = [InquiryStatus.NEW];
      searchDto.category = ['技術的問題'];
      searchDto.page = 1;
      searchDto.limit = 10;

      const mockInquiry2 = {
        ...mockInquiry,
        id: '2',
        status: InquiryStatus.RESOLVED,
        category: '別のカテゴリ',
      };

      mockSearchService.searchInquiries.mockResolvedValue({
        items: [mockInquiry, mockInquiry2],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      mockVectorService.ragSearch.mockResolvedValue([]);

      const result = await service.hybridSearch(searchDto);

      // フィルターにより1件のみが残る
      expect(result.items).toHaveLength(1);
      expect(result.items[0].inquiry.status).toBe(InquiryStatus.NEW);
      expect(result.items[0].inquiry.category).toBe('技術的問題');
    });
  });

  describe('getSearchAnalytics', () => {
    it('検索結果の分析を正しく取得できること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';

      const mockResults = [
        {
          id: '1',
          inquiry: mockInquiry as Inquiry,
          vectorScore: 0.9,
          textScore: 0.8,
          combinedScore: 0.85,
          searchType: 'hybrid' as const,
        },
        {
          id: '2',
          inquiry: mockInquiry as Inquiry,
          vectorScore: undefined,
          textScore: 0.7,
          combinedScore: 0.7,
          searchType: 'text' as const,
        },
        {
          id: '3',
          inquiry: mockInquiry as Inquiry,
          vectorScore: 0.6,
          textScore: undefined,
          combinedScore: 0.6,
          searchType: 'vector' as const,
        },
      ];

      const analytics = await service.getSearchAnalytics(searchDto, mockResults);

      expect(analytics.totalResults).toBe(3);
      expect(analytics.searchTypes).toEqual({
        hybrid: 1,
        text: 1,
        vector: 1,
      });
      expect(analytics.averageScores.combined).toBeCloseTo(0.717, 2);
      expect(analytics.averageScores.vector).toBeCloseTo(0.75, 2); // (0.9 + 0.6) / 2
      expect(analytics.averageScores.text).toBeCloseTo(0.75, 2); // (0.8 + 0.7) / 2
      expect(analytics.scoreDistribution.high).toBe(1); // 0.85 >= 0.8
      expect(analytics.scoreDistribution.medium).toBe(2); // 0.7, 0.6 >= 0.5
      expect(analytics.scoreDistribution.low).toBe(0);
    });
  });

  describe('getWeightOptimizationSuggestion', () => {
    it('ベクトル検索結果が多い場合にベクトル重みの増加を提案すること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';

      const mockResults = [
        {
          id: '1',
          inquiry: mockInquiry as Inquiry,
          vectorScore: 0.9,
          textScore: undefined,
          combinedScore: 0.9,
          searchType: 'vector' as const,
        },
        {
          id: '2',
          inquiry: mockInquiry as Inquiry,
          vectorScore: 0.8,
          textScore: undefined,
          combinedScore: 0.8,
          searchType: 'vector' as const,
        },
      ];

      const suggestion = await service.getWeightOptimizationSuggestion(searchDto, mockResults);

      expect(suggestion.suggestedWeights.vector).toBe(0.7);
      expect(suggestion.suggestedWeights.text).toBe(0.3);
      expect(suggestion.reasoning).toContain('ベクトル検索');
      expect(suggestion.expectedImprovement).toBe(0.15);
    });

    it('全文検索結果が多い場合に全文検索重みの増加を提案すること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';

      const mockResults = [
        {
          id: '1',
          inquiry: mockInquiry as Inquiry,
          vectorScore: undefined,
          textScore: 0.9,
          combinedScore: 0.9,
          searchType: 'text' as const,
        },
        {
          id: '2',
          inquiry: mockInquiry as Inquiry,
          vectorScore: undefined,
          textScore: 0.8,
          combinedScore: 0.8,
          searchType: 'text' as const,
        },
      ];

      const suggestion = await service.getWeightOptimizationSuggestion(searchDto, mockResults);

      expect(suggestion.suggestedWeights.vector).toBe(0.3);
      expect(suggestion.suggestedWeights.text).toBe(0.7);
      expect(suggestion.reasoning).toContain('全文検索');
      expect(suggestion.expectedImprovement).toBe(0.15);
    });

    it('ハイブリッド結果が多い場合に現在の重みを維持することを提案すること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログインエラー';

      const mockResults = [
        {
          id: '1',
          inquiry: mockInquiry as Inquiry,
          vectorScore: 0.9,
          textScore: 0.8,
          combinedScore: 0.85,
          searchType: 'hybrid' as const,
        },
        {
          id: '2',
          inquiry: mockInquiry as Inquiry,
          vectorScore: 0.7,
          textScore: 0.6,
          combinedScore: 0.65,
          searchType: 'hybrid' as const,
        },
      ];

      const suggestion = await service.getWeightOptimizationSuggestion(searchDto, mockResults);

      expect(suggestion.suggestedWeights.vector).toBe(0.5);
      expect(suggestion.suggestedWeights.text).toBe(0.5);
      expect(suggestion.reasoning).toContain('現在の重み付けが最適');
      expect(suggestion.expectedImprovement).toBe(0);
    });
  });
});