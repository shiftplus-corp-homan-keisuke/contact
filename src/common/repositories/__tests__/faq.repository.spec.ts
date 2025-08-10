/**
 * FAQリポジトリテスト
 * 要件: 6.3, 6.4 (FAQ管理機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FAQRepository, FAQSearchOptions } from '../faq.repository';
import { FAQ } from '../../entities/faq.entity';

describe('FAQRepository', () => {
  let repository: FAQRepository;
  let typeormRepository: jest.Mocked<Repository<FAQ>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<FAQ>>;

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
    application: {
      id: 'app-1',
      name: 'Test App',
      description: 'Test Application',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      inquiries: [],
      faqs: [],
      apiKeys: [],
    },
  };

  beforeEach(async () => {
    // QueryBuilderのモック作成
    queryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getCount: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FAQRepository,
        {
          provide: getRepositoryToken(FAQ),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            count: jest.fn(),
            manager: {
              connection: {
                createQueryRunner: jest.fn().mockReturnValue({
                  connect: jest.fn(),
                  startTransaction: jest.fn(),
                  commitTransaction: jest.fn(),
                  rollbackTransaction: jest.fn(),
                  release: jest.fn(),
                  manager: {
                    update: jest.fn(),
                  },
                }),
              },
            },
          },
        },
      ],
    }).compile();

    repository = module.get<FAQRepository>(FAQRepository);
    typeormRepository = module.get(getRepositoryToken(FAQ));
  });

  describe('findByAppId', () => {
    it('アプリIDでFAQを取得できること', async () => {
      // Arrange
      const options: FAQSearchOptions = {
        filters: { category: 'テストカテゴリ' },
        sortBy: 'orderIndex',
        sortOrder: 'ASC',
      };
      queryBuilder.getMany.mockResolvedValue([mockFAQ]);

      // Act
      const result = await repository.findByAppId('app-1', options);

      // Assert
      expect(typeormRepository.createQueryBuilder).toHaveBeenCalledWith('faq');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('faq.application', 'application');
      expect(queryBuilder.where).toHaveBeenCalledWith('faq.appId = :appId', { appId: 'app-1' });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('faq.category = :category', { category: 'テストカテゴリ' });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('faq.orderIndex', 'ASC');
      expect(result).toEqual([mockFAQ]);
    });

    it('検索クエリでフィルタリングできること', async () => {
      // Arrange
      const options: FAQSearchOptions = {
        query: 'テスト',
      };
      queryBuilder.getMany.mockResolvedValue([mockFAQ]);

      // Act
      await repository.findByAppId('app-1', options);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(faq.question ILIKE :query OR faq.answer ILIKE :query)',
        { query: '%テスト%' }
      );
    });

    it('タグでフィルタリングできること', async () => {
      // Arrange
      const options: FAQSearchOptions = {
        filters: { tags: ['tag1', 'tag2'] },
      };
      queryBuilder.getMany.mockResolvedValue([mockFAQ]);

      // Act
      await repository.findByAppId('app-1', options);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('faq.tags && :tags', { tags: ['tag1', 'tag2'] });
    });

    it('ページネーションが適用されること', async () => {
      // Arrange
      const options: FAQSearchOptions = {
        page: 2,
        limit: 10,
      };
      queryBuilder.getMany.mockResolvedValue([mockFAQ]);

      // Act
      await repository.findByAppId('app-1', options);

      // Assert
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findPublishedByAppId', () => {
    it('公開済みFAQのみ取得できること', async () => {
      // Arrange
      queryBuilder.getMany.mockResolvedValue([mockFAQ]);

      // Act
      const result = await repository.findPublishedByAppId('app-1');

      // Assert
      expect(result).toEqual([mockFAQ]);
      // findByAppIdが適切なオプションで呼ばれることを確認
    });
  });

  describe('searchFAQs', () => {
    const searchOptions: FAQSearchOptions = {
      query: 'テスト',
      filters: {
        appId: 'app-1',
        category: 'テストカテゴリ',
        isPublished: true,
      },
      page: 1,
      limit: 20,
    };

    it('FAQ検索が正常に動作すること', async () => {
      // Arrange
      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getMany.mockResolvedValue([mockFAQ]);

      // Act
      const result = await repository.searchFAQs(searchOptions);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('faq.appId = :appId', { appId: 'app-1' });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('faq.category = :category', { category: 'テストカテゴリ' });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('faq.isPublished = :isPublished', { isPublished: true });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(faq.question ILIKE :query OR faq.answer ILIKE :query OR faq.category ILIKE :query)',
        { query: '%テスト%' }
      );
      expect(result.items).toEqual([mockFAQ]);
      expect(result.total).toBe(1);
    });
  });

  describe('getMaxOrderIndex', () => {
    it('最大orderIndexを取得できること', async () => {
      // Arrange
      queryBuilder.getRawOne.mockResolvedValue({ maxOrder: 5 });

      // Act
      const result = await repository.getMaxOrderIndex('app-1');

      // Assert
      expect(queryBuilder.select).toHaveBeenCalledWith('MAX(faq.orderIndex)', 'maxOrder');
      expect(queryBuilder.where).toHaveBeenCalledWith('faq.appId = :appId', { appId: 'app-1' });
      expect(result).toBe(5);
    });

    it('FAQが存在しない場合は0を返すこと', async () => {
      // Arrange
      queryBuilder.getRawOne.mockResolvedValue(null);

      // Act
      const result = await repository.getMaxOrderIndex('app-1');

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('updateOrderIndexes', () => {
    it('orderIndex一括更新が正常に動作すること', async () => {
      // Arrange
      const updates = [
        { id: 'faq-1', orderIndex: 1 },
        { id: 'faq-2', orderIndex: 2 },
      ];

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          update: jest.fn(),
        },
      };

      const mockConnection = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      Object.defineProperty(typeormRepository, 'manager', {
        value: { connection: mockConnection },
        writable: true
      });

      // Act
      await repository.updateOrderIndexes(updates);

      // Assert
      expect(mockConnection.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.update).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('エラー時にロールバックされること', async () => {
      // Arrange
      const updates = [{ id: 'faq-1', orderIndex: 1 }];
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          update: jest.fn().mockRejectedValue(new Error('Update failed')),
        },
      };

      const mockConnection = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      Object.defineProperty(typeormRepository, 'manager', {
        value: { connection: mockConnection },
        writable: true
      });

      // Act & Assert
      await expect(repository.updateOrderIndexes(updates)).rejects.toThrow('Update failed');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('bulkUpdatePublishStatus', () => {
    it('公開状態一括更新が正常に動作すること', async () => {
      // Arrange
      const ids = ['faq-1', 'faq-2'];
      const isPublished = true;

      // Act
      await repository.bulkUpdatePublishStatus(ids, isPublished);

      // Assert
      expect(queryBuilder.update).toHaveBeenCalledWith(FAQ);
      expect(queryBuilder.execute).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith('id IN (:...ids)', { ids });
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('getFAQStatistics', () => {
    it('FAQ統計を取得できること', async () => {
      // Arrange
      const mockCategories = [
        { category: 'カテゴリ1', count: '5' },
        { category: 'カテゴリ2', count: '3' },
      ];

      typeormRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7); // published

      queryBuilder.getRawMany.mockResolvedValue(mockCategories);

      // Act
      const result = await repository.getFAQStatistics('app-1');

      // Assert
      expect(typeormRepository.count).toHaveBeenCalledWith({ where: { appId: 'app-1' } });
      expect(typeormRepository.count).toHaveBeenCalledWith({ where: { appId: 'app-1', isPublished: true } });
      expect(queryBuilder.select).toHaveBeenCalledWith('faq.category', 'category');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('COUNT(*)', 'count');
      expect(queryBuilder.where).toHaveBeenCalledWith('faq.appId = :appId', { appId: 'app-1' });
      expect(queryBuilder.groupBy).toHaveBeenCalledWith('faq.category');

      expect(result).toEqual({
        total: 10,
        published: 7,
        unpublished: 3,
        categories: [
          { category: 'カテゴリ1', count: 5 },
          { category: 'カテゴリ2', count: 3 },
        ],
      });
    });
  });
});