import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EscalationService } from '../services/escalation.service';
import { Escalation } from '../entities/escalation.entity';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationsService } from '../services/notifications.service';
import { InquiriesService } from '../../inquiries/services/inquiries.service';

describe('EscalationService', () => {
    let service: EscalationService;
    let escalationRepository: Repository<Escalation>;
    let inquiryRepository: Repository<Inquiry>;
    let userRepository: Repository<User>;
    let notificationsService: NotificationsService;
    let inquiriesService: InquiriesService;

    const mockEscalationRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockInquiryRepository = {
        findOne: jest.fn(),
    };

    const mockUserRepository = {
        findOne: jest.fn(),
    };

    const mockNotificationsService = {
        sendEscalationNotification: jest.fn(),
    };

    const mockInquiriesService = {
        updateInquiry: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EscalationService,
                {
                    provide: getRepositoryToken(Escalation),
                    useValue: mockEscalationRepository,
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
                    provide: NotificationsService,
                    useValue: mockNotificationsService,
                },
                {
                    provide: InquiriesService,
                    useValue: mockInquiriesService,
                },
            ],
        }).compile();

        service = module.get<EscalationService>(EscalationService);
        escalationRepository = module.get<Repository<Escalation>>(getRepositoryToken(Escalation));
        inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
        notificationsService = module.get<NotificationsService>(NotificationsService);
        inquiriesService = module.get<InquiriesService>(InquiriesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('escalateInquiry', () => {
        it('問い合わせを手動エスカレーションできること', async () => {
            const inquiryId = 'inquiry-1';
            const escalatedTo = 'user-2';
            const escalatedBy = 'user-1';
            const reason = 'complexity';
            const comment = 'Technical expertise required';

            const mockInquiry = {
                id: inquiryId,
                assignedTo: 'user-1',
                assignedUser: { id: 'user-1', name: 'User 1' },
            };

            const mockToUser = {
                id: escalatedTo,
                name: 'User 2',
            };

            const mockEscalation = {
                id: 'escalation-1',
                inquiryId,
                escalatedFrom: 'user-1',
                escalatedTo,
                escalatedBy,
                escalationReason: 'manual',
                escalationLevel: 1,
                comment,
                isAutomatic: false,
            };

            mockInquiryRepository.findOne.mockResolvedValue(mockInquiry);
            mockUserRepository.findOne.mockResolvedValue(mockToUser);
            mockEscalationRepository.findOne
                .mockResolvedValueOnce(null) // getCurrentEscalationLevel
                .mockResolvedValueOnce(mockEscalation); // final findOne
            mockEscalationRepository.create.mockReturnValue(mockEscalation);
            mockEscalationRepository.save.mockResolvedValue(mockEscalation);
            mockInquiriesService.updateInquiry.mockResolvedValue(undefined);
            mockNotificationsService.sendEscalationNotification.mockResolvedValue(undefined);

            const result = await service.escalateInquiry(inquiryId, escalatedTo, escalatedBy, reason, comment);

            expect(mockEscalationRepository.create).toHaveBeenCalledWith({
                inquiryId,
                escalatedFrom: 'user-1',
                escalatedTo,
                escalatedBy,
                escalationReason: 'manual',
                escalationLevel: 1,
                comment,
                isAutomatic: false,
            });
            expect(mockInquiriesService.updateInquiry).toHaveBeenCalledWith(inquiryId, { assignedTo: escalatedTo });
            expect(mockNotificationsService.sendEscalationNotification).toHaveBeenCalledWith(mockEscalation);
            expect(result).toEqual(mockEscalation);
        });

        it('存在しない問い合わせの場合はエラーを投げること', async () => {
            const inquiryId = 'non-existent';
            const escalatedTo = 'user-2';
            const escalatedBy = 'user-1';
            const reason = 'complexity';

            mockInquiryRepository.findOne.mockResolvedValue(null);

            await expect(
                service.escalateInquiry(inquiryId, escalatedTo, escalatedBy, reason)
            ).rejects.toThrow(NotFoundException);
        });

        it('存在しないエスカレーション先ユーザーの場合はエラーを投げること', async () => {
            const inquiryId = 'inquiry-1';
            const escalatedTo = 'non-existent';
            const escalatedBy = 'user-1';
            const reason = 'complexity';

            const mockInquiry = {
                id: inquiryId,
                assignedTo: 'user-1',
                assignedUser: { id: 'user-1', name: 'User 1' },
            };

            mockInquiryRepository.findOne.mockResolvedValue(mockInquiry);
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(
                service.escalateInquiry(inquiryId, escalatedTo, escalatedBy, reason)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('autoEscalateInquiry', () => {
        it('問い合わせを自動エスカレーションできること', async () => {
            const inquiryId = 'inquiry-1';
            const reason = 'SLA violation detected';

            const mockInquiry = {
                id: inquiryId,
                assignedTo: 'user-1',
                priority: 'medium',
                assignedUser: { id: 'user-1', name: 'User 1' },
                application: { id: 'app-1', name: 'App 1' },
            };

            const mockSupervisor = {
                id: 'supervisor-1',
                name: 'Supervisor',
                role: { name: 'supervisor' },
            };

            const mockEscalation = {
                id: 'escalation-1',
                inquiryId,
                escalatedFrom: 'user-1',
                escalatedTo: 'supervisor-1',
                escalationReason: 'sla_violation',
                escalationLevel: 1,
                comment: reason,
                isAutomatic: true,
            };

            mockInquiryRepository.findOne.mockResolvedValue(mockInquiry);
            mockUserRepository.findOne.mockResolvedValue(mockSupervisor);
            mockEscalationRepository.findOne
                .mockResolvedValueOnce(null) // getCurrentEscalationLevel
                .mockResolvedValueOnce(mockEscalation); // final findOne
            mockEscalationRepository.create.mockReturnValue(mockEscalation);
            mockEscalationRepository.save.mockResolvedValue(mockEscalation);
            mockInquiriesService.updateInquiry.mockResolvedValue(undefined);
            mockNotificationsService.sendEscalationNotification.mockResolvedValue(undefined);

            const result = await service.autoEscalateInquiry(inquiryId, reason);

            expect(mockEscalationRepository.create).toHaveBeenCalledWith({
                inquiryId,
                escalatedFrom: 'user-1',
                escalatedTo: 'supervisor-1',
                escalationReason: 'sla_violation',
                escalationLevel: 1,
                comment: reason,
                isAutomatic: true,
            });
            expect(mockInquiriesService.updateInquiry).toHaveBeenCalledWith(inquiryId, { assignedTo: 'supervisor-1' });
            expect(mockInquiriesService.updateInquiry).toHaveBeenCalledWith(inquiryId, { priority: 'high' });
            expect(result).toEqual(mockEscalation);
        });

        it('エスカレーション先が見つからない場合はnullを返すこと', async () => {
            const inquiryId = 'inquiry-1';
            const reason = 'SLA violation detected';

            const mockInquiry = {
                id: inquiryId,
                assignedTo: 'user-1',
                priority: 'medium',
                assignedUser: { id: 'user-1', name: 'User 1' },
                application: { id: 'app-1', name: 'App 1' },
            };

            mockInquiryRepository.findOne.mockResolvedValue(mockInquiry);
            mockUserRepository.findOne.mockResolvedValue(null); // supervisor not found
            mockUserRepository.findOne.mockResolvedValue(null); // admin not found

            const result = await service.autoEscalateInquiry(inquiryId, reason);

            expect(result).toBeNull();
        });
    });

    describe('getEscalationHistory', () => {
        it('エスカレーション履歴を取得できること', async () => {
            const inquiryId = 'inquiry-1';
            const mockHistory = [
                {
                    id: 'escalation-1',
                    inquiryId,
                    escalationLevel: 1,
                    escalatedAt: new Date('2024-01-01'),
                },
                {
                    id: 'escalation-2',
                    inquiryId,
                    escalationLevel: 2,
                    escalatedAt: new Date('2024-01-02'),
                },
            ];

            mockEscalationRepository.find.mockResolvedValue(mockHistory);

            const result = await service.getEscalationHistory(inquiryId);

            expect(mockEscalationRepository.find).toHaveBeenCalledWith({
                where: { inquiryId },
                relations: ['fromUser', 'toUser', 'escalator'],
                order: { escalatedAt: 'ASC' },
            });
            expect(result).toEqual(mockHistory);
        });
    });

    describe('getEscalationStats', () => {
        it('エスカレーション統計を取得できること', async () => {
            const mockEscalations = [
                { escalationReason: 'sla_violation', escalationLevel: 1, isAutomatic: true },
                { escalationReason: 'complexity', escalationLevel: 1, isAutomatic: false },
                { escalationReason: 'sla_violation', escalationLevel: 2, isAutomatic: true },
            ];

            const mockQueryBuilder = {
                createQueryBuilder: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockEscalations),
            };

            mockEscalationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const stats = await service.getEscalationStats('app-1');

            expect(stats.total).toBe(3);
            expect(stats.automatic).toBe(2);
            expect(stats.manual).toBe(1);
            expect(stats.byReason.sla_violation).toBe(2);
            expect(stats.byReason.complexity).toBe(1);
            expect(stats.byLevel['1']).toBe(2);
            expect(stats.byLevel['2']).toBe(1);
            expect(stats.averageLevel).toBe(4 / 3); // (1+1+2)/3
        });
    });
});