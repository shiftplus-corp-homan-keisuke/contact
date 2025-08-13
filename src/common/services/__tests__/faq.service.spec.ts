/**
 * FAQサービステスト
 * 要件: 6.3, 6.4 (FAQ管理機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FAQService } from '../../../modules/faqs/services/faq.service';
import { FAQClusteringService } from '../../../modules/faqs/services/faq-clustering.service';
import { FAQRepository } from '../../repositories/faq.repository';
import { FAQ } from '../../entities/faq.entity';
import { Application } from '../../entities/application.entity';
import { CreateFAQDto, UpdateFAQDto, SearchFAQDto } from '../../dto/faq.dto';
import { FAQGenerationOptions, FAQCluster } from '../../types/faq.types';

describe('FAQService', () => {
  let service: FAQService;
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let faqRepository: jest.Mocked<FAQRepository>;
  let faqClusteringService: jest.Mocked<FAQClusteringService>;

  const mockApplication: Application = {
    id: 'app-1',
    name: 'Test App',
    description: 'Test Application',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    inquiries: [],
    faqs: [],
    apiKeys: [],
    templates: [],
  };

  const mockFAQ: FAQ = {
    id: 'faq-1',
    appId: 'app-1',
    question: 'テスト質問',
    answer: 'テスト回答',
    category: 'テストカテゴリ',
    tags: ['tag1', 'tag2'],
    orderIndex: 1,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    application: mockApplication,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FAQService,
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: FAQRepository,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByIds: jest.fn(),
            searchFAQs: jest.fn(),
            findPublishedByAppId: jest.fn(),
            findByCategory: jest.fn(),
            getMaxOrderIndex: jest.fn(),
            updateOrderIndexes: jest.fn(),
            bulkUpdatePublishStatus: jest.fn(),
            getFAQStatistics: jest.fn(),
          },
        },
        {
          provide: FAQClusteringService,
          useValue: {
            clusterInquiries: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FAQService>(FAQService);
    applicationRepository = module.get(getRepositoryToken(Application));
    faqRepository = module.get(FAQRepository);
    faqClusteringService = module.get(FAQClusteringService);
  });

  describe('createFAQ', () => {
    const createFAQDto: CreateFAQDto = {
      appId: 'app-1',
      question: 'テスト質問',
      answer: 'テスト回答',
      category: 'テストカテゴリ',
      tags: ['tag1', 'tag2'],
      orderIndex: 1,
      isPublished: false,
    };

    it('FAQ作成が成功すること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      faqRepository.getMaxOrderIndex.mockResolvedValue(0);
      faqRepository.create.mockResolvedValue(mockFAQ);

      // Act
      const result = await service.createFAQ(createFAQDto);

      // Assert
      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: createFAQDto.appId }
      });
      expect(faqRepository.create).toHaveBeenCalledWith({
        ...createFAQDto,
        orderIndex: 1,
        tags: createFAQDto.tags,
        isPublished: false,
      });
      expect(result.id).toBe(mockFAQ.id);
      expect(result.question).toBe(mockFAQ.question);
    });

    it('orderIndexが未指定の場合、最大値+1が設定されること', async () => {
      // Arrange
      const dtoWithoutOrder = { ...createFAQDto };
      delete dtoWithoutOrder.orderIndex;
      
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      faqRepository.getMaxOrderIndex.mockResolvedValue(5);
      faqRepository.create.mockResolvedValue({ ...mockFAQ, orderIndex: 6 });

      // Act
      await service.createFAQ(dtoWithoutOrder);

      // Assert
      expect(faqRepository.getMaxOrderIndex).toHaveBeenCalledWith(createFAQDto.appId);
      expect(faqRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutOrder,
        orderIndex: 6,
        tags: [],
        isPublished: false,
      });
    });

    it('存在しないアプリIDの場合、NotFoundExceptionが発生すること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createFAQ(createFAQDto)).rejects.toThrow(NotFoundException);
      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: createFAQDto.appId }
      });
    });
  });

  describe('getFAQ', () => {
    it('FAQ取得が成功すること', async () => {
      // Arrange
      faqRepository.findOne.mockResolvedValue(mockFAQ);

      // Act
      const result = await service.getFAQ('faq-1');

      // Assert
      expect(faqRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'faq-1' },
        relations: ['application']
      });
      expect(result.id).toBe(mockFAQ.id);
    });

    it('存在しないFAQ IDの場合、NotFoundExceptionが発生すること', async () => {
      // Arrange
      faqRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getFAQ('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFAQ', () => {
    const updateFAQDto: UpdateFAQDto = {
      question: '更新された質問',
      answer: '更新された回答',
    };

    it('FAQ更新が成功すること', async () => {
      // Arrange
      const updatedFAQ = { ...mockFAQ, ...updateFAQDto };
      faqRepository.findOne.mockResolvedValue(mockFAQ);
      faqRepository.update.mockResolvedValue(updatedFAQ);

      // Act
      const result = await service.updateFAQ('faq-1', updateFAQDto);

      // Assert
      expect(faqRepository.findOne).toHaveBeenCalledWith({ where: { id: 'faq-1' } });
      expect(faqRepository.update).toHaveBeenCalledWith('faq-1', updateFAQDto);
      expect(result.question).toBe(updateFAQDto.question);
    });

    it('存在しないFAQ IDの場合、NotFoundExceptionが発生すること', async () => {
      // Arrange
      faqRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateFAQ('non-existent', updateFAQDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFAQ', () => {
    it('FAQ削除が成功すること', async () => {
      // Arrange
      faqRepository.findOne.mockResolvedValue(mockFAQ);
      faqRepository.delete.mockResolvedValue(undefined);

      // Act
      await service.deleteFAQ('faq-1');

      // Assert
      expect(faqRepository.findOne).toHaveBeenCalledWith({ where: { id: 'faq-1' } });
      expect(faqRepository.delete).toHaveBeenCalledWith('faq-1');
    });

    it('存在しないFAQ IDの場合、NotFoundExceptionが発生すること', async () => {
      // Arrange
      faqRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteFAQ('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFAQsByApp', () => {
    const searchDto: SearchFAQDto = {
      query: 'テスト',
      category: 'テストカテゴリ',
      page: 1,
      limit: 20,
    };

    it('アプリ別FAQ取得が成功すること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      faqRepository.searchFAQs.mockResolvedValue({
        items: [mockFAQ],
        total: 1,
      });

      // Act
      const result = await service.getFAQsByApp('app-1', searchDto);

      // Assert
      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-1' }
      });
      expect(faqRepository.searchFAQs).toHaveBeenCalledWith({
        query: searchDto.query,
        filters: {
          appId: 'app-1',
          category: searchDto.category,
          isPublished: undefined,
          tags: undefined,
        },
        sortBy: 'orderIndex',
        sortOrder: 'ASC',
        page: 1,
        limit: 20,
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('存在しないアプリIDの場合、NotFoundExceptionが発生すること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getFAQsByApp('non-existent', searchDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePublishStatus', () => {
    it('FAQ公開状態更新が成功すること', async () => {
      // Arrange
      const updatedFAQ = { ...mockFAQ, isPublished: false };
      faqRepository.findOne.mockResolvedValue(mockFAQ);
      faqRepository.update.mockResolvedValue(updatedFAQ);

      // Act
      const result = await service.updatePublishStatus('faq-1', false);

      // Assert
      expect(faqRepository.findOne).toHaveBeenCalledWith({ where: { id: 'faq-1' } });
      expect(faqRepository.update).toHaveBeenCalledWith('faq-1', { isPublished: false });
      expect(result.isPublished).toBe(false);
    });
  });

  describe('updateFAQOrder', () => {
    const updateOrderDto = {
      items: [
        { id: 'faq-1', orderIndex: 1 },
        { id: 'faq-2', orderIndex: 2 },
      ],
    };

    it('FAQ表示順序更新が成功すること', async () => {
      // Arrange
      faqRepository.findByIds.mockResolvedValue([mockFAQ, { ...mockFAQ, id: 'faq-2' }]);
      faqRepository.updateOrderIndexes.mockResolvedValue(undefined);

      // Act
      await service.updateFAQOrder(updateOrderDto);

      // Assert
      expect(faqRepository.findByIds).toHaveBeenCalledWith(['faq-1', 'faq-2']);
      expect(faqRepository.updateOrderIndexes).toHaveBeenCalledWith([
        { id: 'faq-1', orderIndex: 1 },
        { id: 'faq-2', orderIndex: 2 },
      ]);
    });

    it('空の配列の場合、BadRequestExceptionが発生すること', async () => {
      // Act & Assert
      await expect(service.updateFAQOrder({ items: [] })).rejects.toThrow(BadRequestException);
    });

    it('重複するIDがある場合、BadRequestExceptionが発生すること', async () => {
      // Arrange
      const duplicateDto = {
        items: [
          { id: 'faq-1', orderIndex: 1 },
          { id: 'faq-1', orderIndex: 2 },
        ],
      };

      // Act & Assert
      await expect(service.updateFAQOrder(duplicateDto)).rejects.toThrow(BadRequestException);
    });

    it('存在しないFAQ IDがある場合、BadRequestExceptionが発生すること', async () => {
      // Arrange
      faqRepository.findByIds.mockResolvedValue([mockFAQ]); // 1件しか見つからない

      // Act & Assert
      await expect(service.updateFAQOrder(updateOrderDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFAQStatistics', () => {
    const mockStatistics = {
      total: 10,
      published: 7,
      unpublished: 3,
      categories: [
        { category: 'カテゴリ1', count: 5 },
        { category: 'カテゴリ2', count: 5 },
      ],
    };

    it('FAQ統計取得が成功すること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      faqRepository.getFAQStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await service.getFAQStatistics('app-1');

      // Assert
      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-1' }
      });
      expect(faqRepository.getFAQStatistics).toHaveBeenCalledWith('app-1');
      expect(result).toEqual(mockStatistics);
    });

    it('存在しないアプリIDの場合、NotFoundExceptionが発生すること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getFAQStatistics('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('FAQ自動生成機能', () => {
    const mockCluster: FAQCluster = {
      id: 'cluster-1',
      inquiries: ['inquiry-1', 'inquiry-2'],
      representativeQuestion: 'ログインできません',
      suggestedAnswer: 'パスワードリセットを行ってください',
      category: 'アカウント',
      confidence: 0.8,
    };

    const mockGenerationOptions: FAQGenerationOptions = {
      minClusterSize: 3,
      maxClusters: 10,
      similarityThreshold: 0.7,
    };

    describe('generateFAQ', () => {
      it('FAQ自動生成が成功すること', async () => {
        // Arrange
        applicationRepository.findOne.mockResolvedValue(mockApplication);
        faqClusteringService.clusterInquiries.mockResolvedValue({
          clusters: [mockCluster],
          totalInquiries: 10,
          clusteredInquiries: 8,
          unclustered: ['inquiry-3', 'inquiry-4'],
        });

        // Act
        const result = await service.generateFAQ('app-1', mockGenerationOptions);

        // Assert
        expect(applicationRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'app-1' }
        });
        expect(faqClusteringService.clusterInquiries).toHaveBeenCalledWith('app-1', mockGenerationOptions);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockCluster);
      });

      it('存在しないアプリIDの場合、NotFoundExceptionが発生すること', async () => {
        // Arrange
        applicationRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(service.generateFAQ('non-existent', mockGenerationOptions)).rejects.toThrow(NotFoundException);
      });
    });

    describe('previewGeneratedFAQ', () => {
      it('FAQ自動生成プレビューが成功すること', async () => {
        // Arrange
        applicationRepository.findOne.mockResolvedValue(mockApplication);
        faqClusteringService.clusterInquiries.mockResolvedValue({
          clusters: [mockCluster],
          totalInquiries: 10,
          clusteredInquiries: 8,
          unclustered: ['inquiry-3', 'inquiry-4'],
        });

        // Act
        const result = await service.previewGeneratedFAQ('app-1', mockGenerationOptions);

        // Assert
        expect(result.clusters).toHaveLength(1);
        expect(result.clusters[0]).toEqual(mockCluster);
        expect(result.statistics).toEqual({
          totalInquiries: 10,
          clusteredInquiries: 8,
          unclustered: 2,
          generatedFAQs: 1,
        });
      });
    });

    describe('createFAQFromCluster', () => {
      it('クラスタからFAQ作成が成功すること', async () => {
        // Arrange
        applicationRepository.findOne.mockResolvedValue(mockApplication);
        faqRepository.getMaxOrderIndex.mockResolvedValue(0);
        faqRepository.create.mockResolvedValue({
          ...mockFAQ,
          question: mockCluster.representativeQuestion,
          answer: mockCluster.suggestedAnswer,
          category: mockCluster.category,
        });

        // Act
        const result = await service.createFAQFromCluster('app-1', mockCluster, {
          isPublished: true,
          category: 'カスタムカテゴリ',
          tags: ['カスタムタグ'],
        });

        // Assert
        expect(applicationRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'app-1' }
        });
        expect(faqRepository.create).toHaveBeenCalledWith({
          appId: 'app-1',
          question: mockCluster.representativeQuestion,
          answer: mockCluster.suggestedAnswer,
          category: 'カスタムカテゴリ',
          tags: ['カスタムタグ'],
          isPublished: true,
        });
        expect(result.question).toBe(mockCluster.representativeQuestion);
      });

      it('オプションが未指定の場合、クラスタの値が使用されること', async () => {
        // Arrange
        applicationRepository.findOne.mockResolvedValue(mockApplication);
        faqRepository.getMaxOrderIndex.mockResolvedValue(0);
        faqRepository.create.mockResolvedValue({
          ...mockFAQ,
          question: mockCluster.representativeQuestion,
          answer: mockCluster.suggestedAnswer,
          category: mockCluster.category,
        });

        // Act
        await service.createFAQFromCluster('app-1', mockCluster);

        // Assert
        expect(faqRepository.create).toHaveBeenCalledWith({
          appId: 'app-1',
          question: mockCluster.representativeQuestion,
          answer: mockCluster.suggestedAnswer,
          category: mockCluster.category,
          tags: [mockCluster.category], // カテゴリがタグに含まれる
          isPublished: false,
        });
      });
    });

    describe('createFAQsFromClusters', () => {
      const mockClusters = [
        mockCluster,
        {
          id: 'cluster-2',
          inquiries: ['inquiry-3', 'inquiry-4'],
          representativeQuestion: 'アプリがクラッシュします',
          suggestedAnswer: 'アプリを再インストールしてください',
          category: '技術的問題',
          confidence: 0.9,
        },
      ];

      it('複数クラスタからFAQ一括作成が成功すること', async () => {
        // Arrange
        applicationRepository.findOne.mockResolvedValue(mockApplication);
        faqRepository.getMaxOrderIndex.mockResolvedValue(0);
        
        // 最初のクラスタは成功
        faqRepository.create
          .mockResolvedValueOnce({
            ...mockFAQ,
            id: 'faq-1',
            question: mockClusters[0].representativeQuestion,
          })
          .mockResolvedValueOnce({
            ...mockFAQ,
            id: 'faq-2',
            question: mockClusters[1].representativeQuestion,
          });

        // Act
        const result = await service.createFAQsFromClusters('app-1', mockClusters);

        // Assert
        expect(result.created).toHaveLength(2);
        expect(result.failed).toHaveLength(0);
        expect(faqRepository.create).toHaveBeenCalledTimes(2);
      });

      it('一部のクラスタでエラーが発生した場合、成功分と失敗分が分けて返されること', async () => {
        // Arrange
        applicationRepository.findOne.mockResolvedValue(mockApplication);
        faqRepository.getMaxOrderIndex.mockResolvedValue(0);
        
        // 最初のクラスタは成功、2つ目はエラー
        faqRepository.create
          .mockResolvedValueOnce({
            ...mockFAQ,
            id: 'faq-1',
            question: mockClusters[0].representativeQuestion,
          })
          .mockRejectedValueOnce(new Error('作成エラー'));

        // Act
        const result = await service.createFAQsFromClusters('app-1', mockClusters);

        // Assert
        expect(result.created).toHaveLength(1);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].cluster.id).toBe('cluster-2');
        expect(result.failed[0].error).toBe('作成エラー');
      });

      it('自動公開閾値が設定されている場合、信頼度に基づいて公開状態が決定されること', async () => {
        // Arrange
        applicationRepository.findOne.mockResolvedValue(mockApplication);
        faqRepository.getMaxOrderIndex.mockResolvedValue(0);
        faqRepository.create.mockResolvedValue(mockFAQ);

        const highConfidenceCluster = { ...mockCluster, confidence: 0.9 };
        const lowConfidenceCluster = { ...mockCluster, id: 'cluster-2', confidence: 0.6 };

        // Act
        await service.createFAQsFromClusters('app-1', [highConfidenceCluster, lowConfidenceCluster], {
          autoPublishThreshold: 0.8,
        });

        // Assert
        expect(faqRepository.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
          isPublished: true, // 信頼度0.9 >= 閾値0.8
        }));
        expect(faqRepository.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
          isPublished: false, // 信頼度0.6 < 閾値0.8
        }));
      });
    });

    describe('generateTagsFromCluster', () => {
      it('クラスタからタグが正しく生成されること', async () => {
        // Arrange
        const clusterWithKeywords: FAQCluster = {
          id: 'cluster-1',
          inquiries: ['inquiry-1'],
          representativeQuestion: 'ログインエラーが発生します',
          suggestedAnswer: 'パスワードを確認してください',
          category: 'アカウント',
          confidence: 0.8,
        };

        applicationRepository.findOne.mockResolvedValue(mockApplication);
        faqRepository.getMaxOrderIndex.mockResolvedValue(0);
        faqRepository.create.mockResolvedValue(mockFAQ);

        // Act
        await service.createFAQFromCluster('app-1', clusterWithKeywords);

        // Assert
        const createCall = faqRepository.create.mock.calls[0][0];
        expect(createCall.tags).toContain('アカウント'); // カテゴリ
        expect(createCall.tags).toContain('ログイン'); // 質問から抽出
        expect(createCall.tags).toContain('パスワード'); // 回答から抽出
      });
    });
  });
});