/**
 * FAQクラスタリングサービスのテスト
 * 要件: 6.1, 6.2 (問い合わせクラスタリングアルゴリズムの実装)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FAQClusteringService } from '../faq-clustering.service';
import { VectorService } from '../vector.service';
import { Inquiry } from '../../entities/inquiry.entity';
import { Response } from '../../entities/response.entity';
import { FAQGenerationOptions } from '../../types/faq.types';

describe('FAQClusteringService', () => {
  let service: FAQClusteringService;
  let inquiryRepository: Repository<Inquiry>;
  let responseRepository: Repository<Response>;
  let vectorService: VectorService;

  const mockInquiryRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockResponseRepository = {
    find: jest.fn(),
  };

  const mockVectorService = {
    embedText: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FAQClusteringService,
        {
          provide: getRepositoryToken(Inquiry),
          useValue: mockInquiryRepository,
        },
        {
          provide: getRepositoryToken(Response),
          useValue: mockResponseRepository,
        },
        {
          provide: VectorService,
          useValue: mockVectorService,
        },
      ],
    }).compile();

    service = module.get<FAQClusteringService>(FAQClusteringService);
    inquiryRepository = module.get(getRepositoryToken(Inquiry));
    responseRepository = module.get(getRepositoryToken(Response));
    vectorService = module.get<VectorService>(VectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('clusterInquiries', () => {
    it('問い合わせが不足している場合は空のクラスタを返す', async () => {
      // Arrange
      const appId = 'test-app-id';
      const options: FAQGenerationOptions = {
        minClusterSize: 3,
        maxClusters: 10,
        similarityThreshold: 0.7,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'inquiry-1',
            title: 'ログインできません',
            content: 'パスワードを忘れました',
            category: 'アカウント',
            responses: [
              {
                id: 'response-1',
                content: 'パスワードリセットを行ってください',
                isPublic: true,
              },
            ],
          },
        ]),
      };

      mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.clusterInquiries(appId, options);

      // Assert
      expect(result.clusters).toHaveLength(0);
      expect(result.totalInquiries).toBe(1);
      expect(result.clusteredInquiries).toBe(0);
      expect(result.unclustered).toHaveLength(1);
    });

    it('十分な問い合わせがある場合はクラスタリングを実行する', async () => {
      // Arrange
      const appId = 'test-app-id';
      const options: FAQGenerationOptions = {
        minClusterSize: 2,
        maxClusters: 5,
        similarityThreshold: 0.7,
      };

      const mockInquiries = [
        {
          id: 'inquiry-1',
          title: 'ログインできません',
          content: 'パスワードを忘れました',
          category: 'アカウント',
          responses: [
            {
              id: 'response-1',
              content: 'パスワードリセットを行ってください',
              isPublic: true,
            },
          ],
        },
        {
          id: 'inquiry-2',
          title: 'ログインエラーが発生します',
          content: 'ログイン時にエラーメッセージが表示されます',
          category: 'アカウント',
          responses: [
            {
              id: 'response-2',
              content: 'ブラウザのキャッシュをクリアしてください',
              isPublic: true,
            },
          ],
        },
        {
          id: 'inquiry-3',
          title: 'アプリがクラッシュします',
          content: '起動時にアプリが落ちます',
          category: '技術的問題',
          responses: [
            {
              id: 'response-3',
              content: 'アプリを再インストールしてください',
              isPublic: true,
            },
          ],
        },
        {
          id: 'inquiry-4',
          title: 'アプリが起動しません',
          content: 'アプリをタップしても反応しません',
          category: '技術的問題',
          responses: [
            {
              id: 'response-4',
              content: 'デバイスを再起動してください',
              isPublic: true,
            },
          ],
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockInquiries),
      };

      mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // ベクトル化のモック（類似した問い合わせは類似したベクトルを返す）
      mockVectorService.embedText
        .mockResolvedValueOnce([0.1, 0.2, 0.3]) // ログイン関連
        .mockResolvedValueOnce([0.15, 0.25, 0.35]) // ログイン関連（類似）
        .mockResolvedValueOnce([0.8, 0.9, 0.7]) // アプリクラッシュ関連
        .mockResolvedValueOnce([0.85, 0.95, 0.75]); // アプリクラッシュ関連（類似）

      // Act
      const result = await service.clusterInquiries(appId, options);

      // Assert
      expect(result.clusters.length).toBeGreaterThan(0);
      expect(result.totalInquiries).toBe(4);
      expect(result.clusteredInquiries).toBeGreaterThan(0);
      expect(mockVectorService.embedText).toHaveBeenCalledTimes(4);
    });

    it('日付範囲フィルターが正しく適用される', async () => {
      // Arrange
      const appId = 'test-app-id';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const options: FAQGenerationOptions = {
        minClusterSize: 2,
        maxClusters: 5,
        similarityThreshold: 0.7,
        dateRange: { startDate, endDate },
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.clusterInquiries(appId, options);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inquiry.createdAt >= :startDate',
        { startDate }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inquiry.createdAt <= :endDate',
        { endDate }
      );
    });

    it('カテゴリフィルターが正しく適用される', async () => {
      // Arrange
      const appId = 'test-app-id';
      const categories = ['アカウント', '技術的問題'];
      const options: FAQGenerationOptions = {
        minClusterSize: 2,
        maxClusters: 5,
        similarityThreshold: 0.7,
        categories,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.clusterInquiries(appId, options);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inquiry.category IN (:...categories)',
        { categories }
      );
    });
  });

  describe('FAQ候補生成', () => {
    it('クラスタから適切なFAQ候補を生成する', async () => {
      // Arrange
      const appId = 'test-app-id';
      const options: FAQGenerationOptions = {
        minClusterSize: 2,
        maxClusters: 5,
        similarityThreshold: 0.8,
      };

      const mockInquiries = [
        {
          id: 'inquiry-1',
          title: 'ログインできません',
          content: 'パスワードを忘れました',
          category: 'アカウント',
          responses: [
            {
              id: 'response-1',
              content: 'パスワードリセット機能をご利用ください。ログイン画面の「パスワードを忘れた方」をクリックしてください。',
              isPublic: true,
            },
          ],
        },
        {
          id: 'inquiry-2',
          title: 'パスワードを忘れました',
          content: 'ログインパスワードがわかりません',
          category: 'アカウント',
          responses: [
            {
              id: 'response-2',
              content: 'パスワードリセットを行ってください。メールアドレスを入力して送信してください。',
              isPublic: true,
            },
          ],
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockInquiries),
      };

      mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // 類似したベクトルを返すモック
      mockVectorService.embedText
        .mockResolvedValueOnce([0.1, 0.2, 0.3])
        .mockResolvedValueOnce([0.12, 0.22, 0.32]);

      // Act
      const result = await service.clusterInquiries(appId, options);

      // Assert
      expect(result.clusters).toHaveLength(1);
      const cluster = result.clusters[0];
      expect(cluster.inquiries).toHaveLength(2);
      expect(cluster.representativeQuestion).toBeDefined();
      expect(cluster.suggestedAnswer).toBeDefined();
      expect(cluster.category).toBe('アカウント');
      expect(cluster.confidence).toBeGreaterThan(0);
      expect(cluster.confidence).toBeLessThanOrEqual(1);
    });

    it('信頼度が正しく計算される', async () => {
      // Arrange
      const appId = 'test-app-id';
      const options: FAQGenerationOptions = {
        minClusterSize: 2,
        maxClusters: 5,
        similarityThreshold: 0.8,
      };

      // 同じカテゴリで回答がある問い合わせ
      const mockInquiries = Array.from({ length: 5 }, (_, i) => ({
        id: `inquiry-${i + 1}`,
        title: `質問${i + 1}`,
        content: `内容${i + 1}`,
        category: 'テストカテゴリ',
        responses: [
          {
            id: `response-${i + 1}`,
            content: `回答${i + 1}`,
            isPublic: true,
          },
        ],
      }));

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockInquiries),
      };

      mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // 類似したベクトルを返すモック
      mockVectorService.embedText.mockImplementation(() =>
        Promise.resolve([0.1, 0.2, 0.3])
      );

      // Act
      const result = await service.clusterInquiries(appId, options);

      // Assert
      expect(result.clusters).toHaveLength(1);
      const cluster = result.clusters[0];
      
      // クラスタサイズが大きく、全て同じカテゴリで回答があるため高い信頼度
      expect(cluster.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('エラーハンドリング', () => {
    it('ベクトル化エラー時は該当問い合わせを除外する', async () => {
      // Arrange
      const appId = 'test-app-id';
      const options: FAQGenerationOptions = {
        minClusterSize: 2,
        maxClusters: 5,
        similarityThreshold: 0.7,
      };

      const mockInquiries = [
        {
          id: 'inquiry-1',
          title: 'テスト質問1',
          content: 'テスト内容1',
          category: 'テスト',
          responses: [],
        },
        {
          id: 'inquiry-2',
          title: 'テスト質問2',
          content: 'テスト内容2',
          category: 'テスト',
          responses: [],
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockInquiries),
      };

      mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // 1つ目はエラー、2つ目は成功
      mockVectorService.embedText
        .mockRejectedValueOnce(new Error('ベクトル化エラー'))
        .mockResolvedValueOnce([0.1, 0.2, 0.3]);

      // Act
      const result = await service.clusterInquiries(appId, options);

      // Assert
      // エラーが発生した問い合わせは除外され、残り1件では最小クラスタサイズに満たない
      expect(result.clusters).toHaveLength(0);
      expect(result.totalInquiries).toBe(2);
      expect(result.clusteredInquiries).toBe(0);
    });
  });
});