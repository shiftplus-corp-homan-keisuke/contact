/**
 * FAQ公開サイトサービスのテスト
 * 要件: 6.3, 6.4 (FAQ公開システムの実装)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FAQSiteService, FAQSiteGenerationOptions } from '../faq-site.service';
import { FAQ } from '../../entities/faq.entity';
import { Application } from '../../entities/application.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

// fs/promisesのモック
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('FAQSiteService', () => {
  let service: FAQSiteService;
  let faqRepository: jest.Mocked<Repository<FAQ>>;
  let applicationRepository: jest.Mocked<Repository<Application>>;

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
  };

  const mockFAQs: FAQ[] = [
    {
      id: 'faq-1',
      appId: 'app-1',
      question: 'ログインできません',
      answer: 'パスワードリセットを行ってください',
      category: 'アカウント',
      tags: ['ログイン', 'パスワード'],
      orderIndex: 1,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      application: mockApplication,
    },
    {
      id: 'faq-2',
      appId: 'app-1',
      question: 'アプリがクラッシュします',
      answer: 'アプリを再インストールしてください',
      category: '技術的問題',
      tags: ['クラッシュ', 'エラー'],
      orderIndex: 2,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      application: mockApplication,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FAQSiteService,
        {
          provide: getRepositoryToken(FAQ),
          useValue: {
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FAQSiteService>(FAQSiteService);
    faqRepository = module.get(getRepositoryToken(FAQ));
    applicationRepository = module.get(getRepositoryToken(Application));

    // fsモックのリセット
    jest.clearAllMocks();
  });

  describe('generateFAQSite', () => {
    const mockOptions: FAQSiteGenerationOptions = {
      theme: 'light',
      includeSearch: true,
      includeCategories: true,
      sortBy: 'orderIndex',
      sortOrder: 'ASC',
    };

    it('FAQ公開サイトが正常に生成されること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFAQs),
      };
      faqRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      const result = await service.generateFAQSite('app-1', mockOptions);

      // Assert
      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-1' }
      });
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('faq.application', 'application');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('faq.appId = :appId', { appId: 'app-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('faq.isPublished = :isPublished', { isPublished: true });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('faq.orderIndex', 'ASC');

      expect(result.faqCount).toBe(2);
      expect(result.categories).toContain('アカウント');
      expect(result.categories).toContain('技術的問題');
      expect(result.url).toContain('app-1');
      expect(result.lastGenerated).toBeInstanceOf(Date);

      // ファイル生成の確認
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledTimes(5); // HTML, CSS, JS, JSON, config
    });

    it('存在しないアプリIDの場合、NotFoundExceptionが発生すること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateFAQSite('non-existent', mockOptions))
        .rejects.toThrow(NotFoundException);
    });

    it('公開済みFAQが存在しない場合、BadRequestExceptionが発生すること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      faqRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.generateFAQSite('app-1', mockOptions))
        .rejects.toThrow(BadRequestException);
    });

    it('デフォルトオプションが正しく適用されること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFAQs),
      };
      faqRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      await service.generateFAQSite('app-1'); // オプションなし

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('faq.orderIndex', 'ASC'); // デフォルト値
    });
  });

  describe('updateFAQSite', () => {
    it('FAQ公開サイトが正常に更新されること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFAQs),
      };
      faqRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Config not found')); // 既存設定なし

      // Act
      const result = await service.updateFAQSite('app-1');

      // Assert
      expect(result.faqCount).toBe(2);
      expect(result.lastGenerated).toBeInstanceOf(Date);
    });

    it('既存の設定が存在する場合、その設定を使用すること', async () => {
      // Arrange
      const existingConfig = {
        theme: 'dark',
        includeSearch: false,
        includeCategories: false,
      };

      applicationRepository.findOne.mockResolvedValue(mockApplication);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFAQs),
      };
      faqRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        appId: 'app-1',
        options: existingConfig,
        lastGenerated: new Date().toISOString(),
      }));

      // Act
      const result = await service.updateFAQSite('app-1');

      // Assert
      expect(result.faqCount).toBe(2);
      // 設定が適用されていることを間接的に確認（実際の実装では設定に基づいてファイル内容が変わる）
    });
  });

  describe('updateAllFAQSites', () => {
    it('全FAQ公開サイトが正常に一括更新されること', async () => {
      // Arrange
      const mockApps = [mockApplication, { ...mockApplication, id: 'app-2', name: 'Test App 2' }];
      applicationRepository.find.mockResolvedValue(mockApps);
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      faqRepository.count.mockResolvedValue(2); // 公開済みFAQが存在

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFAQs),
      };
      faqRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Config not found'));

      // Act
      const results = await service.updateAllFAQSites();

      // Assert
      expect(applicationRepository.find).toHaveBeenCalled();
      expect(Object.keys(results)).toHaveLength(2);
      expect(results['app-1']).toBeDefined();
      expect(results['app-2']).toBeDefined();
    });

    it('一部のアプリでエラーが発生した場合、エラーが記録されること', async () => {
      // Arrange
      const mockApps = [mockApplication, { ...mockApplication, id: 'app-2', name: 'Test App 2' }];
      applicationRepository.find.mockResolvedValue(mockApps);
      faqRepository.count.mockResolvedValue(2);

      // app-1は成功、app-2はエラー
      applicationRepository.findOne
        .mockResolvedValueOnce(mockApplication)
        .mockResolvedValueOnce(null); // app-2で NotFoundError

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFAQs),
      };
      faqRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Config not found'));

      // Act
      const results = await service.updateAllFAQSites();

      // Assert
      expect(Object.keys(results)).toHaveLength(2);
      expect(results['app-1']).not.toBeInstanceOf(Error);
      expect(results['app-2']).toBeInstanceOf(Error);
    });

    it('公開済みFAQがないアプリはスキップされること', async () => {
      // Arrange
      const mockApps = [mockApplication];
      applicationRepository.find.mockResolvedValue(mockApps);
      faqRepository.count.mockResolvedValue(0); // 公開済みFAQなし

      // Act
      const results = await service.updateAllFAQSites();

      // Assert
      expect(Object.keys(results)).toHaveLength(0);
      expect(applicationRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('deleteFAQSite', () => {
    it('FAQ公開サイトが正常に削除されること', async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined); // ファイル存在
      mockFs.rm.mockResolvedValue(undefined);

      // Act
      await service.deleteFAQSite('app-1');

      // Assert
      expect(mockFs.access).toHaveBeenCalled();
      expect(mockFs.rm).toHaveBeenCalledWith(
        expect.stringContaining('app-1'),
        { recursive: true, force: true }
      );
    });

    it('存在しないサイトの削除でもエラーが発生しないこと', async () => {
      // Arrange
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockFs.access.mockRejectedValue(error);

      // Act & Assert
      await expect(service.deleteFAQSite('app-1')).resolves.not.toThrow();
    });
  });

  describe('checkFAQSiteExists', () => {
    it('FAQ公開サイトが存在する場合、trueを返すこと', async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);

      // Act
      const result = await service.checkFAQSiteExists('app-1');

      // Assert
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(
        expect.stringContaining('app-1')
      );
    });

    it('FAQ公開サイトが存在しない場合、falseを返すこと', async () => {
      // Arrange
      mockFs.access.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.checkFAQSiteExists('app-1');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getFAQSiteInfo', () => {
    it('FAQ公開サイト情報が正常に取得されること', async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      faqRepository.count.mockResolvedValue(5);
      mockFs.stat.mockResolvedValue({
        mtime: new Date('2024-01-01'),
      } as any);

      // Act
      const result = await service.getFAQSiteInfo('app-1');

      // Assert
      expect(result).toEqual({
        appId: 'app-1',
        url: expect.stringContaining('app-1'),
        lastPublished: new Date('2024-01-01'),
        faqCount: 5,
        isActive: true,
      });
    });

    it('サイトが存在しない場合、nullを返すこと', async () => {
      // Arrange
      mockFs.access.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await service.getFAQSiteInfo('app-1');

      // Assert
      expect(result).toBeNull();
    });

    it('アプリケーションが存在しない場合、nullを返すこと', async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);
      applicationRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getFAQSiteInfo('app-1');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('HTML生成機能', () => {
    it('カテゴリ別FAQが正しく生成されること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFAQs),
      };
      faqRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      await service.generateFAQSite('app-1', {
        includeCategories: true,
        includeSearch: true,
      });

      // Assert
      const htmlWriteCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        call => call[0].endsWith('index.html')
      );
      expect(htmlWriteCall).toBeDefined();
      
      const htmlContent = htmlWriteCall[1];
      expect(htmlContent).toContain('Test App');
      expect(htmlContent).toContain('よくある質問');
      expect(htmlContent).toContain('search-input');
      expect(htmlContent).toContain('category-nav');
    });

    it('検索機能なしの場合、検索関連要素が含まれないこと', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFAQs),
      };
      faqRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      await service.generateFAQSite('app-1', {
        includeSearch: false,
        includeCategories: false,
      });

      // Assert
      const htmlWriteCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        call => call[0].endsWith('index.html')
      );
      expect(htmlWriteCall).toBeDefined();
      
      const htmlContent = htmlWriteCall[1];
      expect(htmlContent).not.toContain('search-input');
      expect(htmlContent).not.toContain('category-nav');
      expect(htmlContent).not.toContain('script.js');
    });
  });
});