import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateSuggestionService } from '../services/template-suggestion.service';
import { TemplatesRepository } from '../repositories/templates.repository';
import { Template, TemplateUsage } from '../entities';
import { SearchService } from '../../search/services';

describe('TemplateSuggestionService', () => {
    let service: TemplateSuggestionService;
    let templatesRepository: jest.Mocked<TemplatesRepository>;
    let searchService: jest.Mocked<SearchService>;
    let usageRepository: jest.Mocked<Repository<TemplateUsage>>;

    const mockTemplate: Template = {
        id: 'template-1',
        name: 'パスワードリセット案内',
        category: 'アカウント',
        content: 'パスワードリセットの手順をご案内いたします。',
        tags: ['パスワード', 'リセット'],
        isShared: true,
        usageCount: 10,
        createdBy: 'user-1',
        variables: [],
        creator: null,
        usages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const mockTemplatesRepository = {
            findById: jest.fn(),
            findWithFilters: jest.fn(),
            getPopularTemplates: jest.fn(),
        };

        const mockSearchService = {
            embedText: jest.fn(),
            vectorSearch: jest.fn(),
        };

        const mockUsageRepository = {
            createQueryBuilder: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TemplateSuggestionService,
                {
                    provide: TemplatesRepository,
                    useValue: mockTemplatesRepository,
                },
                {
                    provide: SearchService,
                    useValue: mockSearchService,
                },
                {
                    provide: getRepositoryToken(TemplateUsage),
                    useValue: mockUsageRepository,
                },
            ],
        }).compile();

        service = module.get<TemplateSuggestionService>(TemplateSuggestionService);
        templatesRepository = module.get(TemplatesRepository);
        searchService = module.get(SearchService);
        usageRepository = module.get(getRepositoryToken(TemplateUsage));
    });

    describe('suggestTemplates', () => {
        it('問い合わせ内容に基づいてテンプレートを提案できること', async () => {
            const inquiryContent = 'パスワードを忘れました';
            const userId = 'user-1';

            // ベクトル検索のモック
            searchService.embedText.mockResolvedValue([0.1, 0.2, 0.3]);
            searchService.vectorSearch.mockResolvedValue([
                {
                    id: 'template-1',
                    vectorScore: 0.85,
                    metadata: {},
                },
            ]);

            templatesRepository.findById.mockResolvedValue(mockTemplate);

            // キーワード検索のモック
            templatesRepository.findWithFilters.mockResolvedValue({
                items: [mockTemplate],
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            });

            // 人気テンプレートのモック
            templatesRepository.getPopularTemplates.mockResolvedValue([mockTemplate]);

            // ユーザー使用履歴のモック
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };
            usageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.suggestTemplates(inquiryContent, userId, 5);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].template).toEqual(mockTemplate);
            expect(result[0].score).toBeGreaterThan(0);
            expect(result[0].reason).toBeDefined();
        });

        it('ベクトル検索が失敗した場合でも人気テンプレートを返すこと', async () => {
            const inquiryContent = 'テスト問い合わせ';
            const userId = 'user-1';

            // ベクトル検索を失敗させる
            searchService.embedText.mockRejectedValue(new Error('API Error'));

            // 人気テンプレートのモック
            templatesRepository.getPopularTemplates.mockResolvedValue([mockTemplate]);

            // ユーザー使用履歴のモック
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };
            usageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.suggestTemplates(inquiryContent, userId, 5);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].reason).toContain('人気');
        });
    });

    describe('suggestTemplatesByCategory', () => {
        it('カテゴリに基づいてテンプレートを提案できること', async () => {
            const category = 'アカウント';
            const userId = 'user-1';

            templatesRepository.findWithFilters.mockResolvedValue({
                items: [mockTemplate],
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
            });

            const result = await service.suggestTemplatesByCategory(category, userId, 5);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].template).toEqual(mockTemplate);
            expect(result[0].reason).toContain(category);
        });
    });

    describe('measureTemplateEffectiveness', () => {
        it('テンプレートの効果を測定できること', async () => {
            const templateId = 'template-1';
            const period = {
                start: new Date('2024-01-01'),
                end: new Date('2024-01-31'),
            };

            const mockUsageStats = [
                { rating: 5, usedAt: new Date('2024-01-15') },
                { rating: 4, usedAt: new Date('2024-01-20') },
                { rating: 3, usedAt: new Date('2024-01-25') },
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockUsageStats),
            };
            usageRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.measureTemplateEffectiveness(templateId, period);

            expect(result).toBeDefined();
            expect(result.usageCount).toBe(3);
            expect(result.averageRating).toBe(4); // (5+4+3)/3 = 4
            expect(result.satisfactionRate).toBe(2 / 3); // 評価4以上が2件/3件
            expect(result.responseTimeImprovement).toBeGreaterThanOrEqual(0);
        });
    });
});