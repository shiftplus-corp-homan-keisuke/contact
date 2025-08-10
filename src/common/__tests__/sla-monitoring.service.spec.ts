import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlaMonitoringService } from '../services/sla-monitoring.service';
import { SlaConfig } from '../entities/sla-config.entity';
import { SlaViolation } from '../entities/sla-violation.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { RealtimeNotificationService } from '../services/realtime-notification.service';

describe('SlaMonitoringService', () => {
  let service: SlaMonitoringService;
  let slaConfigRepository: Repository<SlaConfig>;
  let slaViolationRepository: Repository<SlaViolation>;
  let inquiryRepository: Repository<Inquiry>;
  let realtimeNotificationService: RealtimeNotificationService;

  const mockSlaConfigRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSlaViolationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockInquiryRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRealtimeNotificationService = {
    sendToRoles: jest.fn(),
    sendToUser: jest.fn(),
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
          provide: RealtimeNotificationService,
          useValue: mockRealtimeNotificationService,
        },
      ],
    }).compile();

    service = module.get<SlaMonitoringService>(SlaMonitoringService);
    slaConfigRepository = module.get<Repository<SlaConfig>>(getRepositoryToken(SlaConfig));
    slaViolationRepository = module.get<Repository<SlaViolation>>(getRepositoryToken(SlaViolation));
    inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
    realtimeNotificationService = module.get<RealtimeNotificationService>(RealtimeNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('monitorSlaCompliance', () => {
    it('アクティブなSLA設定を取得して監視を実行する', async () => {
      const mockSlaConfig = {
        id: 'sla-1',
        applicationId: 'app-1',
        priorityLevel: 'high',
        responseTimeHours: 2,
        resolutionTimeHours: 24,
        escalationTimeHours: 4,
        businessHoursOnly: false,
        isActive: true,
        application: { id: 'app-1', name: 'Test App' },
      };

      const mockInquiry = {
        id: 'inquiry-1',
        applicationId: 'app-1',
        status: 'open',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3時間前
        responses: [],
      };

      mockSlaConfigRepository.find.mockResolvedValue([mockSlaConfig]);
      mockInquiryRepository.find.mockResolvedValue([mockInquiry]);
      mockSlaViolationRepository.findOne.mockResolvedValue(null);
      mockSlaViolationRepository.create.mockReturnValue({});
      mockSlaViolationRepository.save.mockResolvedValue({});

      await service.monitorSlaCompliance();

      expect(mockSlaConfigRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['application'],
      });
      expect(mockInquiryRepository.find).toHaveBeenCalledWith({
        where: {
          applicationId: 'app-1',
          status: 'open',
        },
        relations: ['responses'],
      });
    });
  });

  describe('getSlaMetrics', () => {
    it('SLAメトリクスを正しく計算する', async () => {
      const applicationId = 'app-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockInquiries = [
        {
          id: 'inquiry-1',
          applicationId,
          createdAt: new Date('2024-01-15'),
          status: 'resolved',
          priority: 'high',
          responses: [
            { createdAt: new Date('2024-01-15T02:00:00Z') }
          ],
          updatedAt: new Date('2024-01-16'),
        },
        {
          id: 'inquiry-2',
          applicationId,
          createdAt: new Date('2024-01-20'),
          status: 'open',
          priority: 'medium',
          responses: [],
          updatedAt: new Date('2024-01-20'),
        },
      ];

      const mockViolations = [
        {
          id: 'violation-1',
          inquiryId: 'inquiry-2',
          violationType: 'response_time',
          violationTime: new Date('2024-01-20'),
          slaConfig: { priorityLevel: 'medium' },
        },
      ];

      mockInquiryRepository.find.mockResolvedValue(mockInquiries);
      mockSlaViolationRepository.find.mockResolvedValue(mockViolations);

      const result = await service.getSlaMetrics(applicationId, startDate, endDate);

      expect(result).toEqual({
        applicationId,
        startDate,
        endDate,
        totalInquiries: 2,
        slaCompliant: 1,
        slaViolations: 1,
        complianceRate: 50,
        averageResponseTime: 2, // 2時間
        averageResolutionTime: 24, // 24時間
        priorityStats: expect.any(Object),
      });
    });

    it('問い合わせが0件の場合は100%の達成率を返す', async () => {
      const applicationId = 'app-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockInquiryRepository.find.mockResolvedValue([]);
      mockSlaViolationRepository.find.mockResolvedValue([]);

      const result = await service.getSlaMetrics(applicationId, startDate, endDate);

      expect(result.complianceRate).toBe(100);
      expect(result.totalInquiries).toBe(0);
    });
  });

  describe('営業時間計算', () => {
    it('営業時間を考慮しない場合は単純に時間を加算する', () => {
      const startTime = new Date('2024-01-15T10:00:00Z');
      const hours = 5;
      const slaConfig = {
        businessHoursOnly: false,
      } as SlaConfig;

      // privateメソッドのテストのため、サービスのプロトタイプからアクセス
      const result = (service as any).calculateExpectedTime(startTime, hours, slaConfig);
      const expected = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

      expect(result).toEqual(expected);
    });

    it('営業時間を考慮する場合は営業時間内のみカウントする', () => {
      const startTime = new Date('2024-01-15T10:00:00Z'); // 月曜日 10:00
      const hours = 10;
      const slaConfig = {
        businessHoursOnly: true,
        businessStartHour: 9,
        businessEndHour: 18,
        businessDays: '1,2,3,4,5', // 月-金
      } as SlaConfig;

      const result = (service as any).calculateExpectedTime(startTime, hours, slaConfig);

      // 営業時間内で10時間 = 1日と1時間
      // 月曜日の残り8時間 + 火曜日の2時間
      expect(result.getDate()).toBe(16); // 火曜日
      expect(result.getHours()).toBe(11); // 11:00
    });
  });
});