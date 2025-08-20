import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertDashboardService } from '../services/alert-dashboard.service';
import { SlaViolation } from '../entities/sla-violation.entity';
import { Escalation } from '../entities/escalation.entity';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { NotificationLog } from '../entities/notification-log.entity';

describe('AlertDashboardService', () => {
    let service: AlertDashboardService;
    let slaViolationRepository: Repository<SlaViolation>;
    let escalationRepository: Repository<Escalation>;
    let inquiryRepository: Repository<Inquiry>;
    let notificationLogRepository: Repository<NotificationLog>;

    const mockSlaViolationRepository = {
        createQueryBuilder: jest.fn(),
        count: jest.fn(),
    };

    const mockEscalationRepository = {
        createQueryBuilder: jest.fn(),
    };

    const mockInquiryRepository = {
        count: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockNotificationLogRepository = {
        createQueryBuilder: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AlertDashboardService,
                {
                    provide: getRepositoryToken(SlaViolation),
                    useValue: mockSlaViolationRepository,
                },
                {
                    provide: getRepositoryToken(Escalation),
                    useValue: mockEscalationRepository,
                },
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: mockInquiryRepository,
                },
                {
                    provide: getRepositoryToken(NotificationLog),
                    useValue: mockNotificationLogRepository,
                },
            ],
        }).compile();

        service = module.get<AlertDashboardService>(AlertDashboardService);
        slaViolationRepository = module.get<Repository<SlaViolation>>(getRepositoryToken(SlaViolation));
        escalationRepository = module.get<Repository<Escalation>>(getRepositoryToken(Escalation));
        inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
        notificationLogRepository = module.get<Repository<NotificationLog>>(getRepositoryToken(NotificationLog));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getDashboardOverview', () => {
        it('ダッシュボード概要データを取得できること', async () => {
            // SLA違反の統計データをモック
            const mockSlaViolationQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                getCount: jest.fn(),
                getRawMany: jest.fn(),
            };

            // エスカレーションの統計データをモック
            const mockEscalationQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getCount: jest.fn(),
            };

            mockSlaViolationRepository.createQueryBuilder.mockReturnValue(mockSlaViolationQueryBuilder);
            mockEscalationRepository.createQueryBuilder.mockReturnValue(mockEscalationQueryBuilder);

            // アクティブなSLA違反数
            mockSlaViolationQueryBuilder.getCount
                .mockResolvedValueOnce(5) // activeSlaViolations
                .mockResolvedValueOnce(2); // recentSlaViolations

            // 重要度別SLA違反
            mockSlaViolationQueryBuilder.getRawMany.mockResolvedValue([
                { severity: 'minor', count: '2' },
                { severity: 'major', count: '2' },
                { severity: 'critical', count: '1' },
            ]);

            // エスカレーション統計
            mockEscalationQueryBuilder.getCount
                .mockResolvedValueOnce(3) // recentEscalations
                .mockResolvedValueOnce(10) // totalEscalations
                .mockResolvedValueOnce(7); // autoEscalations

            // 高優先度問い合わせ数
            mockInquiryRepository.count.mockResolvedValue(8);

            const result = await service.getDashboardOverview();

            expect(result.activeSlaViolations).toBe(5);
            expect(result.recentSlaViolations).toBe(2);
            expect(result.slaViolationsBySeverity).toEqual({
                minor: 2,
                major: 2,
                critical: 1,
            });
            expect(result.recentEscalations).toBe(3);
            expect(result.autoEscalationRate).toBe(70); // 7/10 * 100
            expect(result.highPriorityInquiries).toBe(8);
            expect(result.lastUpdated).toBeInstanceOf(Date);
        });

        it('アプリケーションIDでフィルタリングできること', async () => {
            const appId = 'app-1';

            const mockQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(0),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockSlaViolationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockEscalationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockInquiryRepository.count.mockResolvedValue(0);

            await service.getDashboardOverview(appId);

            expect(mockInquiryRepository.count).toHaveBeenCalledWith({
                where: {
                    appId,
                    priority: expect.any(Object), // In(['high', 'urgent'])
                    status: expect.any(Object), // In(['new', 'in_progress'])
                },
            });
        });
    });

    describe('getSlaViolationTrends', () => {
        it('SLA違反トレンドデータを取得できること', async () => {
            const mockQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                addGroupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn(),
            };

            const mockRawData = [
                { date: '2024-01-01', type: 'response_time', count: '2' },
                { date: '2024-01-01', type: 'resolution_time', count: '1' },
                { date: '2024-01-02', type: 'response_time', count: '1' },
            ];

            mockSlaViolationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockQueryBuilder.getRawMany.mockResolvedValue(mockRawData);

            const result = await service.getSlaViolationTrends(3);

            expect(result).toHaveLength(3); // 3日分のデータ
            expect(result[0]).toEqual({
                date: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
                response_time: expect.any(Number),
                resolution_time: expect.any(Number),
                escalation_time: expect.any(Number),
            });
        });
    });

    describe('getEscalationAnalysis', () => {
        it('エスカレーション分析データを取得できること', async () => {
            const mockEscalations = [
                {
                    escalationReason: 'sla_violation',
                    escalationLevel: 1,
                    isAutomatic: true,
                    escalatedAt: new Date('2024-01-01T10:00:00Z'),
                    escalatedTo: 'user-1',
                },
                {
                    escalationReason: 'complexity',
                    escalationLevel: 2,
                    isAutomatic: false,
                    escalatedAt: new Date('2024-01-01T14:00:00Z'),
                    escalatedTo: 'user-2',
                },
                {
                    escalationReason: 'sla_violation',
                    escalationLevel: 1,
                    isAutomatic: true,
                    escalatedAt: new Date('2024-01-01T16:00:00Z'),
                    escalatedTo: 'user-1',
                },
            ];

            const mockQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockEscalations),
            };

            mockEscalationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getEscalationAnalysis(30);

            expect(result.total).toBe(3);
            expect(result.byReason).toEqual({
                sla_violation: 2,
                complexity: 1,
            });
            expect(result.byLevel).toEqual({
                '1': 2,
                '2': 1,
            });
            expect(result.automaticRate).toBeCloseTo(66.67, 1); // 2/3 * 100
            expect(result.hourlyDistribution).toHaveLength(24);
            expect(result.topEscalationTargets).toEqual([
                { userId: 'user-1', count: 2 },
                { userId: 'user-2', count: 1 },
            ]);
        });
    });

    describe('getNotificationEffectiveness', () => {
        it('通知効果分析を取得できること', async () => {
            const mockNotifications = [
                { status: 'delivered', channel: 'email' },
                { status: 'delivered', channel: 'slack' },
                { status: 'failed', channel: 'email' },
            ];

            const mockQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockNotifications),
            };

            mockNotificationLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getNotificationEffectiveness(30);

            expect(result.total).toBe(3);
            expect(result.byStatus).toEqual({
                delivered: 2,
                failed: 1,
            });
            expect(result.byChannel).toEqual({
                email: 2,
                slack: 1,
            });
            expect(result.successRate).toBe(66.67); // 2/3 * 100, rounded
        });
    });

    describe('getRealTimeAlerts', () => {
        it('リアルタイムアラートを取得できること', async () => {
            const mockViolations = [
                { id: 'violation-1', violationType: 'response_time', severity: 'major' },
            ];
            const mockEscalations = [
                { id: 'escalation-1', escalationReason: 'sla_violation', isAutomatic: true },
            ];
            const mockUrgentInquiries = [
                { id: 'inquiry-1', priority: 'urgent', status: 'new' },
            ];

            const mockViolationQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockViolations),
            };

            const mockEscalationQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockEscalations),
            };

            const mockInquiryQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockUrgentInquiries),
            };

            mockSlaViolationRepository.createQueryBuilder.mockReturnValue(mockViolationQueryBuilder);
            mockEscalationRepository.createQueryBuilder.mockReturnValue(mockEscalationQueryBuilder);
            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockInquiryQueryBuilder);

            const result = await service.getRealTimeAlerts();

            expect(result.recentViolations).toEqual(mockViolations);
            expect(result.recentEscalations).toEqual(mockEscalations);
            expect(result.urgentInquiries).toEqual(mockUrgentInquiries);
            expect(result.timestamp).toBeInstanceOf(Date);
        });
    });
});