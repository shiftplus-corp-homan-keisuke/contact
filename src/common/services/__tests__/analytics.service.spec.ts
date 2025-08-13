/**
 * 分析サービステスト
 * 要件: 9.1 (基本統計ダッシュボードの実装)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from '../../../modules/analytics/services/analytics.service';
import { Inquiry } from '../../entities/inquiry.entity';
import { Response } from '../../entities/response.entity';
import { Application } from '../../entities/application.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { AnalyticsFiltersDto } from '../../dto/analytics.dto';
import { InquiryStatus, InquiryPriority } from '../../types/inquiry.types';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let inquiryRepository: jest.Mocked<Repository<Inquiry>>;
  let responseRepository: jest.Mocked<Repository<Response>>;
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockInquiryRepository = {
    count: jest.fn(),
    query: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockResponseRepository = {
    count: jest.fn(),
    query: jest.fn(),
    find: jest.fn(),
  };

  const mockApplicationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    count: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Inquiry),
          useValue: mockInquiryRepository,
        },
        {
          provide: getRepositoryToken(Response),
          useValue: mockResponseRepository,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    inquiryRepository = module.get(getRepositoryToken(Inquiry));
    responseRepository = module.get(getRepositoryToken(Response));
    applicationRepository = module.get(getRepositoryToken(Application));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInquiryStatistics', () => {
    it('基本統計情報を正しく取得できること', async () => {
      // Arrange
      const filters: AnalyticsFiltersDto = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      };

      // 基本カウントのモック
      inquiryRepository.count
        .mockResolvedValueOnce(100) // totalInquiries
        .mockResolvedValueOnce(20)  // newInquiries
        .mockResolvedValueOnce(30)  // inProgressInquiries
        .mockResolvedValueOnce(40)  // resolvedInquiries
        .mockResolvedValueOnce(10); // closedInquiries

      // 対応時間統計のモック
      inquiryRepository.query
        .mockResolvedValueOnce([{ avg_response_time: '2.5', avg_resolution_time: '24.0' }]) // responseTimeStats
        .mockResolvedValueOnce([
          { category: 'バグ報告', count: '50', avg_response_time: '2.0' },
          { category: '機能要望', count: '30', avg_response_time: '3.0' }
        ]) // categoryBreakdown
        .mockResolvedValueOnce([
          { app_id: 'app1', app_name: 'アプリ1', count: '60', avg_response_time: '2.2', new_count: '10', resolved_count: '25' },
          { app_id: 'app2', app_name: 'アプリ2', count: '40', avg_response_time: '2.8', new_count: '10', resolved_count: '15' }
        ]) // appBreakdown
        .mockResolvedValueOnce([
          { priority: 'high', count: '10', avg_response_time: '1.0' },
          { priority: 'medium', count: '70', avg_response_time: '2.5' },
          { priority: 'low', count: '20', avg_response_time: '4.0' }
        ]) // priorityBreakdown
        .mockResolvedValueOnce([
          { status: 'new', count: '20' },
          { status: 'in_progress', count: '30' },
          { status: 'resolved', count: '40' },
          { status: 'closed', count: '10' }
        ]) // statusBreakdown
        .mockResolvedValueOnce([
          { date: '2024-01-01', total_inquiries: '5', new_inquiries: '5', resolved_inquiries: '0', avg_response_time: '0' },
          { date: '2024-01-02', total_inquiries: '8', new_inquiries: '3', resolved_inquiries: '2', avg_response_time: '2.5' }
        ]); // dailyTrend

      // Act
      const result = await service.getInquiryStatistics(filters);

      // Assert
      expect(result).toEqual({
        totalInquiries: 100,
        newInquiries: 20,
        inProgressInquiries: 30,
        resolvedInquiries: 40,
        closedInquiries: 10,
        averageResponseTimeHours: 2.5,
        averageResolutionTimeHours: 24.0,
        categoryBreakdown: [
          { category: 'バグ報告', count: 50, percentage: 50, averageResponseTimeHours: 2.0 },
          { category: '機能要望', count: 30, percentage: 30, averageResponseTimeHours: 3.0 }
        ],
        appBreakdown: [
          { 
            appId: 'app1', 
            appName: 'アプリ1', 
            count: 60, 
            percentage: 60, 
            averageResponseTimeHours: 2.2,
            newCount: 10,
            resolvedCount: 25
          },
          { 
            appId: 'app2', 
            appName: 'アプリ2', 
            count: 40, 
            percentage: 40, 
            averageResponseTimeHours: 2.8,
            newCount: 10,
            resolvedCount: 15
          }
        ],
        priorityBreakdown: [
          { priority: InquiryPriority.HIGH, count: 10, percentage: 10, averageResponseTimeHours: 1.0 },
          { priority: InquiryPriority.MEDIUM, count: 70, percentage: 70, averageResponseTimeHours: 2.5 },
          { priority: InquiryPriority.LOW, count: 20, percentage: 20, averageResponseTimeHours: 4.0 }
        ],
        statusBreakdown: [
          { status: InquiryStatus.NEW, count: 20, percentage: 20 },
          { status: InquiryStatus.IN_PROGRESS, count: 30, percentage: 30 },
          { status: InquiryStatus.RESOLVED, count: 40, percentage: 40 },
          { status: InquiryStatus.CLOSED, count: 10, percentage: 10 }
        ],
        dailyTrend: [
          { date: '2024-01-01', totalInquiries: 5, newInquiries: 5, resolvedInquiries: 0, averageResponseTimeHours: 0 },
          { date: '2024-01-02', totalInquiries: 8, newInquiries: 3, resolvedInquiries: 2, averageResponseTimeHours: 2.5 }
        ]
      });

      expect(inquiryRepository.count).toHaveBeenCalledTimes(5);
      expect(inquiryRepository.query).toHaveBeenCalledTimes(6);
    });

    it('アプリIDフィルターが正しく適用されること', async () => {
      // Arrange
      const filters: AnalyticsFiltersDto = {
        appId: 'test-app-id',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      };

      inquiryRepository.count.mockResolvedValue(50);
      inquiryRepository.query.mockResolvedValue([{ avg_response_time: '2.0', avg_resolution_time: '20.0' }]);

      // Act
      await service.getInquiryStatistics(filters);

      // Assert
      expect(inquiryRepository.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          appId: 'test-app-id'
        })
      });
    });
  });

  describe('getResponseTimeAnalytics', () => {
    it('対応時間分析を正しく取得できること', async () => {
      // Arrange
      const filters: AnalyticsFiltersDto = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      };

      inquiryRepository.query
        .mockResolvedValueOnce([{
          avg_first_response: '2.5',
          avg_resolution: '24.0',
          median_first_response: '2.0',
          median_resolution: '20.0',
          sla_compliance: '85.5'
        }]) // detailedStats
        .mockResolvedValueOnce([
          { time_range: '0-1', count: '20', percentage: '20.0' },
          { time_range: '1-4', count: '50', percentage: '50.0' },
          { time_range: '4-24', count: '25', percentage: '25.0' },
          { time_range: '24+', count: '5', percentage: '5.0' }
        ]) // responseTimeDistribution
        .mockResolvedValueOnce([
          { category: 'バグ報告', avg_response_time: '2.0', avg_resolution_time: '20.0', count: '50' }
        ]) // responseTimeByCategory
        .mockResolvedValueOnce([
          { 
            priority: 'high', 
            avg_response_time: '1.0', 
            avg_resolution_time: '8.0', 
            count: '10',
            sla_target_hours: '4',
            compliance_rate: '90.0'
          }
        ]); // responseTimeByPriority

      // Act
      const result = await service.getResponseTimeAnalytics(filters);

      // Assert
      expect(result).toEqual({
        averageFirstResponseTimeHours: 2.5,
        averageResolutionTimeHours: 24.0,
        medianFirstResponseTimeHours: 2.0,
        medianResolutionTimeHours: 20.0,
        responseTimeDistribution: [
          { timeRangeHours: '0-1', count: 20, percentage: 20.0 },
          { timeRangeHours: '1-4', count: 50, percentage: 50.0 },
          { timeRangeHours: '4-24', count: 25, percentage: 25.0 },
          { timeRangeHours: '24+', count: 5, percentage: 5.0 }
        ],
        slaComplianceRate: 85.5,
        responseTimeByCategory: [
          { category: 'バグ報告', averageResponseTimeHours: 2.0, averageResolutionTimeHours: 20.0, count: 50 }
        ],
        responseTimeByPriority: [
          { 
            priority: InquiryPriority.HIGH, 
            averageResponseTimeHours: 1.0, 
            averageResolutionTimeHours: 8.0, 
            count: 10,
            slaTargetHours: 4,
            complianceRate: 90.0
          }
        ]
      });

      expect(inquiryRepository.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('getRealtimeStats', () => {
    it('リアルタイム統計を正しく取得できること', async () => {
      // Arrange
      inquiryRepository.count
        .mockResolvedValueOnce(1000) // totalInquiries
        .mockResolvedValueOnce(50)   // newInquiriesLast24h
        .mockResolvedValueOnce(45)   // resolvedInquiriesLast24h
        .mockResolvedValueOnce(120); // pendingInquiries

      userRepository.count.mockResolvedValueOnce(25); // activeUsers

      inquiryRepository.query.mockResolvedValueOnce([{ avg_response_time: '2.8' }]); // averageResponseTimeLast24h

      // Act
      const result = await service.getRealtimeStats();

      // Assert
      expect(result).toEqual({
        timestamp: expect.any(Date),
        totalInquiries: 1000,
        newInquiriesLast24h: 50,
        resolvedInquiriesLast24h: 45,
        averageResponseTimeLast24h: 2.8,
        activeUsers: 25,
        pendingInquiries: 120
      });

      expect(inquiryRepository.count).toHaveBeenCalledTimes(4);
      expect(userRepository.count).toHaveBeenCalledTimes(1);
      expect(inquiryRepository.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラー時に適切にエラーをスローすること', async () => {
      // Arrange
      const filters: AnalyticsFiltersDto = {};
      inquiryRepository.count.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.getInquiryStatistics(filters)).rejects.toThrow('Database connection failed');
    });

    it('無効な日付範囲でもエラーにならないこと', async () => {
      // Arrange
      const filters: AnalyticsFiltersDto = {
        startDate: '2024-12-31T23:59:59Z',
        endDate: '2024-01-01T00:00:00Z' // 開始日が終了日より後
      };

      inquiryRepository.count.mockResolvedValue(0);
      inquiryRepository.query.mockResolvedValue([]);

      // Act
      const result = await service.getInquiryStatistics(filters);

      // Assert
      expect(result).toBeDefined();
      expect(result.totalInquiries).toBe(0);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量データでも適切な時間内で処理が完了すること', async () => {
      // Arrange
      const filters: AnalyticsFiltersDto = {};
      const startTime = Date.now();

      inquiryRepository.count.mockResolvedValue(100000);
      inquiryRepository.query.mockResolvedValue([]);

      // Act
      await service.getInquiryStatistics(filters);

      // Assert
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // 5秒以内
    });
  });
});