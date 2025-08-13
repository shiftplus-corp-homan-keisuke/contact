import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EscalationService } from '../services/escalation.service';
import { SlaViolation } from '../entities/sla-violation.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { User } from '../../modules/users/entities/user.entity';
import { RealtimeNotificationService } from '../services/realtime-notification.service';
import { SlackNotificationService } from '../services/slack-notification.service';
import { TeamsNotificationService } from '../services/teams-notification.service';

describe('EscalationService', () => {
  let service: EscalationService;
  let slaViolationRepository: Repository<SlaViolation>;
  let inquiryRepository: Repository<Inquiry>;
  let userRepository: Repository<User>;
  let realtimeNotificationService: RealtimeNotificationService;
  let slackNotificationService: SlackNotificationService;
  let teamsNotificationService: TeamsNotificationService;

  const mockSlaViolationRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockInquiryRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockRealtimeNotificationService = {
    sendToUser: jest.fn(),
    sendToRoles: jest.fn(),
  };

  const mockSlackNotificationService = {
    sendDirectMessage: jest.fn(),
  };

  const mockTeamsNotificationService = {
    sendDirectMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationService,
        {
          provide: getRepositoryToken(SlaViolation),
          useValue: mockSlaViolationRepository,
        },
        {
          provide: getRepositoryToken(Inquiry),
          useValue: mockInquiryRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: RealtimeNotificationService,
          useValue: mockRealtimeNotificationService,
        },
        {
          provide: SlackNotificationService,
          useValue: mockSlackNotificationService,
        },
        {
          provide: TeamsNotificationService,
          useValue: mockTeamsNotificationService,
        },
      ],
    }).compile();

    service = module.get<EscalationService>(EscalationService);
    slaViolationRepository = module.get<Repository<SlaViolation>>(getRepositoryToken(SlaViolation));
    inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    realtimeNotificationService = module.get<RealtimeNotificationService>(RealtimeNotificationService);
    slackNotificationService = module.get<SlackNotificationService>(SlackNotificationService);
    teamsNotificationService = module.get<TeamsNotificationService>(TeamsNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performAutoEscalation', () => {
    it('自動エスカレーションを正常に実行する', async () => {
      const violationId = 'violation-1';
      const mockViolation = {
        id: violationId,
        inquiryId: 'inquiry-1',
        isEscalated: false,
        severity: 'major',
        delayHours: 5,
        inquiry: {
          id: 'inquiry-1',
          assignedToUserId: 'user-1',
          priority: 'medium',
        },
        slaConfig: {
          application: { name: 'Test App' },
        },
      };

      const mockAssignedUser = {
        id: 'user-1',
        manager: {
          id: 'manager-1',
          email: 'manager@example.com',
          name: 'Manager',
        },
      };

      const mockInquiry = {
        id: 'inquiry-1',
        assignedToUserId: 'user-1',
        priority: 'medium',
      };

      mockSlaViolationRepository.findOne.mockResolvedValue(mockViolation);
      mockUserRepository.findOne.mockResolvedValue(mockAssignedUser);
      mockInquiryRepository.findOne.mockResolvedValue(mockInquiry);
      mockSlaViolationRepository.save.mockResolvedValue(mockViolation);
      mockInquiryRepository.save.mockResolvedValue(mockInquiry);

      await service.performAutoEscalation(violationId);

      expect(mockSlaViolationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isEscalated: true,
          escalatedToUserId: 'manager-1',
          escalatedAt: expect.any(Date),
        })
      );

      expect(mockInquiryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedToUserId: 'manager-1',
          priority: 'high', // エスカレーションにより優先度が上がる
        })
      );

      expect(mockRealtimeNotificationService.sendToUser).toHaveBeenCalled();
    });

    it('存在しないSLA違反IDの場合はNotFoundExceptionを投げる', async () => {
      const violationId = 'non-existent';
      mockSlaViolationRepository.findOne.mockResolvedValue(null);

      await expect(service.performAutoEscalation(violationId)).rejects.toThrow(NotFoundException);
    });

    it('既にエスカレーション済みの場合は処理をスキップする', async () => {
      const violationId = 'violation-1';
      const mockViolation = {
        id: violationId,
        isEscalated: true,
      };

      mockSlaViolationRepository.findOne.mockResolvedValue(mockViolation);

      await service.performAutoEscalation(violationId);

      expect(mockSlaViolationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('performManualEscalation', () => {
    it('手動エスカレーションを正常に実行する', async () => {
      const violationId = 'violation-1';
      const escalationRule = {
        escalateToUserId: 'manager-1',
        reason: 'urgent_issue',
        notes: 'Customer is very upset',
      };
      const escalatedByUserId = 'user-1';

      const mockViolation = {
        id: violationId,
        inquiryId: 'inquiry-1',
        isEscalated: false,
        inquiry: { id: 'inquiry-1' },
        slaConfig: { application: { name: 'Test App' } },
      };

      const mockEscalationTarget = {
        id: 'manager-1',
        email: 'manager@example.com',
        name: 'Manager',
      };

      mockSlaViolationRepository.findOne.mockResolvedValue(mockViolation);
      mockUserRepository.findOne.mockResolvedValue(mockEscalationTarget);
      mockSlaViolationRepository.save.mockResolvedValue(mockViolation);

      await service.performManualEscalation(violationId, escalationRule, escalatedByUserId);

      expect(mockSlaViolationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isEscalated: true,
          escalatedToUserId: 'manager-1',
          resolutionNotes: 'Customer is very upset',
        })
      );
    });

    it('存在しないエスカレーション先ユーザーの場合はNotFoundExceptionを投げる', async () => {
      const violationId = 'violation-1';
      const escalationRule = {
        escalateToUserId: 'non-existent-user',
        reason: 'urgent_issue',
      };
      const escalatedByUserId = 'user-1';

      const mockViolation = {
        id: violationId,
        isEscalated: false,
      };

      mockSlaViolationRepository.findOne.mockResolvedValue(mockViolation);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.performManualEscalation(violationId, escalationRule, escalatedByUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEscalationHistory', () => {
    it('問い合わせのエスカレーション履歴を取得する', async () => {
      const inquiryId = 'inquiry-1';
      const mockEscalations = [
        {
          id: 'escalation-1',
          inquiryId,
          isEscalated: true,
          escalatedAt: new Date(),
        },
        {
          id: 'escalation-2',
          inquiryId,
          isEscalated: true,
          escalatedAt: new Date(),
        },
      ];

      mockSlaViolationRepository.find.mockResolvedValue(mockEscalations);

      const result = await service.getEscalationHistory(inquiryId);

      expect(result).toEqual(mockEscalations);
      expect(mockSlaViolationRepository.find).toHaveBeenCalledWith({
        where: {
          inquiryId,
          isEscalated: true,
        },
        relations: ['escalatedToUser', 'slaConfig'],
        order: { escalatedAt: 'DESC' },
      });
    });
  });

  describe('getEscalationStats', () => {
    it('エスカレーション統計を正しく計算する', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockEscalations = [
        {
          id: 'escalation-1',
          isResolved: true,
          escalatedToUserId: 'user-1',
          escalatedToUser: { id: 'user-1', name: 'User 1' },
          severity: 'major',
        },
        {
          id: 'escalation-2',
          isResolved: false,
          escalatedToUserId: 'user-1',
          escalatedToUser: { id: 'user-1', name: 'User 1' },
          severity: 'critical',
        },
        {
          id: 'escalation-3',
          isResolved: true,
          escalatedToUserId: 'user-2',
          escalatedToUser: { id: 'user-2', name: 'User 2' },
          severity: 'major',
        },
      ];

      mockSlaViolationRepository.find.mockResolvedValue(mockEscalations);

      const result = await service.getEscalationStats(startDate, endDate);

      expect(result).toEqual({
        totalEscalations: 3,
        resolvedEscalations: 2,
        pendingEscalations: 1,
        resolutionRate: 66.66666666666666,
        escalationsByUser: expect.arrayContaining([
          expect.objectContaining({
            user: { id: 'user-1', name: 'User 1' },
            total: 2,
            resolved: 1,
            pending: 1,
          }),
          expect.objectContaining({
            user: { id: 'user-2', name: 'User 2' },
            total: 1,
            resolved: 1,
            pending: 0,
          }),
        ]),
        escalationsBySeverity: {
          major: { total: 2, resolved: 2, pending: 0 },
          critical: { total: 1, resolved: 0, pending: 1 },
        },
      });
    });
  });

  describe('優先度エスカレーション', () => {
    it('優先度を正しくエスカレーションする', () => {
      expect((service as any).escalatePriority('low')).toBe('medium');
      expect((service as any).escalatePriority('medium')).toBe('high');
      expect((service as any).escalatePriority('high')).toBe('critical');
      expect((service as any).escalatePriority('critical')).toBe('critical'); // 最高優先度はそのまま
    });
  });
});