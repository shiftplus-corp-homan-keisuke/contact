import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FAQSiteService } from '../services/faq-site.service';
import { FAQsRepository } from '../repositories/faqs.repository';
import { FAQ, FAQSiteConfig } from '../entities';
import { Application } from '../../inquiries/entities';
import { PublishFAQSiteDto } from '../dto';
import * as fs from 'fs/promises';

// fsモジュールをモック
jest.mock('fs/promises');

describe('FAQSiteService', () => {
    let service: FAQSiteService;
    let faqsRepository: jest.Mocked<FAQsRepository>;
    let siteConfigRepository: jest.Mocked<Repository<FAQSiteConfig>>;
    let applicationRepository: jest.Mocked<Repository<Application>>;

    const mockApplication: Application = {
        id: 'app-1',
        name: 'テストアプリ',
        description: 'テストアプリの説明',
        apiKey: 'test-api-key',
        createdAt: new Date(),
        updatedAt: new Date(),
        inquiries: [],
    };

    const mockFAQ: FAQ = {
        id: 'faq-1',
        appId: 'app-1',
        question: 'テスト質問',
        answer: 'テスト回答',
        category: 'テスト',
        orderIndex: 0,
        isPublished: true,
        tags: ['tag1', 'tag2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        application: mockApplication,
    };

    const mockSiteConfig: FAQSiteConfig = {
        id: 'config-1',
        appId: 'app-1',
        siteTitle: 'テストFAQ',
        siteDescription: 'テストFAQの説明',
        theme: 'default',
        customCss: null,
        logoUrl: null,
        footerText: null,
        enableSearch: true,
        enableCategoryFilter: true,
        isPublished: false,
        siteUrl: null,
        lastGeneratedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        application: mockApplication,
    };

    const mockFAQsRepository = {
        find: jest.fn(),
        count: jest.fn(),
        findPublishedByAppId: jest.fn(),
        findByAppId: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        getCategories: jest.fn(),
        getTags: jest.fn(),
    };

    const mockSiteConfigRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
    };

    const mockApplicationRepository = {
        findOne: jest.fn(),
    };

    const mockFs = fs as jest.Mocked<typeof fs>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FAQSiteService,
                {
                    provide: FAQsRepository,
                    useValue: mockFAQsRepository,
                },
                {
                    provide: getRepositoryToken(FAQSiteConfig),
                    useValue: mockSiteConfigRepository,
                },
                {
                    provide: getRepositoryToken(Application),
                    useValue: mockApplicationRepository,
                },
            ],
        }).compile();

        service = module.get<FAQSiteService>(FAQSiteService);
        faqsRepository = module.get(FAQsRepository);
        siteConfigRepository = module.get(getRepositoryToken(FAQSiteConfig));
        applicationRepository = module.get(getRepositoryToken(Application));

        // モックのリセット
        jest.clearAllMocks();
    });

    describe('publishFAQSite', () => {
        const publishDto: PublishFAQSiteDto = {
            appId: 'app-1',
        };

        it('FAQ静的サイト生成が成功すること', async () => {
            // Arrange
            applicationRepository.findOne.mockResolvedValue(mockApplication);
            faqsRepository.find.mockResolvedValue([mockFAQ]);
            siteConfigRepository.findOne.mockResolvedValue(mockSiteConfig);
            siteConfigRepository.update.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue('template content');
            mockFs.copyFile.mockResolvedValue(undefined);
            mockFs.readdir.mockResolvedValue([]);
            mockFs.stat.mockResolvedValue({ isFile: () => true } as any);

            // Act
            const result = await service.publishFAQSite(publishDto);

            // Assert
            expect(result).toBeDefined();
            expect(result.siteUrl).toContain('/faq-sites/app-1');
            expect(result.faqCount).toBe(1);
            expect(applicationRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'app-1' },
            });
            expect(faqsRepository.find).toHaveBeenCalled();
            expect(siteConfigRepository.update).toHaveBeenCalled();
        });

        it('存在しないアプリケーションの場合はエラーを投げること', async () => {
            // Arrange
            applicationRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(service.publishFAQSite(publishDto)).rejects.toThrow(NotFoundException);
            await expect(service.publishFAQSite(publishDto)).rejects.toThrow('アプリケーションが見つかりません');
        });

        it('公開対象のFAQが存在しない場合はエラーを投げること', async () => {
            // Arrange
            applicationRepository.findOne.mockResolvedValue(mockApplication);
            faqsRepository.find.mockResolvedValue([]);

            // Act & Assert
            await expect(service.publishFAQSite(publishDto)).rejects.toThrow(BadRequestException);
            await expect(service.publishFAQSite(publishDto)).rejects.toThrow('公開対象のFAQが見つかりません');
        });
    });

    describe('getFAQSiteStatus', () => {
        it('FAQ サイトの状態を正常に取得できること', async () => {
            // Arrange
            siteConfigRepository.findOne.mockResolvedValue(mockSiteConfig);
            faqsRepository.count.mockResolvedValue(5);

            // Act
            const result = await service.getFAQSiteStatus('app-1');

            // Assert
            expect(result).toBeDefined();
            expect(result.appId).toBe('app-1');
            expect(result.isPublished).toBe(false);
            expect(result.publishedFaqCount).toBe(5);
            expect(result.config).toBeDefined();
        });

        it('設定が存在しない場合はデフォルト設定を作成すること', async () => {
            // Arrange
            siteConfigRepository.findOne.mockResolvedValueOnce(null);
            applicationRepository.findOne.mockResolvedValue(mockApplication);
            siteConfigRepository.create.mockReturnValue(mockSiteConfig);
            siteConfigRepository.save.mockResolvedValue(mockSiteConfig);
            faqsRepository.count.mockResolvedValue(0);

            // Act
            const result = await service.getFAQSiteStatus('app-1');

            // Assert
            expect(result).toBeDefined();
            expect(siteConfigRepository.create).toHaveBeenCalled();
            expect(siteConfigRepository.save).toHaveBeenCalled();
        });
    });

    describe('unpublishFAQSite', () => {
        it('FAQ公開サイト削除が成功すること', async () => {
            // Arrange
            siteConfigRepository.update.mockResolvedValue(undefined);
            mockFs.rm.mockResolvedValue(undefined);

            // Act & Assert
            await expect(service.unpublishFAQSite('app-1')).resolves.not.toThrow();
            expect(siteConfigRepository.update).toHaveBeenCalledWith(
                { appId: 'app-1' },
                { isPublished: false },
            );
            expect(mockFs.rm).toHaveBeenCalledWith(
                expect.stringContaining('app-1'),
                { recursive: true, force: true }
            );
        });
    });

    describe('handleFAQUpdate', () => {
        it('公開されているサイトの場合は自動更新すること', async () => {
            // Arrange
            const publishedConfig = { ...mockSiteConfig, isPublished: true };
            siteConfigRepository.findOne.mockResolvedValue(publishedConfig);
            applicationRepository.findOne.mockResolvedValue(mockApplication);
            faqsRepository.find.mockResolvedValue([mockFAQ]);
            siteConfigRepository.update.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue('template content');
            mockFs.copyFile.mockResolvedValue(undefined);
            mockFs.readdir.mockResolvedValue([]);
            mockFs.stat.mockResolvedValue({ isFile: () => true } as any);

            // Act & Assert
            await expect(service.handleFAQUpdate('app-1')).resolves.not.toThrow();
            expect(siteConfigRepository.findOne).toHaveBeenCalledWith({
                where: { appId: 'app-1', isPublished: true },
            });
        });

        it('公開されていないサイトの場合は何もしないこと', async () => {
            // Arrange
            siteConfigRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(service.handleFAQUpdate('app-1')).resolves.not.toThrow();
            expect(applicationRepository.findOne).not.toHaveBeenCalled();
        });
    });

    describe('updateSiteConfig', () => {
        const configDto = {
            appId: 'app-1',
            siteTitle: '更新されたタイトル',
            siteDescription: '更新された説明',
            theme: 'default',
            enableSearch: true,
            enableCategoryFilter: true,
        };

        it('既存の設定を更新できること', async () => {
            // Arrange
            const updatedConfig = { ...mockSiteConfig, ...configDto };
            siteConfigRepository.findOne.mockResolvedValue(mockSiteConfig);
            siteConfigRepository.save.mockResolvedValue(updatedConfig);

            // Act
            const result = await service.updateSiteConfig('app-1', configDto);

            // Assert
            expect(result).toBeDefined();
            expect(result.siteTitle).toBe('更新されたタイトル');
            expect(siteConfigRepository.save).toHaveBeenCalled();
        });

        it('設定が存在しない場合は新規作成すること', async () => {
            // Arrange
            siteConfigRepository.findOne.mockResolvedValue(null);
            siteConfigRepository.create.mockReturnValue(mockSiteConfig);
            siteConfigRepository.save.mockResolvedValue(mockSiteConfig);

            // Act
            const result = await service.updateSiteConfig('app-1', configDto);

            // Assert
            expect(result).toBeDefined();
            expect(siteConfigRepository.create).toHaveBeenCalledWith({
                appId: 'app-1',
                ...configDto,
            });
            expect(siteConfigRepository.save).toHaveBeenCalled();
        });
    });
});