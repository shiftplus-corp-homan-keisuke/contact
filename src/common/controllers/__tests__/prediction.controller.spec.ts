/**
 * 予測分析コントローラーテスト
 * 要件: 9.3 (予測分析機能の実装)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PredictionController, CreatePredictionRequestDto } from '../prediction.controller';
import { PredictionService, PredictionAnalysisDto } from '../../../modules/analytics/services/prediction.service';

describe('PredictionController', () => {
  let controller: PredictionController;
  let predictionService: PredictionService;

  const mockPredictionService = {
    predictInquiryVolume: jest.fn(),
    predictResourceDemand: jest.fn()
  };

  const mockPredictionResult: PredictionAnalysisDto = {
    metric: 'inquiry_volume',
    forecastPeriod: '7日間',
    accuracy: 0.85,
    forecast: [
      { timestamp: '2024-01-11', predictedValue: 12, confidenceLevel: 0.9 },
      { timestamp: '2024-01-12', predictedValue: 14, confidenceLevel: 0.88 },
      { timestamp: '2024-01-13', predictedValue: 11, confidenceLevel: 0.86 }
    ],
    insights: [
      {
        type: 'trend',
        title: '問い合わせ量増加トレンド',
        description: '直近2週間で増加傾向が見られます',
        impact: 'medium',
        confidence: 0.8
      }
    ],
    recommendations: [
      {
        category: 'staffing',
        title: 'スタッフ増員の検討',
        description: '予測される問い合わせ量増加に対応するため、一時的なスタッフ増員を検討してください',
        priority: 'medium',
        estimatedImpact: '対応時間30%短縮',
        timeframe: '1週間以内'
      }
    ]
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictionController],
      providers: [
        {
          provide: PredictionService,
          useValue: mockPredictionService
        }
      ]
    }).compile();

    controller = module.get<PredictionController>(PredictionController);
    predictionService = module.get<PredictionService>(PredictionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('predictInquiryVolume', () => {
    it('問い合わせ量予測が正常に実行されること', async () => {
      // Arrange
      const request: CreatePredictionRequestDto = {
        metric: 'inquiry_volume',
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        forecastDays: 7,
        granularity: 'daily'
      };

      mockPredictionService.predictInquiryVolume.mockResolvedValue(mockPredictionResult);

      // Act
      const result = await controller.predictInquiryVolume(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPredictionResult);
      expect(result.message).toBe('問い合わせ量予測が完了しました');
      expect(mockPredictionService.predictInquiryVolume).toHaveBeenCalledWith({
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 7,
        granularity: 'daily',
        filters: {
          appId: undefined,
          appIds: undefined,
          categories: undefined
        }
      });
    });

    it('フィルター付きリクエストが正常に処理されること', async () => {
      // Arrange
      const request: CreatePredictionRequestDto = {
        metric: 'inquiry_volume',
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        forecastDays: 7,
        granularity: 'daily',
        appId: 'test-app-id',
        categories: ['技術的問題', 'アカウント問題']
      };

      mockPredictionService.predictInquiryVolume.mockResolvedValue(mockPredictionResult);

      // Act
      const result = await controller.predictInquiryVolume(request);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPredictionService.predictInquiryVolume).toHaveBeenCalledWith({
        metric: 'inquiry_volume',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 7,
        granularity: 'daily',
        filters: {
          appId: 'test-app-id',
          appIds: undefined,
          categories: ['技術的問題', 'アカウント問題']
        }
      });
    });

    it('無効なリクエストでBadRequestExceptionが投げられること', async () => {
      // Arrange
      const invalidRequest: CreatePredictionRequestDto = {
        metric: 'inquiry_volume',
        startDate: '2024-01-10', // 終了日より後
        endDate: '2024-01-01',
        forecastDays: 7,
        granularity: 'daily'
      };

      // Act & Assert
      await expect(controller.predictInquiryVolume(invalidRequest)).rejects.toThrow(BadRequestException);
    });

    it('予測日数が範囲外の場合エラーが投げられること', async () => {
      // Arrange
      const invalidRequest: CreatePredictionRequestDto = {
        metric: 'inquiry_volume',
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        forecastDays: 100, // 90日を超える
        granularity: 'daily'
      };

      // Act & Assert
      await expect(controller.predictInquiryVolume(invalidRequest)).rejects.toThrow(
        BadRequestException
      );
    });

    it('履歴期間が短すぎる場合エラーが投げられること', async () => {
      // Arrange
      const invalidRequest: CreatePredictionRequestDto = {
        metric: 'inquiry_volume',
        startDate: '2024-01-01',
        endDate: '2024-01-03', // 3日間のみ
        forecastDays: 7,
        granularity: 'daily'
      };

      // Act & Assert
      await expect(controller.predictInquiryVolume(invalidRequest)).rejects.toThrow(
        BadRequestException
      );
    });

    it('サービスエラーが適切に処理されること', async () => {
      // Arrange
      const request: CreatePredictionRequestDto = {
        metric: 'inquiry_volume',
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        forecastDays: 7,
        granularity: 'daily'
      };

      mockPredictionService.predictInquiryVolume.mockRejectedValue(
        new Error('予測には最低7日分の履歴データが必要です')
      );

      // Act & Assert
      await expect(controller.predictInquiryVolume(request)).rejects.toThrow(BadRequestException);
    });
  });

  describe('predictResourceDemand', () => {
    it('リソース需要予測が正常に実行されること', async () => {
      // Arrange
      const request: CreatePredictionRequestDto = {
        metric: 'resource_demand',
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        forecastDays: 7,
        granularity: 'daily'
      };

      const resourceDemandResult: PredictionAnalysisDto = {
        ...mockPredictionResult,
        metric: 'resource_demand',
        resourceDemand: [
          {
            date: '2024-01-11',
            predictedInquiryVolume: 12,
            recommendedStaffCount: 2,
            expectedWorkloadHours: 24,
            confidenceLevel: 0.9,
            riskLevel: 'low'
          },
          {
            date: '2024-01-12',
            predictedInquiryVolume: 14,
            recommendedStaffCount: 2,
            expectedWorkloadHours: 28,
            confidenceLevel: 0.88,
            riskLevel: 'medium'
          }
        ]
      };

      mockPredictionService.predictResourceDemand.mockResolvedValue(resourceDemandResult);

      // Act
      const result = await controller.predictResourceDemand(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(resourceDemandResult);
      expect(result.message).toBe('リソース需要予測が完了しました');
      expect(mockPredictionService.predictResourceDemand).toHaveBeenCalledWith({
        metric: 'resource_demand',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-01-10'
        },
        forecastDays: 7,
        granularity: 'daily',
        filters: {
          appId: undefined,
          appIds: undefined,
          categories: undefined
        }
      });
    });
  });

  describe('getPredictionVisualization', () => {
    it('可視化データが正常に取得されること', async () => {
      // Arrange
      mockPredictionService.predictInquiryVolume.mockResolvedValue(mockPredictionResult);

      // Act
      const result = await controller.getPredictionVisualization(
        'inquiry_volume',
        '2024-01-01',
        '2024-01-10',
        '7',
        'daily'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.message).toBe('可視化データを取得しました');
    });

    it('リソース需要の可視化データが正常に取得されること', async () => {
      // Arrange
      const resourceDemandResult: PredictionAnalysisDto = {
        ...mockPredictionResult,
        metric: 'resource_demand',
        resourceDemand: [
          {
            date: '2024-01-11',
            predictedInquiryVolume: 12,
            recommendedStaffCount: 2,
            expectedWorkloadHours: 24,
            confidenceLevel: 0.9,
            riskLevel: 'low'
          },
          {
            date: '2024-01-12',
            predictedInquiryVolume: 50,
            recommendedStaffCount: 5,
            expectedWorkloadHours: 100,
            confidenceLevel: 0.8,
            riskLevel: 'high'
          }
        ]
      };

      mockPredictionService.predictResourceDemand.mockResolvedValue(resourceDemandResult);

      // Act
      const result = await controller.getPredictionVisualization(
        'resource_demand',
        '2024-01-01',
        '2024-01-10',
        '7',
        'daily'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(1); // 複数のチャートが生成される
    });

    it('無効なパラメータでエラーが投げられること', async () => {
      // Act & Assert
      await expect(
        controller.getPredictionVisualization(
          'inquiry_volume',
          '2024-01-10', // 終了日より後
          '2024-01-01',
          '7',
          'daily'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPredictionAccuracyReport', () => {
    it('予測精度レポートが正常に取得されること', async () => {
      // Arrange
      mockPredictionService.predictInquiryVolume.mockResolvedValue({
        ...mockPredictionResult,
        accuracy: 0.85
      });

      mockPredictionService.predictResourceDemand.mockResolvedValue({
        ...mockPredictionResult,
        metric: 'resource_demand',
        accuracy: 0.80
      });

      // Act
      const result = await controller.getPredictionAccuracyReport('30');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.volumePredictionAccuracy).toBe(0.85);
      expect(result.data.resourcePredictionAccuracy).toBe(0.80);
      expect(result.data.overallAccuracy).toBe(0.825); // (0.85 + 0.80) / 2
      expect(result.data.recommendations).toBeDefined();
      expect(Array.isArray(result.data.recommendations)).toBe(true);
      expect(result.message).toBe('予測精度レポートを取得しました');
    });

    it('デフォルトの日数パラメータが適用されること', async () => {
      // Arrange
      mockPredictionService.predictInquiryVolume.mockResolvedValue(mockPredictionResult);
      mockPredictionService.predictResourceDemand.mockResolvedValue(mockPredictionResult);

      // Act
      const result = await controller.getPredictionAccuracyReport();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.period).toContain('30'); // デフォルト30日
    });
  });

  describe('バリデーション', () => {
    it('必須フィールドが不足している場合エラーが投げられること', async () => {
      // Arrange
      const invalidRequest = {
        metric: 'inquiry_volume',
        // startDate, endDate が不足
        forecastDays: 7,
        granularity: 'daily'
      } as CreatePredictionRequestDto;

      // Act & Assert
      await expect(controller.predictInquiryVolume(invalidRequest)).rejects.toThrow(BadRequestException);
    });

    it('履歴期間が長すぎる場合エラーが投げられること', async () => {
      // Arrange
      const invalidRequest: CreatePredictionRequestDto = {
        metric: 'inquiry_volume',
        startDate: '2023-01-01', // 1年以上前
        endDate: '2024-01-10',
        forecastDays: 7,
        granularity: 'daily'
      };

      // Act & Assert
      await expect(controller.predictInquiryVolume(invalidRequest)).rejects.toThrow(BadRequestException);
    });
  });
});