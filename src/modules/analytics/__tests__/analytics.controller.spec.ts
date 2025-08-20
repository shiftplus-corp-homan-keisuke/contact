import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AnalyticsController } from '../controllers/analytics.controller';
import { AnalyticsService } from '../services/analytics.service';
import { RolesGuard } from '../../users/guards/roles.guard';
import {
    AnalyticsFiltersDto,
    DashboardQueryDto,
    PeriodDto
} from '../dto/analytics.dto';
import {
    InquiryStatistics,
    ResponseTimeAnalytics,
    DashboardData
} from '../types/analytics.types';

describe('AnalyticsController', () => {
    let controller: AnalyticsController;
    let analyticsService: AnalyticsService;

    const mockAnalyticsService = {
        getDashboardData: jest.fn(),
        getInquiryStatistics: jest.fn(),
        getResponseTimeAnalytics: jest.fn(),
    };

    const mockRolesService = {
        findRoleById: jest.fn(),
        hasPermission: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnalyticsController],
            providers: [
                {
                    provide: AnalyticsService,
                    useValue: mockAnalyticsService,
                },
                {
                    provide: RolesGuard,
                    useValue: {
                        canActivate: jest.fn(() => true),
                    },
                },
                {
                    provide: Reflector,
                    useValue: {
                        get: jest.fn(),
                        getAllAndOverride: jest.fn(),
                    },
                },
                {
                    provide: 'RolesService',
                    useValue: mockRolesService,
                },
            ],
        })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AnalyticsController>(AnalyticsController);
        analyticsService = module.get<AnalyticsService>(AnalyticsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getDashboard', () => {
        it('ダッシュボードデータを正しく取得できること', async () => {
            const mockDashboardData: DashboardData = {
                statistics: {
                    totalInquiries: 100,
                    newInquiries: 20,
                    inProgressInquiries: 30,
                    resolvedInquiries: 40,
                    closedInquiries: 10,
                    averageResponseTime: 2.5,
                    averageResolutionTime: 24.0,
                    categoryBreakdown: [],
                    appBreakdown: [],
                    statusBreakdown: [],
                    priorityBreakdown: [],
                },
                responseTimeAnalytics: {
                    averageFirstResponse: 2.5,
                    averageResolution: 24.0,
                    medianFirstResponse: 2.0,
                    medianResolution: 20.0,
                    responseTimeByHour: [],
                    responseTimeByDay: [],
                    responseTimeByCategory: [],
                },
                recentTrends: [],
                topCategories: [],
                topApps: [],
            };

            mockAnalyticsService.getDashboardData.mockResolvedValue(mockDashboardData);

            const query: DashboardQueryDto = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                realtime: true,
            };

            const result = await controller.getDashboard(query);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.statistics.totalInquiries).toBe(100);
            expect(result.message).toBe('ダッシュボードデータを取得しました');
            expect(mockAnalyticsService.getDashboardData).toHaveBeenCalledWith({
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                appIds: undefined,
                categories: undefined,
                statuses: undefined,
                priorities: undefined,
                assignedTo: undefined,
            });
        });

        it('フィルターなしでダッシュボードデータを取得できること', async () => {
            const mockDashboardData: DashboardData = {
                statistics: {
                    totalInquiries: 50,
                    newInquiries: 10,
                    inProgressInquiries: 15,
                    resolvedInquiries: 20,
                    closedInquiries: 5,
                    averageResponseTime: 3.0,
                    averageResolutionTime: 30.0,
                    categoryBreakdown: [],
                    appBreakdown: [],
                    statusBreakdown: [],
                    priorityBreakdown: [],
                },
                responseTimeAnalytics: {
                    averageFirstResponse: 3.0,
                    averageResolution: 30.0,
                    medianFirstResponse: 2.5,
                    medianResolution: 25.0,
                    responseTimeByHour: [],
                    responseTimeByDay: [],
                    responseTimeByCategory: [],
                },
                recentTrends: [],
                topCategories: [],
                topApps: [],
            };

            mockAnalyticsService.getDashboardData.mockResolvedValue(mockDashboardData);

            const result = await controller.getDashboard({});

            expect(result.success).toBe(true);
            expect(result.data.statistics.totalInquiries).toBe(50);
            expect(mockAnalyticsService.getDashboardData).toHaveBeenCalledWith({
                startDate: undefined,
                endDate: undefined,
                appIds: undefined,
                categories: undefined,
                statuses: undefined,
                priorities: undefined,
                assignedTo: undefined,
            });
        });
    });

    describe('getStatistics', () => {
        it('統計情報を正しく取得できること', async () => {
            const mockStatistics: InquiryStatistics = {
                totalInquiries: 100,
                newInquiries: 20,
                inProgressInquiries: 30,
                resolvedInquiries: 40,
                closedInquiries: 10,
                averageResponseTime: 2.5,
                averageResolutionTime: 24.0,
                categoryBreakdown: [
                    {
                        category: 'technical',
                        count: 50,
                        percentage: 50.0,
                        averageResponseTime: 2.0,
                    },
                ],
                appBreakdown: [
                    {
                        appId: 'app1',
                        appName: 'Test App',
                        count: 60,
                        percentage: 60.0,
                        averageResponseTime: 2.2,
                        averageResolutionTime: 22.0,
                    },
                ],
                statusBreakdown: [],
                priorityBreakdown: [],
            };

            mockAnalyticsService.getInquiryStatistics.mockResolvedValue(mockStatistics);

            const filters: AnalyticsFiltersDto = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                appIds: ['app1'],
            };

            const result = await controller.getStatistics(filters);

            expect(result.success).toBe(true);
            expect(result.data.totalInquiries).toBe(100);
            expect(result.data.categoryBreakdown).toHaveLength(1);
            expect(result.message).toBe('統計情報を取得しました');
        });
    });

    describe('getResponseTimeAnalytics', () => {
        it('応答時間分析を正しく取得できること', async () => {
            const mockResponseTimeAnalytics: ResponseTimeAnalytics = {
                averageFirstResponse: 2.5,
                averageResolution: 24.0,
                medianFirstResponse: 2.0,
                medianResolution: 20.0,
                responseTimeByHour: [
                    {
                        hour: 9,
                        averageResponseTime: 1.5,
                        inquiryCount: 10,
                    },
                ],
                responseTimeByDay: [
                    {
                        date: '2024-01-01',
                        averageResponseTime: 2.0,
                        inquiryCount: 15,
                        resolvedCount: 12,
                    },
                ],
                responseTimeByCategory: [
                    {
                        category: 'technical',
                        averageResponseTime: 2.0,
                        averageResolutionTime: 20.0,
                    },
                ],
            };

            mockAnalyticsService.getResponseTimeAnalytics.mockResolvedValue(mockResponseTimeAnalytics);

            const filters: AnalyticsFiltersDto = {
                categories: ['technical'],
            };

            const result = await controller.getResponseTimeAnalytics(filters);

            expect(result.success).toBe(true);
            expect(result.data.averageFirstResponse).toBe(2.5);
            expect(result.data.responseTimeByHour).toHaveLength(1);
            expect(result.message).toBe('応答時間分析を取得しました');
        });
    });

    describe('getPeriodStatistics', () => {
        it('今日の統計を正しく取得できること', async () => {
            const mockStatistics: InquiryStatistics = {
                totalInquiries: 10,
                newInquiries: 5,
                inProgressInquiries: 3,
                resolvedInquiries: 2,
                closedInquiries: 0,
                averageResponseTime: 1.5,
                averageResolutionTime: 12.0,
                categoryBreakdown: [],
                appBreakdown: [],
                statusBreakdown: [],
                priorityBreakdown: [],
            };

            mockAnalyticsService.getInquiryStatistics.mockResolvedValue(mockStatistics);

            const periodDto: PeriodDto = {
                period: 'today',
            };

            const result = await controller.getPeriodStatistics(periodDto);

            expect(result.success).toBe(true);
            expect(result.data.period).toBe('today');
            expect(result.data.statistics.totalInquiries).toBe(10);
            expect(result.message).toBe('todayの統計情報を取得しました');
        });

        it('過去7日間の統計を正しく取得できること', async () => {
            const mockStatistics: InquiryStatistics = {
                totalInquiries: 70,
                newInquiries: 15,
                inProgressInquiries: 20,
                resolvedInquiries: 30,
                closedInquiries: 5,
                averageResponseTime: 2.8,
                averageResolutionTime: 28.0,
                categoryBreakdown: [],
                appBreakdown: [],
                statusBreakdown: [],
                priorityBreakdown: [],
            };

            mockAnalyticsService.getInquiryStatistics.mockResolvedValue(mockStatistics);

            const periodDto: PeriodDto = {
                period: 'last_7_days',
            };

            const result = await controller.getPeriodStatistics(periodDto);

            expect(result.success).toBe(true);
            expect(result.data.period).toBe('last_7_days');
            expect(result.data.statistics.totalInquiries).toBe(70);
        });

        it('カスタム期間の統計を正しく取得できること', async () => {
            const mockStatistics: InquiryStatistics = {
                totalInquiries: 25,
                newInquiries: 8,
                inProgressInquiries: 10,
                resolvedInquiries: 6,
                closedInquiries: 1,
                averageResponseTime: 2.2,
                averageResolutionTime: 22.0,
                categoryBreakdown: [],
                appBreakdown: [],
                statusBreakdown: [],
                priorityBreakdown: [],
            };

            mockAnalyticsService.getInquiryStatistics.mockResolvedValue(mockStatistics);

            const periodDto: PeriodDto = {
                period: 'custom',
                startDate: '2024-01-01',
                endDate: '2024-01-15',
            };

            const result = await controller.getPeriodStatistics(periodDto);

            expect(result.success).toBe(true);
            expect(result.data.period).toBe('custom');
            expect(result.data.startDate).toEqual(new Date('2024-01-01'));
            expect(result.data.endDate).toEqual(new Date('2024-01-15'));
        });

        it('カスタム期間で日付が不足している場合はエラーを投げること', async () => {
            const periodDto: PeriodDto = {
                period: 'custom',
                // startDateとendDateが不足
            };

            await expect(controller.getPeriodStatistics(periodDto)).rejects.toThrow(
                'カスタム期間の場合、開始日と終了日が必要です'
            );
        });
    });

    describe('getCategoryBreakdown', () => {
        it('カテゴリ別統計を正しく取得できること', async () => {
            const mockStatistics: InquiryStatistics = {
                totalInquiries: 100,
                newInquiries: 20,
                inProgressInquiries: 30,
                resolvedInquiries: 40,
                closedInquiries: 10,
                averageResponseTime: 2.5,
                averageResolutionTime: 24.0,
                categoryBreakdown: [
                    {
                        category: 'technical',
                        count: 60,
                        percentage: 60.0,
                        averageResponseTime: 2.0,
                    },
                    {
                        category: 'billing',
                        count: 40,
                        percentage: 40.0,
                        averageResponseTime: 3.0,
                    },
                ],
                appBreakdown: [],
                statusBreakdown: [],
                priorityBreakdown: [],
            };

            mockAnalyticsService.getInquiryStatistics.mockResolvedValue(mockStatistics);

            const result = await controller.getCategoryBreakdown({});

            expect(result.success).toBe(true);
            expect(result.data.categoryBreakdown).toHaveLength(2);
            expect(result.data.totalInquiries).toBe(100);
            expect(result.message).toBe('カテゴリ別統計を取得しました');
        });
    });

    describe('getAppBreakdown', () => {
        it('アプリ別統計を正しく取得できること', async () => {
            const mockStatistics: InquiryStatistics = {
                totalInquiries: 100,
                newInquiries: 20,
                inProgressInquiries: 30,
                resolvedInquiries: 40,
                closedInquiries: 10,
                averageResponseTime: 2.5,
                averageResolutionTime: 24.0,
                categoryBreakdown: [],
                appBreakdown: [
                    {
                        appId: 'app1',
                        appName: 'Test App 1',
                        count: 70,
                        percentage: 70.0,
                        averageResponseTime: 2.2,
                        averageResolutionTime: 22.0,
                    },
                    {
                        appId: 'app2',
                        appName: 'Test App 2',
                        count: 30,
                        percentage: 30.0,
                        averageResponseTime: 3.0,
                        averageResolutionTime: 28.0,
                    },
                ],
                statusBreakdown: [],
                priorityBreakdown: [],
            };

            mockAnalyticsService.getInquiryStatistics.mockResolvedValue(mockStatistics);

            const result = await controller.getAppBreakdown({});

            expect(result.success).toBe(true);
            expect(result.data.appBreakdown).toHaveLength(2);
            expect(result.data.totalInquiries).toBe(100);
            expect(result.message).toBe('アプリ別統計を取得しました');
        });
    });

    describe('エラーハンドリング', () => {
        it('サービスでエラーが発生した場合は適切にエラーを投げること', async () => {
            mockAnalyticsService.getDashboardData.mockRejectedValue(new Error('Service error'));

            await expect(controller.getDashboard({})).rejects.toThrow('Service error');
        });
    });
});