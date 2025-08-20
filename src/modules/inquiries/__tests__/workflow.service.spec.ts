/**
 * ワークフローサービスのユニットテスト
 * 要件2.2: 状態管理機能のテスト
 * 要件2.3: 状態変更履歴の記録機能のテスト
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

import { WorkflowService } from '../services/workflow.service';
import { Inquiry, InquiryStatus } from '../entities/inquiry.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';

describe('WorkflowService', () => {
    let service: WorkflowService;
    let inquiryRepository: jest.Mocked<Repository<Inquiry>>;
    let statusHistoryRepository: jest.Mocked<Repository<InquiryStatusHistory>>;

    // テスト用のモックデータ
    const mockInquiry: Inquiry = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        appId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'テスト問い合わせ',
        content: 'テスト内容',
        status: 'new',
        priority: 'medium',
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        app: null,
        statusHistory: []
    };

    beforeEach(async () => {
        // モックリポジトリの作成
        const mockInquiryRepository = {
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getRawMany: jest.fn(),
                getMany: jest.fn()
            }))
        };

        const mockStatusHistoryRepository = {
            create: jest.fn(),
            save: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkflowService,
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: mockInquiryRepository
                },
                {
                    provide: getRepositoryToken(InquiryStatusHistory),
                    useValue: mockStatusHistoryRepository
                }
            ]
        }).compile();

        service = module.get<WorkflowService>(WorkflowService);
        inquiryRepository = module.get(getRepositoryToken(Inquiry));
        statusHistoryRepository = module.get(getRepositoryToken(InquiryStatusHistory));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateStatusTransition', () => {
        it('有効な状態遷移の場合はtrueを返すこと', () => {
            // new → in_progress は有効
            expect(service.validateStatusTransition('new', 'in_progress')).toBe(true);

            // in_progress → resolved は有効
            expect(service.validateStatusTransition('in_progress', 'resolved')).toBe(true);

            // resolved → closed は有効
            expect(service.validateStatusTransition('resolved', 'closed')).toBe(true);
        });

        it('無効な状態遷移の場合はfalseを返すこと', () => {
            // new → resolved は無効（in_progressを経由する必要がある）
            expect(service.validateStatusTransition('new', 'resolved')).toBe(false);

            // closed → new は無効
            expect(service.validateStatusTransition('closed', 'new')).toBe(false);
        });

        it('同じ状態への遷移の場合はfalseを返すこと', () => {
            expect(service.validateStatusTransition('new', 'new')).toBe(false);
            expect(service.validateStatusTransition('in_progress', 'in_progress')).toBe(false);
        });
    });

    describe('executeStatusChange', () => {
        it('有効な状態変更を正常に実行できること', async () => {
            // Arrange
            inquiryRepository.findOne
                .mockResolvedValueOnce(mockInquiry) // 初回取得
                .mockResolvedValueOnce({ ...mockInquiry, status: 'in_progress' }); // 更新後取得

            inquiryRepository.update.mockResolvedValue({ affected: 1 } as any);
            statusHistoryRepository.create.mockReturnValue({} as InquiryStatusHistory);
            statusHistoryRepository.save.mockResolvedValue({} as InquiryStatusHistory);

            // Act
            const result = await service.executeStatusChange(
                '550e8400-e29b-41d4-a716-446655440000',
                'in_progress',
                '550e8400-e29b-41d4-a716-446655440002',
                '対応を開始します'
            );

            // Assert
            expect(inquiryRepository.findOne).toHaveBeenCalledWith({
                where: { id: '550e8400-e29b-41d4-a716-446655440000' }
            });
            expect(inquiryRepository.update).toHaveBeenCalledWith(
                '550e8400-e29b-41d4-a716-446655440000',
                { status: 'in_progress' }
            );
            expect(statusHistoryRepository.create).toHaveBeenCalledWith({
                inquiryId: '550e8400-e29b-41d4-a716-446655440000',
                oldStatus: 'new',
                newStatus: 'in_progress',
                changedBy: '550e8400-e29b-41d4-a716-446655440002',
                comment: '対応を開始します',
                ipAddress: undefined,
                metadata: {
                    timestamp: expect.any(String),
                    source: 'workflow_service'
                }
            });
            expect(result.status).toBe('in_progress');
        });

        it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
            // Arrange
            inquiryRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.executeStatusChange(
                    'non-existent-id',
                    'in_progress',
                    '550e8400-e29b-41d4-a716-446655440002'
                )
            ).rejects.toThrow(BadRequestException);
        });

        it('無効な状態遷移の場合はエラーを投げること', async () => {
            // Arrange
            inquiryRepository.findOne.mockResolvedValue(mockInquiry);

            // Act & Assert
            await expect(
                service.executeStatusChange(
                    '550e8400-e29b-41d4-a716-446655440000',
                    'resolved', // new → resolved は無効
                    '550e8400-e29b-41d4-a716-446655440002'
                )
            ).rejects.toThrow(BadRequestException);
        });

        it('resolved状態への変更時はresolvedAtが設定されること', async () => {
            // Arrange
            const inProgressInquiry = { ...mockInquiry, status: 'in_progress' as InquiryStatus };
            inquiryRepository.findOne
                .mockResolvedValueOnce(inProgressInquiry)
                .mockResolvedValueOnce({ ...inProgressInquiry, status: 'resolved' });

            inquiryRepository.update.mockResolvedValue({ affected: 1 } as any);
            statusHistoryRepository.create.mockReturnValue({} as InquiryStatusHistory);
            statusHistoryRepository.save.mockResolvedValue({} as InquiryStatusHistory);

            // Act
            await service.executeStatusChange(
                '550e8400-e29b-41d4-a716-446655440000',
                'resolved',
                '550e8400-e29b-41d4-a716-446655440002',
                '問題が解決されました'
            );

            // Assert
            expect(inquiryRepository.update).toHaveBeenCalledWith(
                '550e8400-e29b-41d4-a716-446655440000',
                expect.objectContaining({
                    status: 'resolved',
                    resolvedAt: expect.any(Date)
                })
            );
        });

        it('closed状態への変更時はclosedAtが設定されること', async () => {
            // Arrange
            const resolvedInquiry = { ...mockInquiry, status: 'resolved' as InquiryStatus };
            inquiryRepository.findOne
                .mockResolvedValueOnce(resolvedInquiry)
                .mockResolvedValueOnce({ ...resolvedInquiry, status: 'closed' });

            inquiryRepository.update.mockResolvedValue({ affected: 1 } as any);
            statusHistoryRepository.create.mockReturnValue({} as InquiryStatusHistory);
            statusHistoryRepository.save.mockResolvedValue({} as InquiryStatusHistory);

            // Act
            await service.executeStatusChange(
                '550e8400-e29b-41d4-a716-446655440000',
                'closed',
                '550e8400-e29b-41d4-a716-446655440002',
                'クローズします'
            );

            // Assert
            expect(inquiryRepository.update).toHaveBeenCalledWith(
                '550e8400-e29b-41d4-a716-446655440000',
                expect.objectContaining({
                    status: 'closed',
                    closedAt: expect.any(Date)
                })
            );
        });

        it('pending状態への変更時はコメントが必須であること', async () => {
            // Arrange
            const inProgressInquiry = { ...mockInquiry, status: 'in_progress' as InquiryStatus };
            inquiryRepository.findOne.mockResolvedValue(inProgressInquiry);

            // Act & Assert - コメントなしの場合
            await expect(
                service.executeStatusChange(
                    '550e8400-e29b-41d4-a716-446655440000',
                    'pending',
                    '550e8400-e29b-41d4-a716-446655440002'
                    // コメントなし
                )
            ).rejects.toThrow(BadRequestException);

            // Act & Assert - コメントありの場合は成功
            inquiryRepository.findOne
                .mockResolvedValueOnce(inProgressInquiry)
                .mockResolvedValueOnce({ ...inProgressInquiry, status: 'pending' });
            inquiryRepository.update.mockResolvedValue({ affected: 1 } as any);
            statusHistoryRepository.create.mockReturnValue({} as InquiryStatusHistory);
            statusHistoryRepository.save.mockResolvedValue({} as InquiryStatusHistory);

            const result = await service.executeStatusChange(
                '550e8400-e29b-41d4-a716-446655440000',
                'pending',
                '550e8400-e29b-41d4-a716-446655440002',
                '追加情報を待っています'
            );

            expect(result.status).toBe('pending');
        });
    });

    describe('getAvailableTransitions', () => {
        it('各状態から利用可能な遷移を正しく返すこと', () => {
            expect(service.getAvailableTransitions('new')).toEqual(['in_progress', 'closed']);
            expect(service.getAvailableTransitions('in_progress')).toEqual(['pending', 'resolved', 'closed']);
            expect(service.getAvailableTransitions('pending')).toEqual(['in_progress', 'resolved', 'closed']);
            expect(service.getAvailableTransitions('resolved')).toEqual(['closed', 'in_progress']);
            expect(service.getAvailableTransitions('closed')).toEqual(['in_progress']);
        });
    });

    describe('getStatusStatistics', () => {
        it('状態統計を正常に取得できること', async () => {
            // Arrange
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    { status: 'new', count: '5' },
                    { status: 'in_progress', count: '3' },
                    { status: 'resolved', count: '10' }
                ])
            };
            inquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

            // Act
            const result = await service.getStatusStatistics();

            // Assert
            expect(result).toEqual({
                new: 5,
                in_progress: 3,
                pending: 0,
                resolved: 10,
                closed: 0
            });
        });

        it('アプリケーションIDを指定した場合のフィルタリングが動作すること', async () => {
            // Arrange
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([])
            };
            inquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

            // Act
            await service.getStatusStatistics('550e8400-e29b-41d4-a716-446655440001');

            // Assert
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
                'inquiry.appId = :appId',
                { appId: '550e8400-e29b-41d4-a716-446655440001' }
            );
        });
    });
});