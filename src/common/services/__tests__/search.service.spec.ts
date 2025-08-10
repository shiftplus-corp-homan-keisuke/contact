/**
 * 検索サービスのテスト
 * 要件: 8.1, 8.2, 8.4 (検索・フィルタリング機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SearchService } from '../search.service';
import { Inquiry } from '../../entities/inquiry.entity';
import { SearchInquiriesDto } from '../../dto/search.dto';
import { InquiryStatus, InquiryPriority } from '../../types/inquiry.types';

describe('SearchService', () => {
  let service: SearchService;
  let inquiryRepository: Repository<Inquiry>;
  let mockQueryBuilder: Partial<SelectQueryBuilder<Inquiry>>;

  const mockInquiries: Partial<Inquiry>[] = [
    {
      id: '1',
      title: 'ログインエラーについて',
      content: 'ログインできません',
      status: InquiryStatus.NEW,
      priority: InquiryPriority.HIGH,
      category: '技術的問題',
      appId: 'app-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      title: 'パスワードリセット',
      content: 'パスワードを忘れました',
      status: InquiryStatus.IN_PROGRESS,
      priority: InquiryPriority.MEDIUM,
      category: 'アカウント関連',
      appId: 'app-1',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(async () => {
    // QueryBuilderのモック作成
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
      getMany: jest.fn().mockResolvedValue(mockInquiries),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      limit: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };

    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      count: jest.fn().mockResolvedValue(2),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Inquiry),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchInquiries', () => {
    it('基本的な検索が正常に動作すること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログイン';
      searchDto.page = 1;
      searchDto.limit = 20;

      const result = await service.searchInquiries(searchDto);

      expect(result).toEqual({
        items: mockInquiries,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        query: 'ログイン',
        appliedFilters: {},
        executionTime: expect.any(Number),
      });

      expect(inquiryRepository.createQueryBuilder).toHaveBeenCalledWith('inquiry');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('inquiry.application', 'application');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('inquiry.assignedUser', 'assignedUser');
    });

    it('全文検索クエリが正しく適用されること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.query = 'ログイン エラー';
      searchDto.page = 1;
      searchDto.limit = 20;

      await service.searchInquiries(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('to_tsvector'),
        expect.objectContaining({
          tsquery: 'ログイン:* & エラー:*',
          likeQuery: '%ログイン エラー%',
        })
      );
    });

    it('フィルターが正しく適用されること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.appId = 'app-1';
      searchDto.status = [InquiryStatus.NEW, InquiryStatus.IN_PROGRESS];
      searchDto.category = ['技術的問題'];
      searchDto.priority = [InquiryPriority.HIGH];
      searchDto.assignedTo = 'user-1';
      searchDto.customerEmail = 'test@example.com';
      searchDto.startDate = '2024-01-01';
      searchDto.endDate = '2024-01-31';
      searchDto.page = 1;
      searchDto.limit = 20;

      await service.searchInquiries(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inquiry.appId = :appId', { appId: 'app-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inquiry.status IN (:...status)', { 
        status: [InquiryStatus.NEW, InquiryStatus.IN_PROGRESS] 
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inquiry.category IN (:...category)', { 
        category: ['技術的問題'] 
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inquiry.priority IN (:...priority)', { 
        priority: [InquiryPriority.HIGH] 
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inquiry.assignedTo = :assignedTo', { 
        assignedTo: 'user-1' 
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inquiry.customerEmail ILIKE :customerEmail', { 
        customerEmail: '%test@example.com%' 
      });
    });

    it('ソートが正しく適用されること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.sortBy = 'title';
      searchDto.sortOrder = 'asc';
      searchDto.page = 1;
      searchDto.limit = 20;

      await service.searchInquiries(searchDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('inquiry.title', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('inquiry.createdAt', 'DESC');
    });

    it('ページネーションが正しく適用されること', async () => {
      const searchDto = new SearchInquiriesDto();
      searchDto.page = 2;
      searchDto.limit = 10;

      await service.searchInquiries(searchDto);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('getSearchSuggestions', () => {
    it('検索候補が正常に取得できること', async () => {
      const mockSuggestions = [
        { title: 'ログインエラーについて' },
        { title: 'ログイン画面が表示されない' },
      ];

      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue(mockSuggestions);

      const result = await service.getSearchSuggestions('ログイン', 10);

      expect(result).toEqual(['ログインエラーについて', 'ログイン画面が表示されない']);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('DISTINCT inquiry.title', 'title');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('inquiry.title ILIKE :query', { query: '%ログイン%' });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('短いクエリの場合は空配列を返すこと', async () => {
      const result = await service.getSearchSuggestions('a', 10);
      expect(result).toEqual([]);
    });

    it('空のクエリの場合は空配列を返すこと', async () => {
      const result = await service.getSearchSuggestions('', 10);
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableCategories', () => {
    it('利用可能なカテゴリが正常に取得できること', async () => {
      const mockCategories = [
        { category: '技術的問題' },
        { category: 'アカウント関連' },
      ];

      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue(mockCategories);

      const result = await service.getAvailableCategories();

      expect(result).toEqual(['技術的問題', 'アカウント関連']);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('DISTINCT inquiry.category', 'category');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('inquiry.category IS NOT NULL');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inquiry.category != \'\'');
    });
  });

  describe('getSearchStatistics', () => {
    it('検索統計が正常に取得できること', async () => {
      const mockStatusStats = [
        { status: 'new', count: '5' },
        { status: 'in_progress', count: '3' },
      ];

      const mockPriorityStats = [
        { priority: 'high', count: '2' },
        { priority: 'medium', count: '6' },
      ];

      const mockCategoryStats = [
        { category: '技術的問題', count: '4' },
        { category: 'アカウント関連', count: '4' },
      ];

      (inquiryRepository.count as jest.Mock).mockResolvedValue(8);
      (mockQueryBuilder.getRawMany as jest.Mock)
        .mockResolvedValueOnce(mockStatusStats)
        .mockResolvedValueOnce(mockPriorityStats)
        .mockResolvedValueOnce(mockCategoryStats);

      const result = await service.getSearchStatistics();

      expect(result).toEqual({
        totalInquiries: 8,
        statusBreakdown: {
          new: 5,
          in_progress: 3,
          pending: 0,
          resolved: 0,
          closed: 0,
        },
        priorityBreakdown: {
          low: 0,
          medium: 6,
          high: 2,
          urgent: 0,
        },
        categoryBreakdown: {
          '技術的問題': 4,
          'アカウント関連': 4,
        },
      });
    });
  });
});