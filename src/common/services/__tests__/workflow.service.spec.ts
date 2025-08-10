/**
 * ワークフローサービスのユニットテスト
 * 要件: 2.2, 2.3 (状態管理とワークフロー機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkflowService } from '../workflow.service';
import { Inquiry } from '../../entities/inquiry.entity';
import { InquiryStatusHistory } from '../../entities/inquiry-status-history.entity';
import { User } from '../../entities/user.entity';
import { InquiryStatus, InquiryPriority } from '../../types/inquiry.types';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let inquiryRepository: jest.Mocked<Repository<Inquiry>>;
  let statusHistoryRepository: jest.Mocked<Repository<InquiryStatusHistory>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockInquiry: Inquiry = {
    id: 'test-inquiry-id',
    appId: 'test-app-id',
    title: 'テスト問い合わせ',
    content: 'テスト内容',
    status: InquiryStatus.NEW,
    priority: InquiryPriority.MEDIUM,
    category: 'テストカテゴリ',
    customerEmail: 'test@example.com',
    customerName: 'テストユーザー',
    assignedTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    application: null,
    assignedUser: null,
    responses: [],
    statusHistory: [],
  };

  const mockUser: User = {
    id: 'test-user-id',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    name: 'テストユーザー',
    roleId: 'role-id',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: null,
    assignedInquiries: [],
    responses: [],
    history: [],
    changedHistory: [],
  };

  const mockStatusHistory: InquiryStatusHistory = {
    id: 'test-history-id',
    inquiryId: 'test-inquiry-id',
    oldStatus: InquiryStatus.NEW,
    newStatus: InquiryStatus.IN_PROGRESS,
    changedBy: 'test-user-id',
    comment: 'テストコメント',
    changedAt: new Date(),
    inquiry: mockInquiry,
    changedByUser: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: getRepositoryToken(Inquiry),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InquiryStatusHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    inquiryRepository = module.get(getRepositoryToken(Inquiry));
    statusHistoryRepository = module.get(getRepositoryToken(InquiryStatusHistory));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateInquiryStatus', () => {
    it('正常に状態を更新できること', async () => {
      // Arrange
      const updatedInquiry = { ...mockInquiry, status: InquiryStatus.IN_PROGRESS };
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      userRepository.findOne.mockResolvedValue(mockUser);
      statusHistoryRepository.create.mockReturnValue(mockStatusHistory);
      statusHistoryRepository.save.mockResolvedValue(mockStatusHistory);
      inquiryRepository.save.mockResolvedValue(updatedInquiry);

      // Act
      const result = await service.updateInquiryStatus(
        'test-inquiry-id',
        InquiryStatus.IN_PROGRESS,
        'test-user-id',
        'テストコメント'
      );

      // Assert
      expect(result.status).toBe(InquiryStatus.IN_PROGRESS);
      expect(inquiryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-inquiry-id' },
        relations: ['application', 'assignedUser'],
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-user-id' }
      });
      expect(statusHistoryRepository.create).toHaveBeenCalledWith({
        inquiryId: 'test-inquiry-id',
        oldStatus: InquiryStatus.NEW,
        newStatus: InquiryStatus.IN_PROGRESS,
        changedBy: 'test-user-id',
        comment: 'テストコメント',
      });
      expect(inquiryRepository.save).toHaveBeenCalled();
    });

    it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateInquiryStatus(
        'non-existent-id',
        InquiryStatus.IN_PROGRESS,
        'test-user-id'
      )).rejects.toThrow(NotFoundException);
    });

    it('存在しないユーザーIDの場合はエラーを投げること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateInquiryStatus(
        'test-inquiry-id',
        InquiryStatus.IN_PROGRESS,
        'non-existent-user-id'
      )).rejects.toThrow(BadRequestException);
    });

    it('無効な状態遷移の場合はエラーを投げること', async () => {
      // Arrange
      const closedInquiry = { ...mockInquiry, status: InquiryStatus.CLOSED };
      inquiryRepository.findOne.mockResolvedValue(closedInquiry);
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.updateInquiryStatus(
        'test-inquiry-id',
        InquiryStatus.NEW,
        'test-user-id'
      )).rejects.toThrow(BadRequestException);
    });

    it('同じ状態への遷移の場合はエラーを投げること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.updateInquiryStatus(
        'test-inquiry-id',
        InquiryStatus.NEW,
        'test-user-id'
      )).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInquiryStatusHistory', () => {
    it('正常に状態履歴を取得できること', async () => {
      // Arrange
      const mockHistory = [mockStatusHistory];
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      statusHistoryRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getInquiryStatusHistory('test-inquiry-id');

      // Assert
      expect(result).toEqual(mockHistory);
      expect(inquiryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-inquiry-id' }
      });
      expect(statusHistoryRepository.find).toHaveBeenCalledWith({
        where: { inquiryId: 'test-inquiry-id' },
        relations: ['changedByUser'],
        order: { changedAt: 'DESC' },
      });
    });

    it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getInquiryStatusHistory('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailableStatusTransitions', () => {
    it('NEW状態から利用可能な遷移を取得できること', async () => {
      // Act
      const result = service.getAvailableStatusTransitions(InquiryStatus.NEW);

      // Assert
      expect(result).toEqual([InquiryStatus.IN_PROGRESS, InquiryStatus.CLOSED]);
    });

    it('IN_PROGRESS状態から利用可能な遷移を取得できること', async () => {
      // Act
      const result = service.getAvailableStatusTransitions(InquiryStatus.IN_PROGRESS);

      // Assert
      expect(result).toEqual([InquiryStatus.PENDING, InquiryStatus.RESOLVED, InquiryStatus.CLOSED]);
    });

    it('CLOSED状態から利用可能な遷移がないことを確認できること', async () => {
      // Act
      const result = service.getAvailableStatusTransitions(InquiryStatus.CLOSED);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getInquiryStatusStats', () => {
    it('正常に状態別統計を取得できること', async () => {
      // Arrange
      inquiryRepository.count
        .mockResolvedValueOnce(5) // NEW
        .mockResolvedValueOnce(3) // IN_PROGRESS
        .mockResolvedValueOnce(2) // PENDING
        .mockResolvedValueOnce(4) // RESOLVED
        .mockResolvedValueOnce(1); // CLOSED

      // Act
      const result = await service.getInquiryStatusStats();

      // Assert
      expect(result).toEqual({
        [InquiryStatus.NEW]: 5,
        [InquiryStatus.IN_PROGRESS]: 3,
        [InquiryStatus.PENDING]: 2,
        [InquiryStatus.RESOLVED]: 4,
        [InquiryStatus.CLOSED]: 1,
      });
      expect(inquiryRepository.count).toHaveBeenCalledTimes(5);
    });

    it('アプリIDを指定して統計を取得できること', async () => {
      // Arrange
      inquiryRepository.count
        .mockResolvedValueOnce(2) // NEW
        .mockResolvedValueOnce(1) // IN_PROGRESS
        .mockResolvedValueOnce(0) // PENDING
        .mockResolvedValueOnce(1) // RESOLVED
        .mockResolvedValueOnce(0); // CLOSED

      // Act
      const result = await service.getInquiryStatusStats('test-app-id');

      // Assert
      expect(result).toEqual({
        [InquiryStatus.NEW]: 2,
        [InquiryStatus.IN_PROGRESS]: 1,
        [InquiryStatus.PENDING]: 0,
        [InquiryStatus.RESOLVED]: 1,
        [InquiryStatus.CLOSED]: 0,
      });
      expect(inquiryRepository.count).toHaveBeenCalledWith({
        where: { appId: 'test-app-id', status: expect.any(String) }
      });
    });
  });

  describe('getStaleInquiries', () => {
    it('正常に放置問い合わせを取得できること', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockInquiry]),
      };
      inquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getStaleInquiries(7);

      // Assert
      expect(result).toEqual([mockInquiry]);
      expect(inquiryRepository.createQueryBuilder).toHaveBeenCalledWith('inquiry');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('inquiry.status IN (:...statuses)', {
        statuses: [InquiryStatus.NEW, InquiryStatus.IN_PROGRESS, InquiryStatus.PENDING]
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inquiry.updatedAt < :thresholdDate', {
        thresholdDate: expect.any(Date)
      });
    });
  });

  describe('executeAutoStatusTransitions', () => {
    it('正常に自動状態遷移を実行できること', async () => {
      // Arrange
      const resolvedInquiry = { ...mockInquiry, status: InquiryStatus.RESOLVED };
      const oldStatusHistory = {
        ...mockStatusHistory,
        newStatus: InquiryStatus.RESOLVED,
        changedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4日前
      };

      inquiryRepository.find.mockResolvedValue([resolvedInquiry]);
      statusHistoryRepository.findOne.mockResolvedValue(oldStatusHistory);
      
      // updateInquiryStatusメソッドをスパイ
      const updateStatusSpy = jest.spyOn(service, 'updateInquiryStatus').mockResolvedValue(resolvedInquiry);

      // Act
      await service.executeAutoStatusTransitions();

      // Assert
      expect(inquiryRepository.find).toHaveBeenCalledWith({
        where: { status: InquiryStatus.RESOLVED }
      });
      expect(statusHistoryRepository.findOne).toHaveBeenCalledWith({
        where: { inquiryId: resolvedInquiry.id, newStatus: InquiryStatus.RESOLVED },
        order: { changedAt: 'DESC' }
      });
      expect(updateStatusSpy).toHaveBeenCalledWith(
        resolvedInquiry.id,
        InquiryStatus.CLOSED,
        'system',
        '自動クローズ: 解決済みから3日経過'
      );
    });
  });
});