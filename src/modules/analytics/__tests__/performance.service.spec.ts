import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceService } from '../services/performance.service';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { User } from '../../users/entities/user.entity';
import { AnalyticsFilters } from '../types/analytics.types';

describe('PerformanceService', () => {
    let service: PerformanceService;
    let inquiryRepository: Repository<Inquiry>;
    let responseRepository: Repository<Response>;
    let userRepository: Repository<User>;

    const mockInquiryRepository = {
        createQueryBuilder: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockResponseRepository = {
        createQueryBuilder: jest.fn(),
        find: jest.fn(),
    };

    const mockUserRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PerformanceService,
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: mockInquiryRepository,
                },
                {
                    provide: getRepositoryToken(Response),
                    useValue: mockResponseRepository,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<PerformanceService>(PerformanceService);
        inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
        responseRepository = module.get<Repository<Response>>(getRepositoryToken(Response));
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserPerformance', () => {
        it('ユーザーパフォーマンス分析を正しく取得できること', async () => {
            const userId = 'user1';
            const mockUser = {
                id: userId,
                name: 'Test User',
                email: 'test@example.com',
            };

            const mockInquiries = [
                {
                    id: '1',
                    title: 'Test Inquiry 1',
                    status: 'resolved',
                    priority: 'high',
                    assignedTo: userId,
                    createdAt: new Date('2024-01-01T10:00:00Z'),
                    updatedAt: new Date('2024-01-01T14:00:00Z'),
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
                    assignedTo: userId,
                    createdAt: new Date('2024-01-01T15:00:00Z'),
                    updatedAt: new Date('2024-01-01T18:00:00Z'),
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
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockInquiries),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getUserPerformance(userId);

            expect(result).toBeDefined();
            expect(result.userId).toBe(userId);
            expect(result.userName).toBe('Test User');
            expect(result.totalInquiries).toBe(2);
            expect(result.resolvedInquiries).toBe(2);
            expect(result.resolutionRate).toBe(100);
            expect(result.averageResponseTime).toBeGreaterThan(0);
            expect(result.averageResolutionTime).toBeGreaterThan(0);
            expect(result.workload).toBeDefined();
            expect(result.efficiency).toBeGreaterThan(0);
        });

        it('存在しないユーザーの場合はエラーを投げること', async () => {
            const userId = 'nonexistent';
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.getUserPerformance(userId)).rejects.toThrow(
                `ユーザーが見つかりません: ${userId}`
            );
        });

        it('問い合わせがない場合は空のパフォーマンスを返すこと', async () => {
            const userId = 'user1';
            const mockUser = {
                id: userId,
                name: 'Test User',
                email: 'test@example.com',
            };

            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getUserPerformance(userId);

            expect(result.totalInquiries).toBe(0);
            expect(result.resolvedInquiries).toBe(0);
            expect(result.resolutionRate).toBe(0);
            expect(result.averageResponseTime).toBe(0);
            expect(result.averageResolutionTime).toBe(0);
            expect(result.workload).toBe('low');
            expect(result.efficiency).toBe(0);
        });
    });

    describe('getTeamPerformance', () => {
        it('チームパフォーマンス分析を正しく取得できること', async () => {
            const teamId = 'team1';
            const mockUsers = [
                { id: 'user1', name: 'User 1', email: 'user1@example.com' },
                { id: 'user2', name: 'User 2', email: 'user2@example.com' },
            ];

            const mockInquiries = [
                {
                    id: '1',
                    status: 'resolved',
                    assignedTo: 'user1',
                    createdAt: new Date('2024-01-01T10:00:00Z'),
                    updatedAt: new Date('2024-01-01T14:00:00Z'),
                    responses: [{ createdAt: new Date('2024-01-01T11:00:00Z') }],
                },
            ];

            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockInquiries),
            };

            mockUserRepository.find.mockResolvedValue(mockUsers);
            mockUserRepository.findOne
                .mockResolvedValueOnce(mockUsers[0])
                .mockResolvedValueOnce(mockUsers[1]);
            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getTeamPerformance(teamId);

            expect(result).toBeDefined();
            expect(result.teamId).toBe(teamId);
            expect(result.members).toHaveLength(2);
            expect(result.totalInquiries).toBeGreaterThanOrEqual(0);
            expect(result.resolutionRate).toBeGreaterThanOrEqual(0);
            expect(result.teamEfficiency).toBeGreaterThanOrEqual(0);
            expect(result.workloadDistribution).toBeDefined();
        });

        it('チームメンバーがいない場合はエラーを投げること', async () => {
            const teamId = 'empty-team';
            mockUserRepository.find.mockResolvedValue([]);

            await expect(service.getTeamPerformance(teamId)).rejects.toThrow(
                `チームメンバーが見つかりません: ${teamId}`
            );
        });
    });

    describe('getSLACompliance', () => {
        it('SLA達成率監視を正しく取得できること', async () => {
            const mockInquiries = [
                {
                    id: '1',
                    title: 'Urgent Inquiry',
                    priority: 'urgent',
                    category: 'technical',
                    assignedTo: 'user1',
                    createdAt: new Date('2024-01-01T10:00:00Z'),
                    responses: [
                        {
                            id: 'resp1',
                            createdAt: new Date('2024-01-01T10:30:00Z'), // 30分後（SLA内）
                        },
                    ],
                },
                {
                    id: '2',
                    title: 'High Priority Inquiry',
                    priority: 'high',
                    category: 'billing',
                    assignedTo: 'user2',
                    createdAt: new Date('2024-01-01T14:00:00Z'),
                    responses: [
                        {
                            id: 'resp2',
                            createdAt: new Date('2024-01-01T20:00:00Z'), // 6時間後（SLA違反）
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

            const result = await service.getSLACompliance();

            expect(result).toBeDefined();
            expect(result.totalInquiries).toBe(2);
            expect(result.slaCompliantInquiries).toBe(1);
            expect(result.complianceRate).toBe(50);
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].inquiryId).toBe('2');
            expect(result.complianceByCategory).toBeDefined();
            expect(result.complianceByPriority).toBeDefined();
        });

        it('問い合わせがない場合は空のSLA達成率を返すこと', async () => {
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getSLACompliance();

            expect(result.totalInquiries).toBe(0);
            expect(result.slaCompliantInquiries).toBe(0);
            expect(result.complianceRate).toBe(0);
            expect(result.violations).toEqual([]);
            expect(result.complianceByCategory).toEqual([]);
            expect(result.complianceByPriority).toEqual([]);
        });
    });

    describe('getTrendAnalysis', () => {
        it('問い合わせ件数トレンド分析を正しく取得できること', async () => {
            const metric = 'inquiry_count';
            const period = 'daily';

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    { date: '2024-01-01', count: '5' },
                    { date: '2024-01-02', count: '8' },
                    { date: '2024-01-03', count: '12' },
                ]),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getTrendAnalysis(metric, period);

            expect(result).toBeDefined();
            expect(result.metric).toBe(metric);
            expect(result.period).toBe(period);
            expect(result.data).toHaveLength(3);
            expect(result.trend).toBeDefined();
            expect(result.changePercentage).toBeDefined();
        });

        it('サポートされていないメトリックの場合はエラーを投げること', async () => {
            const metric = 'unsupported_metric';
            const period = 'daily';

            await expect(service.getTrendAnalysis(metric, period)).rejects.toThrow(
                `サポートされていないメトリック: ${metric}`
            );
        });
    });

    describe('フィルター適用', () => {
        it('フィルターが正しく適用されること', async () => {
            const userId = 'user1';
            const filters: AnalyticsFilters = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                appIds: ['app1'],
                categories: ['technical'],
                statuses: ['resolved'],
                priorities: ['high'],
            };

            const mockUser = {
                id: userId,
                name: 'Test User',
                email: 'test@example.com',
            };

            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            await service.getUserPerformance(userId, filters);

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
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.priority IN (:...priorities)',
                { priorities: filters.priorities }
            );
        });
    });

    describe('エラーハンドリング', () => {
        it('データベースエラーが発生した場合は適切にエラーを投げること', async () => {
            const userId = 'user1';
            mockUserRepository.findOne.mockRejectedValue(new Error('Database error'));

            await expect(service.getUserPerformance(userId)).rejects.toThrow('Database error');
        });
    });
});