import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SearchService } from '../services/search.service';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { FAQ } from '../../faqs/entities/faq.entity';
import { SearchCriteria } from '../types/search.types';

describe('SearchService', () => {
    let service: SearchService;
    let inquiryRepository: jest.Mocked<Repository<Inquiry>>;
    let responseRepository: jest.Mocked<Repository<Response>>;
    let faqRepository: jest.Mocked<Repository<FAQ>>;

    const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<any>>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SearchService,
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: {
                        createQueryBuilder: jest.fn(() => mockQueryBuilder),
                    },
                },
                {
                    provide: getRepositoryToken(Response),
                    useValue: {
                        createQueryBuilder: jest.fn(() => mockQueryBuilder),
                    },
                },
                {
                    provide: getRepositoryToken(FAQ),
                    useValue: {
                        createQueryBuilder: jest.fn(() => mockQueryBuilder),
                    },
                },
            ],
        }).compile();

        service = module.get<SearchService>(SearchService);
        inquiryRepository = module.get(getRepositoryToken(Inquiry));
        responseRepository = module.get(getRepositoryToken(Response));
        faqRepository = module.get(getRepositoryToken(FAQ));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('fullTextSearch', () => {
        it('基本的な全文検索が実行できること', async () => {
            // Arrange
            const criteria: SearchCriteria = {
                query: 'テスト検索',
                page: 1,
                limit: 20,
            };

            const mockInquiries = [
                {
                    id: 'inquiry-1',
                    title: 'テスト問い合わせ',
                    content: 'テスト内容です',
                    status: 'new',
                    priority: 'medium',
                    category: 'technical',
                    customerEmail: 'test@example.com',
                    customerName: 'テストユーザー',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    app: { id: 'app-1', name: 'テストアプリ' },
                    assignedUser: { id: 'user-1', name: '担当者' },
                },
            ];

            const mockResponses = [
                {
                    id: 'response-1',
                    content: 'テスト回答です',
                    isPublic: true,
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    inquiry: {
                        id: 'inquiry-1',
                        title: 'テスト問い合わせ',
                        status: 'resolved',
                        priority: 'medium',
                        category: 'technical',
                        app: { id: 'app-1', name: 'テストアプリ' },
                    },
                    user: { id: 'user-1', name: '回答者' },
                },
            ];

            const mockFAQs = [
                {
                    id: 'faq-1',
                    question: 'テスト質問',
                    answer: 'テスト回答',
                    category: 'general',
                    orderIndex: 1,
                    isPublished: true,
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    application: { id: 'app-1', name: 'テストアプリ' },
                },
            ];

            mockQueryBuilder.getMany
                .mockResolvedValueOnce(mockInquiries)
                .mockResolvedValueOnce(mockResponses)
                .mockResolvedValueOnce(mockFAQs);

            // Act
            const result = await service.fullTextSearch(criteria);

            // Assert
            expect(result).toBeDefined();
            expect(result.items).toHaveLength(3);
            expect(result.total).toBe(3);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
            expect(result.totalPages).toBe(1);
            expect(result.hasNext).toBe(false);
            expect(result.hasPrev).toBe(false);

            // 問い合わせ結果の検証
            const inquiryResult = result.items.find(item => item.type === 'inquiry');
            expect(inquiryResult).toBeDefined();
            expect(inquiryResult?.title).toBe('テスト問い合わせ');
            expect(inquiryResult?.metadata.appId).toBe('app-1');
            expect(inquiryResult?.metadata.status).toBe('new');

            // 回答結果の検証
            const responseResult = result.items.find(item => item.type === 'response');
            expect(responseResult).toBeDefined();
            expect(responseResult?.title).toBe('回答: テスト問い合わせ');
            expect(responseResult?.metadata.inquiryId).toBe('inquiry-1');

            // FAQ結果の検証
            const faqResult = result.items.find(item => item.type === 'faq');
            expect(faqResult).toBeDefined();
            expect(faqResult?.title).toBe('テスト質問');
            expect(faqResult?.metadata.category).toBe('general');
        });

        it('フィルター条件付きの検索が実行できること', async () => {
            // Arrange
            const criteria: SearchCriteria = {
                query: 'テスト',
                filters: {
                    appId: 'app-1',
                    status: ['new', 'in_progress'],
                    category: ['technical'],
                    priority: ['high'],
                    startDate: new Date('2024-01-01'),
                    endDate: new Date('2024-12-31'),
                },
                page: 1,
                limit: 10,
            };

            mockQueryBuilder.getMany
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            // Act
            const result = await service.fullTextSearch(criteria);

            // Assert
            expect(result).toBeDefined();
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.appId = :appId',
                { appId: 'app-1' }
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.status IN (:...status)',
                { status: ['new', 'in_progress'] }
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.category IN (:...category)',
                { category: ['technical'] }
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.priority IN (:...priority)',
                { priority: ['high'] }
            );
        });

        it('ページネーションが正しく動作すること', async () => {
            // Arrange
            const criteria: SearchCriteria = {
                query: 'テスト',
                page: 2,
                limit: 5,
            };

            // 10件のモックデータを作成（問い合わせのみ）
            const mockInquiries = Array.from({ length: 10 }, (_, i) => ({
                id: `inquiry-${i}`,
                title: `テスト${i}`,
                content: `内容${i}`,
                status: 'new',
                priority: 'medium',
                category: 'technical',
                customerEmail: 'test@example.com',
                customerName: 'テストユーザー',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
                app: { id: 'app-1', name: 'テストアプリ' },
                assignedUser: { id: 'user-1', name: '担当者' },
            }));

            mockQueryBuilder.getMany
                .mockResolvedValueOnce(mockInquiries)
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            // Act
            const result = await service.fullTextSearch(criteria);

            // Assert
            expect(result.page).toBe(2);
            expect(result.limit).toBe(5);
            expect(result.total).toBe(10);
            expect(result.totalPages).toBe(2);
            expect(result.hasNext).toBe(false);
            expect(result.hasPrev).toBe(true);
            expect(result.items).toHaveLength(5);
        });

        it('空の検索結果が正しく処理されること', async () => {
            // Arrange
            const criteria: SearchCriteria = {
                query: '存在しない検索語',
            };

            mockQueryBuilder.getMany
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            // Act
            const result = await service.fullTextSearch(criteria);

            // Assert
            expect(result.items).toHaveLength(0);
            expect(result.total).toBe(0);
            expect(result.totalPages).toBe(0);
            expect(result.hasNext).toBe(false);
            expect(result.hasPrev).toBe(false);
        });
    });
});