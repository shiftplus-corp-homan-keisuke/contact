import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from '../services/analytics.service';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { Application } from '../../inquiries/entities/application.entity';
import { AnalyticsFilters } from '../types/analytics.types';

describe('AnalyticsService', () => {
    let service: AnalyticsService;
    let inquiryRepository: Repository<Inquiry>;
    let responseRepository: Repository<Response>;
    let applicationRepository: Repository<Application>;

    const mockInquiryRepository = {
        createQueryBuilder: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    const mockResponseRepository = {
        createQueryBuilder: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
    };

    const mockApplicationRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: mockInquiryRepository,
                },
                {
                    provide: getRepositoryToken(Response),
                    useValue: mockResponseRepository,
                },
                {
                    provide: getRepositoryToken(Application),
                    useValue: mockApplicationRepository,
                },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
        inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
        responseRepository = module.get<Repository<Response>>(getRepositoryToken(Response));
        applicationRepository = module.get<Repository<Application>>(getRepositoryToken(Application));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getInquiryStatistics', () => {
        it('基本統計情報を正しく取得できること', async () => {
            // テストデータの準備
            const mockInquiries = [
                {
                    id: '1',
                    title: 'Test Inquiry 1',
                    status: 'new',
                    priority: 'high',
                    category: 'technical',
                    appId: 'app1',
                    createdAt: new Date('2024-01-01T10:00:00Z'),
                    updatedAt: new Date('2024-01-01T12:00:00Z'),
                    application: { id: 'app1', name: 'Test App 1' },
                    responses: [
                        {
                            id: 'resp1',
                            createdAt: new Date('2024-01-01T11:00:00Z'),
                        },
                    ],
                },
                {
                    id: '2',
                    title: 'Test Inquiry 2',
                    status: 'resolved',
                    priority: 'medium',
                    category: 'billing',
                    appId: 'app2',
                    createdAt: new Date('2024-01-01T14:00:00Z'),
                    updatedAt: new Date('2024-01-01T16:00:00Z'),
                    application: { id: 'app2', name: 'Test App 2' },
                    responses: [
                        {
                            id: 'resp2',
                            createdAt: new Date('2024-01-01T15:00:00Z'),
                        },
                    ],
                },
            ];

            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockInquiries),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            // テスト実行
            const result = await service.getInquiryStatistics();

            // 検証
            expect(result).toBeDefined();
            expect(result.totalInquiries).toBe(2);
            expect(result.newInquiries).toBe(1);
            expect(result.resolvedInquiries).toBe(1);
            expect(result.categoryBreakdown).toHaveLength(2);
            expect(result.appBreakdown).toHaveLength(2);
            expect(result.averageResponseTime).toBeGreaterThan(0);
        });

        it('フィルターが正しく適用されること', async () => {
            const filters: AnalyticsFilters = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                appIds: ['app1'],
                categories: ['technical'],
                statuses: ['new', 'in_progress'],
            };

            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            await service.getInquiryStatistics(filters);

            // フィルターが適用されたことを確認
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.createdAt BETWEEN :startDate AND :endDate',
                { startDate: filters.startDate, endDate: filters.endDate }
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.appId IN (:...appIds)',
                { appIds: filters.appIds }
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.category IN (:...categories)',
                { categories: filters.categories }
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.status IN (:...statuses)',
                { statuses: filters.statuses }
            );
        });

        it('データが存在しない場合は空の統計を返すこと', async () => {
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getInquiryStatistics();

            expect(result.totalInquiries).toBe(0);
            expect(result.newInquiries).toBe(0);
            expect(result.resolvedInquiries).toBe(0);
            expect(result.categoryBreakdown).toEqual([]);
            expect(result.appBreakdown).toEqual([]);
        });
    });

    describe('getResponseTimeAnalytics', () => {
        it('応答時間分析を正しく計算できること', async () => {
            const mockInquiries = [
                {
                    id: '1',
                    createdAt: new Date('2024-01-01T10:00:00Z'),
                    updatedAt: new Date('2024-01-01T12:00:00Z'),
                    status: 'resolved',
                    category: 'technical',
                    responses: [
                        {
                            id: 'resp1',
                            createdAt: new Date('2024-01-01T11:00:00Z'),
                        },
                    ],
                },
                {
                    id: '2',
                    createdAt: new Date('2024-01-01T14:00:00Z'),
                    updatedAt: new Date('2024-01-01T17:00:00Z'),
                    status: 'resolved',
                    category: 'billing',
                    responses: [
                        {
                            id: 'resp2',
                            createdAt: new Date('2024-01-01T16:00:00Z'),
                        },
                    ],
                },
            ];

            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockInquiries),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getResponseTimeAnalytics();

            expect(result).toBeDefined();
            expect(result.averageFirstResponse).toBeGreaterThan(0);
            expect(result.averageResolution).toBeGreaterThan(0);
            expect(result.medianFirstResponse).toBeGreaterThan(0);
            expect(result.medianResolution).toBeGreaterThan(0);
            expect(result.responseTimeByHour).toHaveLength(24);
            expect(result.responseTimeByCategory).toHaveLength(2);
        });

        it('応答がない問い合わせは応答時間計算から除外されること', async () => {
            const mockInquiries = [
                {
                    id: '1',
                    createdAt: new Date('2024-01-01T10:00:00Z'),
                    updatedAt: new Date('2024-01-01T12:00:00Z'),
                    status: 'new',
                    category: 'technical',
                    responses: [], // 応答なし
                },
            ];

            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockInquiries),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getResponseTimeAnalytics();

            expect(result.averageFirstResponse).toBe(0);
            expect(result.medianFirstResponse).toBe(0);
        });
    });

    describe('getDashboardData', () => {
        it('ダッシュボードデータを正しく取得できること', async () => {
            const mockInquiries = [
                {
                    id: '1',
                    title: 'Test Inquiry',
                    status: 'new',
                    priority: 'high',
                    category: 'technical',
                    appId: 'app1',
                    createdAt: new Date('2024-01-01T10:00:00Z'),
                    updatedAt: new Date('2024-01-01T12:00:00Z'),
                    application: { id: 'app1', name: 'Test App' },
                    responses: [
                        {
                            id: 'resp1',
                            createdAt: new Date('2024-01-01T11:00:00Z'),
                        },
                    ],
                },
            ];

            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockInquiries),
            };

            const mockTrendQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    { date: '2024-01-01', count: '1' },
                ]),
            };

            mockInquiryRepository.createQueryBuilder
                .mockReturnValueOnce(mockQueryBuilder)
                .mockReturnValueOnce(mockQueryBuilder)
                .mockReturnValueOnce(mockTrendQueryBuilder);

            const result = await service.getDashboardData();

            expect(result).toBeDefined();
            expect(result.statistics).toBeDefined();
            expect(result.responseTimeAnalytics).toBeDefined();
            expect(result.recentTrends).toBeDefined();
            expect(result.topCategories).toBeDefined();
            expect(result.topApps).toBeDefined();
        });
    });

    describe('エラーハンドリング', () => {
        it('データベースエラーが発生した場合は適切にエラーを投げること', async () => {
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockRejectedValue(new Error('Database error')),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            await expect(service.getInquiryStatistics()).rejects.toThrow('Database error');
        });
    });
});