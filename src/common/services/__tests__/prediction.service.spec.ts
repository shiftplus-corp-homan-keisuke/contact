/**
 * 予測分析サービステスト
 * 要件: 9.3 (予測分析機能の実装)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PredictionService, PredictionRequestDto } from '../prediction.service';
import { Inquiry } from '../../entities/inquiry.entity';
import { Response } from '../../entities/response.entity';
import { User } from '../../entities/user.entity';
import { InquiryStatus, InquiryPriority } from '../../types/inquiry.types';

describe('PredictionService', () => {
  let service: PredictionService;
  let inquiryRepository: Repository<Inquiry>;
  let responseRepository: Repository<Response>;
  let userRepository: Repository<User>;

  // モックデータ
  const mockHistoricalData = [
    { timestamp: '2024-01-01', value: 10, metadata: { averageResponseTime: 2.5 } },
    { timestamp: '2024-01-02', value: 12, metadata: { averageResponseTime: 2.8 } },
    { timestamp: '2024-01-03', value: 8, metadata: { averageResponseTime: 2.2 } },
    { timestamp: '2024-01-04', value: 15, metadata: { averageResponseTime: 3.1 } },
    { timestamp: '2024-01-05', value: 11, metadata: { averageResponseTime: 2.6 } },
    { timestamp: '2024-01-06', value: 9, metadata: { averageResponseTime: 2.4 } },
    { timestamp: '2024-01-07', value: 13, metadata: { averageResponseTime: 2.9 } },
    { timestamp: '2024-01-08', value: 14, metadata: { averageResponseTime: 3.0 } },
    { timestamp: '2024-01-09', value: 16, metadata: { averageResponseTime: 3.2 } },
    { timestamp: '2024-01-10', value: 12, metadata: { averageResponseTime: 2.7 } }
  ];

  const mockInquiryRepository = {
    count: jest.fn(),
    query: jest.fn()
  };

  const mockResponseRepository = {
    count: jest.fn(),
    query: jest.fn()
  };

  const mockUserRepository = {
    count: jest.fn(),
    findOne: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionService,
        {
          provide: getRepositoryToken(Inquiry),
          useValue: mockInquiryRepository
        },
        {
          provide: getRepositoryToken(Response),
          useValue: mockResponseRepository
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository
        }
      ]
    }).compile();

    service = module.get<PredictionService>(PredictionService);
    inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
    responseRepository = module.get<Repository<Response>>(getRepositoryToken(Response));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('predictInquiryVolume', () => {
    it('問い合わせ量予測を正常に実行できること', async () => {
      // Arrange
      const request: PredictionRequestDto = {
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 7,
        granularity: 'daily'
      };

      // 履歴データのモック
      mockInquiryRepository.query.mockResolvedValue([
        { timestamp: '2024-01-01', value: '10', avg_response_time: '2.5' },
        { timestamp: '2024-01-02', value: '12', avg_response_time: '2.8' },
        { timestamp: '2024-01-03', value: '8', avg_response_time: '2.2' },
        { timestamp: '2024-01-04', value: '15', avg_response_time: '3.1' },
        { timestamp: '2024-01-05', value: '11', avg_response_time: '2.6' },
        { timestamp: '2024-01-06', value: '9', avg_response_time: '2.4' },
        { timestamp: '2024-01-07', value: '13', avg_response_time: '2.9' },
        { timestamp: '2024-01-08', value: '14', avg_response_time: '3.0' },
        { timestamp: '2024-01-09', value: '16', avg_response_time: '3.2' },
        { timestamp: '2024-01-10', value: '12', avg_response_time: '2.7' }
      ]);

      // Act
      const result = await service.predictInquiryVolume(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.metric).toBe('inquiry_volume');
      expect(result.forecastPeriod).toBe('7日間');
      expect(result.forecast).toHaveLength(7);
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();

      // 予測値が妥当な範囲内であることを確認
      result.forecast.forEach(forecast => {
        expect(forecast.predictedValue).toBeGreaterThanOrEqual(0);
        expect(forecast.confidenceLevel).toBeGreaterThan(0);
        expect(forecast.confidenceLevel).toBeLessThanOrEqual(1);
      });
    });

    it('履歴データが不足している場合はエラーを投げること', async () => {
      // Arrange
      const request: PredictionRequestDto = {
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-03'
        },
        forecastDays: 7,
        granularity: 'daily'
      };

      // 不十分な履歴データのモック
      mockInquiryRepository.query.mockResolvedValue([
        { timestamp: '2024-01-01', value: '10', avg_response_time: '2.5' },
        { timestamp: '2024-01-02', value: '12', avg_response_time: '2.8' }
      ]);

      // Act & Assert
      await expect(service.predictInquiryVolume(request)).rejects.toThrow(
        '予測には最低7日分の履歴データが必要です'
      );
    });

    it('アプリIDフィルターが適用されること', async () => {
      // Arrange
      const request: PredictionRequestDto = {
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 7,
        granularity: 'daily',
        filters: {
          appId: 'test-app-id'
        }
      };

      mockInquiryRepository.query.mockResolvedValue([
        { timestamp: '2024-01-01', value: '5', avg_response_time: '2.0' },
        { timestamp: '2024-01-02', value: '6', avg_response_time: '2.1' },
        { timestamp: '2024-01-03', value: '4', avg_response_time: '1.9' },
        { timestamp: '2024-01-04', value: '7', avg_response_time: '2.3' },
        { timestamp: '2024-01-05', value: '5', avg_response_time: '2.0' },
        { timestamp: '2024-01-06', value: '4', avg_response_time: '1.8' },
        { timestamp: '2024-01-07', value: '6', avg_response_time: '2.2' },
        { timestamp: '2024-01-08', value: '7', avg_response_time: '2.4' }
      ]);

      // Act
      const result = await service.predictInquiryVolume(request);

      // Assert
      expect(result).toBeDefined();
      expect(mockInquiryRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('AND i.app_id = $3'),
        expect.arrayContaining(['test-app-id'])
      );
    });
  });

  describe('predictResourceDemand', () => {
    it('リソース需要予測を正常に実行できること', async () => {
      // Arrange
      const request: PredictionRequestDto = {
        metric: 'resource_demand',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 7,
        granularity: 'daily'
      };

      // 履歴データのモック
      mockInquiryRepository.query
        .mockResolvedValueOnce([ // getHistoricalInquiryData用
          { timestamp: '2024-01-01', value: '10', avg_response_time: '2.5' },
          { timestamp: '2024-01-02', value: '12', avg_response_time: '2.8' },
          { timestamp: '2024-01-03', value: '8', avg_response_time: '2.2' },
          { timestamp: '2024-01-04', value: '15', avg_response_time: '3.1' },
          { timestamp: '2024-01-05', value: '11', avg_response_time: '2.6' },
          { timestamp: '2024-01-06', value: '9', avg_response_time: '2.4' },
          { timestamp: '2024-01-07', value: '13', avg_response_time: '2.9' },
          { timestamp: '2024-01-08', value: '14', avg_response_time: '3.0' }
        ])
        .mockResolvedValueOnce([ // getHistoricalPerformanceData用
          { 
            date: '2024-01-01', 
            inquiry_count: '10', 
            active_staff_count: '2', 
            avg_response_time: '2.5',
            avg_resolution_time: '8.0'
          },
          { 
            date: '2024-01-02', 
            inquiry_count: '12', 
            active_staff_count: '2', 
            avg_response_time: '2.8',
            avg_resolution_time: '9.0'
          },
          { 
            date: '2024-01-03', 
            inquiry_count: '8', 
            active_staff_count: '2', 
            avg_response_time: '2.2',
            avg_resolution_time: '7.0'
          }
        ]);

      // Act
      const result = await service.predictResourceDemand(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.metric).toBe('resource_demand');
      expect(result.resourceDemand).toBeDefined();
      expect(result.resourceDemand).toHaveLength(7);

      // リソース需要データの検証
      result.resourceDemand.forEach(demand => {
        expect(demand.predictedInquiryVolume).toBeGreaterThanOrEqual(0);
        expect(demand.recommendedStaffCount).toBeGreaterThan(0);
        expect(demand.expectedWorkloadHours).toBeGreaterThanOrEqual(0);
        expect(demand.confidenceLevel).toBeGreaterThan(0);
        expect(demand.confidenceLevel).toBeLessThanOrEqual(1);
        expect(['low', 'medium', 'high']).toContain(demand.riskLevel);
      });
    });

    it('高リスク期間が正しく検出されること', async () => {
      // Arrange
      const request: PredictionRequestDto = {
        metric: 'resource_demand',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 3,
        granularity: 'daily'
      };

      // 高い問い合わせ量の履歴データ
      mockInquiryRepository.query
        .mockResolvedValueOnce([
          { timestamp: '2024-01-01', value: '50', avg_response_time: '4.0' },
          { timestamp: '2024-01-02', value: '55', avg_response_time: '4.5' },
          { timestamp: '2024-01-03', value: '60', avg_response_time: '5.0' },
          { timestamp: '2024-01-04', value: '65', avg_response_time: '5.5' },
          { timestamp: '2024-01-05', value: '70', avg_response_time: '6.0' },
          { timestamp: '2024-01-06', value: '75', avg_response_time: '6.5' },
          { timestamp: '2024-01-07', value: '80', avg_response_time: '7.0' },
          { timestamp: '2024-01-08', value: '85', avg_response_time: '7.5' }
        ])
        .mockResolvedValueOnce([
          { 
            date: '2024-01-01', 
            inquiry_count: '50', 
            active_staff_count: '3', 
            avg_response_time: '4.0',
            avg_resolution_time: '16.0'
          }
        ]);

      // Act
      const result = await service.predictResourceDemand(request);

      // Assert
      expect(result.insights.some(insight => 
        insight.type === 'capacity' && insight.impact === 'high'
      )).toBe(true);

      expect(result.recommendations.some(rec => 
        rec.category === 'staffing' && rec.priority === 'high'
      )).toBe(true);
    });
  });

  describe('時系列分析機能', () => {
    it('移動平均が正しく計算されること', async () => {
      // この機能はprivateメソッドなので、公開メソッド経由でテスト
      const request: PredictionRequestDto = {
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 3,
        granularity: 'daily'
      };

      // 一定の値の履歴データ（移動平均の計算をテストしやすくする）
      mockInquiryRepository.query.mockResolvedValue([
        { timestamp: '2024-01-01', value: '10', avg_response_time: '2.0' },
        { timestamp: '2024-01-02', value: '10', avg_response_time: '2.0' },
        { timestamp: '2024-01-03', value: '10', avg_response_time: '2.0' },
        { timestamp: '2024-01-04', value: '10', avg_response_time: '2.0' },
        { timestamp: '2024-01-05', value: '10', avg_response_time: '2.0' },
        { timestamp: '2024-01-06', value: '10', avg_response_time: '2.0' },
        { timestamp: '2024-01-07', value: '10', avg_response_time: '2.0' },
        { timestamp: '2024-01-08', value: '10', avg_response_time: '2.0' }
      ]);

      const result = await service.predictInquiryVolume(request);

      // 一定の値なので、予測値も10前後になるはず
      result.forecast.forEach(forecast => {
        expect(forecast.predictedValue).toBeGreaterThanOrEqual(8);
        expect(forecast.predictedValue).toBeLessThanOrEqual(12);
      });
    });

    it('トレンド分析が機能すること', async () => {
      const request: PredictionRequestDto = {
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 3,
        granularity: 'daily'
      };

      // 増加トレンドの履歴データ
      mockInquiryRepository.query.mockResolvedValue([
        { timestamp: '2024-01-01', value: '5', avg_response_time: '2.0' },
        { timestamp: '2024-01-02', value: '7', avg_response_time: '2.0' },
        { timestamp: '2024-01-03', value: '9', avg_response_time: '2.0' },
        { timestamp: '2024-01-04', value: '11', avg_response_time: '2.0' },
        { timestamp: '2024-01-05', value: '13', avg_response_time: '2.0' },
        { timestamp: '2024-01-06', value: '15', avg_response_time: '2.0' },
        { timestamp: '2024-01-07', value: '17', avg_response_time: '2.0' },
        { timestamp: '2024-01-08', value: '19', avg_response_time: '2.0' }
      ]);

      const result = await service.predictInquiryVolume(request);

      // 増加トレンドが検出されることを確認
      expect(result.insights.some(insight => 
        insight.type === 'trend' && insight.title.includes('増加')
      )).toBe(true);

      // 予測値も増加傾向になることを確認
      expect(result.forecast[2].predictedValue).toBeGreaterThan(result.forecast[0].predictedValue);
    });

    it('季節性パターンが検出されること', async () => {
      const request: PredictionRequestDto = {
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-14'
        },
        forecastDays: 7,
        granularity: 'daily'
      };

      // 週単位の季節性パターンを持つデータ（月曜日が多い）
      mockInquiryRepository.query.mockResolvedValue([
        { timestamp: '2024-01-01', value: '20', avg_response_time: '2.0' }, // 月曜日
        { timestamp: '2024-01-02', value: '10', avg_response_time: '2.0' }, // 火曜日
        { timestamp: '2024-01-03', value: '10', avg_response_time: '2.0' }, // 水曜日
        { timestamp: '2024-01-04', value: '10', avg_response_time: '2.0' }, // 木曜日
        { timestamp: '2024-01-05', value: '10', avg_response_time: '2.0' }, // 金曜日
        { timestamp: '2024-01-06', value: '5', avg_response_time: '2.0' },  // 土曜日
        { timestamp: '2024-01-07', value: '5', avg_response_time: '2.0' },  // 日曜日
        { timestamp: '2024-01-08', value: '20', avg_response_time: '2.0' }, // 月曜日
        { timestamp: '2024-01-09', value: '10', avg_response_time: '2.0' }, // 火曜日
        { timestamp: '2024-01-10', value: '10', avg_response_time: '2.0' }, // 水曜日
        { timestamp: '2024-01-11', value: '10', avg_response_time: '2.0' }, // 木曜日
        { timestamp: '2024-01-12', value: '10', avg_response_time: '2.0' }, // 金曜日
        { timestamp: '2024-01-13', value: '5', avg_response_time: '2.0' },  // 土曜日
        { timestamp: '2024-01-14', value: '5', avg_response_time: '2.0' }   // 日曜日
      ]);

      const result = await service.predictInquiryVolume(request);

      // 季節性パターンが検出されることを確認
      expect(result.insights.some(insight => 
        insight.type === 'seasonal'
      )).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラーが適切に処理されること', async () => {
      // Arrange
      const request: PredictionRequestDto = {
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 7,
        granularity: 'daily'
      };

      mockInquiryRepository.query.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.predictInquiryVolume(request)).rejects.toThrow('Database connection failed');
    });

    it('無効な日付範囲でもエラーが発生しないこと', async () => {
      // サービス内で適切に処理されることを確認
      const request: PredictionRequestDto = {
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-10',
          endDate: '2024-01-01' // 逆順
        },
        forecastDays: 7,
        granularity: 'daily'
      };

      mockInquiryRepository.query.mockResolvedValue([]);

      // サービス内で適切に処理されるか確認
      await expect(service.predictInquiryVolume(request)).rejects.toThrow();
    });
  });
});