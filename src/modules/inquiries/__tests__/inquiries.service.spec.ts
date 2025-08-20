/**
 * 問い合わせサービスのユニットテスト
 * 要件1: 問い合わせ登録機能のテスト
 * 要件2: 問い合わせ・回答管理機能のテスト
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { InquiriesService } from '../services/inquiries.service';
import { WorkflowService } from '../services/workflow.service';
import { Inquiry, InquiryStatus } from '../entities/inquiry.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';
import { Application } from '../entities/application.entity';
import { Response } from '../../responses/entities/response.entity';
import { CreateInquiryDto, UpdateInquiryStatusDto } from '../dto';

describe('InquiriesService', () => {
    let service: InquiriesService;
    let inquiryRepository: jest.Mocked<Repository<Inquiry>>;
    let statusHistoryRepository: jest.Mocked<Repository<InquiryStatusHistory>>;
    let applicationRepository: jest.Mocked<Repository<Application>>;
    let responseRepository: jest.Mocked<Repository<Response>>;
    let workflowService: jest.Mocked<WorkflowService>;

    // テスト用のモックデータ
    const mockApplication: Application = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'TestApp',
        description: 'Test Application',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        inquiries: []
    };

    const mockInquiry: Inquiry = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        appId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'テスト問い合わせ',
        content: 'テスト内容',
        status: 'new',
        priority: 'medium',
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        app: mockApplication,
        statusHistory: []
    };

    const mockCreateInquiryDto: CreateInquiryDto = {
        title: 'テスト問い合わせ',
        content: 'テスト内容',
        appId: '550e8400-e29b-41d4-a716-446655440000',
        customerEmail: 'test@example.com',
        customerName: 'テストユーザー',
        category: 'テスト',
        priority: 'medium'
    };

    beforeEach(async () => {
        // モックリポジトリの作成
        const mockInquiryRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            merge: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getCount: jest.fn(),
                getMany: jest.fn()
            }))
        };

        const mockStatusHistoryRepository = {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn()
        };

        const mockApplicationRepository = {
            findOne: jest.fn()
        };

        const mockResponseRepository = {
            findOne: jest.fn(),
            find: jest.fn()
        };

        const mockWorkflowService = {
            executeStatusChange: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InquiriesService,
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: mockInquiryRepository
                },
                {
                    provide: getRepositoryToken(InquiryStatusHistory),
                    useValue: mockStatusHistoryRepository
                },
                {
                    provide: getRepositoryToken(Application),
                    useValue: mockApplicationRepository
                },
                {
                    provide: getRepositoryToken(Response),
                    useValue: mockResponseRepository
                },
                {
                    provide: WorkflowService,
                    useValue: mockWorkflowService
                }
            ]
        }).compile();

        service = module.get<InquiriesService>(InquiriesService);
        inquiryRepository = module.get(getRepositoryToken(Inquiry));
        statusHistoryRepository = module.get(getRepositoryToken(InquiryStatusHistory));
        applicationRepository = module.get(getRepositoryToken(Application));
        responseRepository = module.get(getRepositoryToken(Response));
        workflowService = module.get(WorkflowService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createInquiry', () => {
        it('問い合わせを正常に作成できること', async () => {
            // Arrange
            applicationRepository.findOne.mockResolvedValue(mockApplication);
            inquiryRepository.create.mockReturnValue(mockInquiry);
            inquiryRepository.save.mockResolvedValue(mockInquiry);
            statusHistoryRepository.create.mockReturnValue({} as InquiryStatusHistory);
            statusHistoryRepository.save.mockResolvedValue({} as InquiryStatusHistory);

            // Act
            const result = await service.createInquiry(mockCreateInquiryDto, '550e8400-e29b-41d4-a716-446655440003');

            // Assert
            expect(applicationRepository.findOne).toHaveBeenCalledWith({
                where: { id: mockCreateInquiryDto.appId, isActive: true }
            });
            expect(inquiryRepository.create).toHaveBeenCalledWith({
                ...mockCreateInquiryDto,
                status: 'new',
                priority: 'medium',
                tags: [],
                metadata: {}
            });
            expect(inquiryRepository.save).toHaveBeenCalledWith(mockInquiry);
            expect(statusHistoryRepository.create).toHaveBeenCalled();
            expect(statusHistoryRepository.save).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.id).toBe(mockInquiry.id);
        });

        it('存在しないアプリケーションIDの場合はエラーを投げること', async () => {
            // Arrange
            applicationRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.createInquiry(mockCreateInquiryDto, '550e8400-e29b-41d4-a716-446655440003')
            ).rejects.toThrow(BadRequestException);
        });

        it('必須項目が不足している場合はエラーを投げること', async () => {
            // Arrange
            const invalidDto = { ...mockCreateInquiryDto, title: '' };

            // Act & Assert
            await expect(
                service.createInquiry(invalidDto, '550e8400-e29b-41d4-a716-446655440003')
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getInquiry', () => {
        it('問い合わせを正常に取得できること', async () => {
            // Arrange
            const mockInquiryWithRelations = {
                ...mockInquiry,
                app: mockApplication,
                statusHistory: []
            };
            inquiryRepository.findOne.mockResolvedValue(mockInquiryWithRelations);

            // Act
            const result = await service.getInquiry('550e8400-e29b-41d4-a716-446655440001');

            // Assert
            expect(inquiryRepository.findOne).toHaveBeenCalledWith({
                where: { id: '550e8400-e29b-41d4-a716-446655440001' },
                relations: [
                    'app',
                    'assignedUser',
                    'statusHistory',
                    'statusHistory.changedByUser'
                ],
                order: {
                    statusHistory: {
                        changedAt: 'DESC'
                    }
                }
            });
            expect(result).toBeDefined();
            expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440001');
        });

        it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
            // Arrange
            inquiryRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.getInquiry('non-existent-id')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateInquiryStatus', () => {
        it('問い合わせ状態を正常に更新できること', async () => {
            // Arrange
            const updateStatusDto: UpdateInquiryStatusDto = {
                status: 'in_progress',
                comment: '対応開始'
            };

            const updatedInquiry = { ...mockInquiry, status: 'in_progress' as InquiryStatus };
            workflowService.executeStatusChange.mockResolvedValue(updatedInquiry);

            // Act
            const result = await service.updateInquiryStatus(
                '550e8400-e29b-41d4-a716-446655440001',
                updateStatusDto,
                '550e8400-e29b-41d4-a716-446655440003',
                '127.0.0.1'
            );

            // Assert
            expect(workflowService.executeStatusChange).toHaveBeenCalledWith(
                '550e8400-e29b-41d4-a716-446655440001',
                'in_progress',
                '550e8400-e29b-41d4-a716-446655440003',
                '対応開始',
                '127.0.0.1'
            );
            expect(result).toBeDefined();
            expect(result.status).toBe('in_progress');
        });

        it('ワークフローサービスのエラーを適切に処理すること', async () => {
            // Arrange
            const updateStatusDto: UpdateInquiryStatusDto = {
                status: 'resolved',
                comment: '無効な遷移'
            };

            workflowService.executeStatusChange.mockRejectedValue(
                new BadRequestException('無効な状態遷移です')
            );

            // Act & Assert
            await expect(
                service.updateInquiryStatus(
                    '550e8400-e29b-41d4-a716-446655440001',
                    updateStatusDto,
                    '550e8400-e29b-41d4-a716-446655440003'
                )
            ).rejects.toThrow(BadRequestException);
        });

        it('ワークフローサービスが正常に呼び出されること', async () => {
            // Arrange
            const updateStatusDto: UpdateInquiryStatusDto = {
                status: 'resolved',
                comment: '解決済み'
            };

            const resolvedInquiry = {
                ...mockInquiry,
                status: 'resolved' as InquiryStatus,
                resolvedAt: new Date()
            };
            workflowService.executeStatusChange.mockResolvedValue(resolvedInquiry);

            // Act
            const result = await service.updateInquiryStatus(
                '550e8400-e29b-41d4-a716-446655440001',
                updateStatusDto,
                '550e8400-e29b-41d4-a716-446655440003'
            );

            // Assert
            expect(workflowService.executeStatusChange).toHaveBeenCalledWith(
                '550e8400-e29b-41d4-a716-446655440001',
                'resolved',
                '550e8400-e29b-41d4-a716-446655440003',
                '解決済み',
                undefined
            );
            expect(result.status).toBe('resolved');
        });
    });

    describe('getInquiryHistory', () => {
        it('問い合わせ履歴を正常に取得できること', async () => {
            // Arrange
            const mockHistory: InquiryStatusHistory[] = [
                {
                    id: '550e8400-e29b-41d4-a716-446655440002',
                    inquiryId: '550e8400-e29b-41d4-a716-446655440001',
                    oldStatus: null,
                    newStatus: 'new',
                    changedBy: 'system',
                    changedAt: new Date(),
                    metadata: {},
                    inquiry: mockInquiry,
                    changedByUser: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            inquiryRepository.findOne.mockResolvedValue(mockInquiry);
            statusHistoryRepository.find.mockResolvedValue(mockHistory);

            // Act
            const result = await service.getInquiryHistory('550e8400-e29b-41d4-a716-446655440001');

            // Assert
            expect(inquiryRepository.findOne).toHaveBeenCalledWith({
                where: { id: '550e8400-e29b-41d4-a716-446655440001' }
            });
            expect(statusHistoryRepository.find).toHaveBeenCalledWith({
                where: { inquiryId: '550e8400-e29b-41d4-a716-446655440001' },
                relations: ['changedByUser'],
                order: { changedAt: 'ASC' }
            });
            expect(result).toEqual(mockHistory);
        });

        it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
            // Arrange
            inquiryRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.getInquiryHistory('non-existent-id')
            ).rejects.toThrow(NotFoundException);
        });
    });
});