import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlaMonitoringService } from '../services/sla-monitoring.service';
import { SlaConfig } from '../entities/sla-config.entity';
import { SlaViolation } from '../entities/sla-violation.entity';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { NotificationsService } from '../services/notifications.service';
import { EscalationService } from '../services/escalation.service';

describe('SlaMonitoringService', () => {
    let service: SlaMonitoringService;
    let slaConfigRepository: Repository<SlaConfig>;
    let slaViolationRepository: Repository<SlaViolation>;
    let inquiryRepository: Repository<Inquiry>;
    let notificationsService: NotificationsService;
    let escalationService: EscalationService;

    const mockSlaConfigRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockSlaViolationRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockInquiryRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        count: jest.fn(),
    };

    const mockNotificationsService = {
        sendSlaViolationNotification: jest.fn(),
    };

    const mockEscalationService = {
        autoEscalateInquiry: jest.fn(),
        getLatestEscalation: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SlaMonitoringService,
                {
                    provide: getRepositoryToken(SlaConfig),
                    useValue: mockSlaConfigRepository,
                },
                {
                    provide: getRepositoryToken(SlaViolation),
                    useValue: mockSlaViolationRepository,
                },
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: mockInquiryRepository,
                },
                {
                    provide: NotificationsService,
                    useValue: mockNotificationsService,
                },
                {
                    provide: EscalationService,
                    useValue: mockEscalationService,
                },
            ],
        }).compile();

        service = module.get<SlaMonitoringService>(SlaMonitoringService);
        slaConfigRepository = module.get<Repository<SlaConfig>>(getRepositoryToken(SlaConfig));
        slaViolationRepository = module.get<Repository<SlaViolation>>(getRepositoryToken(SlaViolation));
        inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
        notificationsService = module.get<NotificationsService>(NotificationsService);
        escalationService = module.get<EscalationService>(EscalationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createSlaConfig', () => {
        it('SLA設定を作成できること', async () => {
            const configData = {
                appId: 'app-1',
                priority: 'high' as const,
                responseTimeHours: 2,
                resolutionTimeHours: 24,
                escalationTimeHours: 4,
            };

            const mockConfig = { id: 'config-1', ...configData };
            mockSlaConfigRepository.create.mockReturnValue(mockConfig);
            mockSlaConfigRepository.save.mockResolvedValue(mockConfig);

            const result = await service.createSlaConfig(configData);

            expect(mockSlaConfigRepository.create).toHaveBeenCalledWith(configData);
            expect(mockSlaConfigRepository.save).toHaveBeenCalledWith(mockConfig);
            expect(result).toEqual(mockConfig);
        });
    });

    describe('checkSlaViolations', () => {
        it('SLA違反を正しく検出できること', async () => {
            const now = new Date();
            const pastTime = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3時間前

            const mockConfig = {
                id: 'config-1',
                appId: 'app-1',
                priority: 'high',
                responseTimeHours: 2,
                resolutionTimeHours: 24,
                escalationTimeHours: 4,
                isActive: true,
            };

            const mockInquiry = {
                id: 'inquiry-1',
                appId: 'app-1',
                priority: 'high',
                status: 'new',
                createdAt: pastTime,
                responses: [],
            };

            mockSlaConfigRepository.find.mockResolvedValue([mockConfig]);
            mockInquiryRepository.find.mockResolvedValue([mockInquiry]);
            mockSlaViolationRepository.findOne.mockResolvedValue(null);
            mockSlaViolationRepository.create.mockReturnValue({
                id: 'violation-1',
                inquiryId: 'inquiry-1',
                slaConfigId: 'config-1',
                violationType: 'response_time',
                delayHours: 1,
                severity: 'minor',
            });
            mockSlaViolationRepository.save.mockResolvedValue({
                id: 'violation-1',
                inquiryId: 'inquiry-1',
                slaConfigId: 'config-1',
                violationType: 'response_time',
                delayHours: 1,
                severity: 'minor',
            });

            const violations = await service.checkSlaViolations();

            expect(violations).toHaveLength(1);
            expect(violations[0].violationType).toBe('response_time');
            expect(mockSlaViolationRepository.save).toHaveBeenCalled();
        });

        it('既に応答がある問い合わせは応答時間違反をスキップすること', async () => {
            const now = new Date();
            const pastTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);

            const mockConfig = {
                id: 'config-1',
                appId: 'app-1',
                priority: 'high',
                responseTimeHours: 2,
                resolutionTimeHours: 24,
                escalationTimeHours: 4,
                isActive: true,
            };

            const mockInquiry = {
                id: 'inquiry-1',
                appId: 'app-1',
                priority: 'high',
                status: 'in_progress',
                createdAt: pastTime,
                responses: [{ id: 'response-1' }], // 既に応答がある
            };

            mockSlaConfigRepository.find.mockResolvedValue([mockConfig]);
            mockInquiryRepository.find.mockResolvedValue([mockInquiry]);

            const violations = await service.checkSlaViolations();

            expect(violations).toHaveLength(0);
            expect(mockSlaViolationRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('getSlaViolationStats', () => {
        it('SLA違反統計を正しく取得できること', async () => {
            const mockViolations = [
                { violationType: 'response_time', severity: 'minor', isResolved: false, delayHours: 1.5 },
                { violationType: 'response_time', severity: 'major', isResolved: true, delayHours: 3.0 },
                { violationType: 'resolution_time', severity: 'critical', isResolved: false, delayHours: 12.0 },
            ];

            const mockQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockViolations),
            };

            mockSlaViolationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const stats = await service.getSlaViolationStats('app-1');

            expect(stats.total).toBe(3);
            expect(stats.byType.response_time).toBe(2);
            expect(stats.byType.resolution_time).toBe(1);
            expect(stats.bySeverity.minor).toBe(1);
            expect(stats.bySeverity.major).toBe(1);
            expect(stats.bySeverity.critical).toBe(1);
            expect(stats.resolved).toBe(1);
            expect(stats.unresolved).toBe(2);
            expect(stats.averageDelayHours).toBe(5.5);
        });
    });

    describe('resolveSlaViolation', () => {
        it('SLA違反を解決できること', async () => {
            const violationId = 'violation-1';
            const resolvedBy = 'user-1';
            const comment = '対応完了';

            const mockResolvedViolation = {
                id: violationId,
                isResolved: true,
                resolvedBy,
                resolvedAt: expect.any(Date),
                resolutionComment: comment,
            };

            mockSlaViolationRepository.update.mockResolvedValue({ affected: 1 });
            mockSlaViolationRepository.findOne.mockResolvedValue(mockResolvedViolation);

            const result = await service.resolveSlaViolation(violationId, resolvedBy, comment);

            expect(mockSlaViolationRepository.update).toHaveBeenCalledWith(violationId, {
                isResolved: true,
                resolvedBy,
                resolvedAt: expect.any(Date),
                resolutionComment: comment,
            });
            expect(result).toEqual(mockResolvedViolation);
        });
    });
});