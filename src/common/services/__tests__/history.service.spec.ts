/**
 * 履歴管理サービスのテスト
 * 要件: 2.2, 2.4, 4.3 (履歴データの取得・表示機能のテスト)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HistoryService } from '../history.service';
import { UserHistory } from '../../../modules/users/entities/user-history.entity';
import { InquiryStatusHistory } from '../../entities/inquiry-status-history.entity';
import { ResponseHistory } from '../../entities/response-history.entity';

describe('HistoryService', () => {
  let service: HistoryService;
  let mockUserHistoryRepo: Partial<Repository<UserHistory>>;
  let mockInquiryStatusHistoryRepo: Partial<Repository<InquiryStatusHistory>>;
  let mockResponseHistoryRepo: Partial<Repository<ResponseHistory>>;
  let mockDataSource: Partial<DataSource>;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    mockUserHistoryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockInquiryStatusHistoryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockResponseHistoryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockDataSource = {
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        {
          provide: getRepositoryToken(UserHistory),
          useValue: mockUserHistoryRepo,
        },
        {
          provide: getRepositoryToken(InquiryStatusHistory),
          useValue: mockInquiryStatusHistoryRepo,
        },
        {
          provide: getRepositoryToken(ResponseHistory),
          useValue: mockResponseHistoryRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  describe('setCurrentUserId', () => {
    it('現在のユーザーIDを設定できる', async () => {
      const userId = 'test-user-id';
      
      await service.setCurrentUserId(userId);

      expect(mockDataSource.query).toHaveBeenCalledWith(
        'SET app.current_user_id = $1',
        [userId]
      );
    });
  });

  describe('getUserHistory', () => {
    it('ユーザー履歴を取得できる', async () => {
      const userId = 'test-user-id';
      const mockHistory = [
        { id: '1', userId, fieldName: 'name', oldValue: 'Old', newValue: 'New' }
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockHistory, 1]),
      };

      mockUserHistoryRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getUserHistory(userId);

      expect(result.items).toEqual(mockHistory);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('uh.userId = :userId', { userId });
    });
  });

  describe('getHistoryStatistics', () => {
    it('履歴統計を取得できる', async () => {
      mockDataSource.query = jest.fn()
        .mockResolvedValueOnce([{ count: '5' }])  // user changes
        .mockResolvedValueOnce([{ count: '3' }])  // inquiry changes
        .mockResolvedValueOnce([{ count: '2' }])  // response changes
        .mockResolvedValueOnce([]);               // top entities

      const result = await service.getHistoryStatistics();

      expect(result.userChanges).toBe(5);
      expect(result.inquiryStatusChanges).toBe(3);
      expect(result.responseChanges).toBe(2);
      expect(result.totalChanges).toBe(10);
    });
  });
});