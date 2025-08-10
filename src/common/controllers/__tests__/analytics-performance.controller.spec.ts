/**
 * 分析コントローラー（パフォーマンス分析機能）のテスト
 * 要件: 9.2 (パフォーマンス分析機能の実装)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../analytics.controller';
import { AnalyticsService } from '../../services/analytics.service';
import { 
  UserPerformanceDto,
  TeamPerformanceDto,
  SlaComplianceReportDto,
  TrendAnalysisDto,
  ReportGenerationDto,
  DateRangeDto,
  AnalyticsFiltersDto
} from '../../dto/analytics.dto';
import { InquiryPriority } from '../../types/inquiry.types';

describe('AnalyticsController - Performance Analysis', () => {
  let controller: AnalyticsController;
  let analyticsService: AnalyticsService;

  const mockAnalyticsService = {
    getUserPerformance: jest.fn(),
    getTeamPerformance: jest.fn(),
    getSlaComplianceReport: jest.fn(),
    getTrendAnalysis: jest.fn(),
    generateReport: jest.fn(),
    getInquiryStatistics: jest.fn(),
    getResponseTimeAnalytics: jest.fn(),
    getRealtimeStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPerformance', () => {
    it('ユーザーパフォーマンス分析を正常に取得できること', async () => {
      // Arrange
      const userId = 'user-123';
      const dateRange: DateRangeDto = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      };

      const expectedResult: UserPerformanceDto = {
        userId,
        userName: 'テストユーザー',
        email: 'test@example.com',
        totalInquiriesHandled: 50,
        resolvedInquiries: 45,
        averageResponseTimeHours: 2.5,
        averageResolutionTimeHours: 24.0,
        slaComplianceRate: 90.0,
        customerSatisfactionScore: 4.2,
        workloadDistribution: [
          {
            priority: InquiryPriority.HIGH,
            count: 10,
            percentage: 20,
            averageHandlingTimeHours: 1.5
          }
        ],
        performanceTrend: [
          {
            date: '2024-01-01',
            inquiriesHandled: 5,
            averageResponseTimeHours: 2.0,
            slaComplianceRate: 95.0,
            satisfactionScore: 4.5
          }
        ],
        topCategories: [
          {
            category: '技術的問題',
            count: 20,
            averageResponseTimeHours: 2.0,
            slaComplianceRate: 95.0,
            expertiseLevel: 'expert'
          }
        ]
      };

      mockAnalyticsService.getUserPerformance.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getUserPerformance(userId, dateRange);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.getUserPerformance).toHaveBeenCalledWith(userId, dateRange);
    });
  });

  describe('getTeamPerformance', () => {
    it('チームパフォーマンス分析を正常に取得できること', async () => {
      // Arrange
      const teamId = 'team-123';
      const dateRange: DateRangeDto = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      };

      const expectedResult: TeamPerformanceDto = {
        teamId,
        teamName: 'テストチーム',
        memberCount: 3,
        totalInquiriesHandled: 150,
        resolvedInquiries: 135,
        averageResponseTimeHours: 3.0,
        averageResolutionTimeHours: 20.0,
        teamSlaComplianceRate: 85.0,
        teamSatisfactionScore: 4.0,
        memberPerformances: [],
        workloadBalance: [
          {
            userId: 'user-1',
            userName: 'ユーザー1',
            currentWorkload: 30,
            averageWorkload: 25.0,
            workloadRatio: 1.2,
            efficiency: 90.0
          }
        ],
        performanceComparison: [
          {
            metric: '平均対応時間',
            value: 3.0,
            benchmark: 8.0,
            percentageDifference: -62.5,
            trend: 'improving'
          }
        ]
      };

      mockAnalyticsService.getTeamPerformance.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getTeamPerformance(teamId, dateRange);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.getTeamPerformance).toHaveBeenCalledWith(teamId, dateRange);
    });
  });

  describe('getSlaComplianceReport', () => {
    it('SLA達成率監視レポートを正常に取得できること', async () => {
      // Arrange
      const filters: AnalyticsFiltersDto = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        appId: 'app-123'
      };

      const expectedResult: SlaComplianceReportDto = {
        overallComplianceRate: 85.5,
        complianceByPriority: [
          {
            priority: InquiryPriority.HIGH,
            targetHours: 4,
            complianceRate: 90.0,
            averageResponseTimeHours: 3.5,
            violationCount: 2,
            totalCount: 20
          }
        ],
        complianceByCategory: [],
        complianceByUser: [],
        complianceByApp: [],
        complianceTrend: [],
        violationAnalysis: {
          totalViolations: 5,
          violationRate: 10.0,
          commonCauses: [],
          timePatterns: [],
          impactAnalysis: {
            customerSatisfactionImpact: 0.2,
            escalationRate: 5.0,
            averageResolutionDelayHours: 2.0,
            businessImpactScore: 3.0
          }
        },
        improvementRecommendations: []
      };

      mockAnalyticsService.getSlaComplianceReport.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getSlaComplianceReport(filters);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.getSlaComplianceReport).toHaveBeenCalledWith(filters);
    });

    it('カンマ区切りのフィルターパラメータを正しく配列に変換できること', async () => {
      // Arrange
      const filters = {
        categories: 'category1,category2,category3',
        priorities: 'high,medium,low'
      } as any;

      const expectedFilters = {
        categories: ['category1', 'category2', 'category3'],
        priorities: ['high', 'medium', 'low']
      };

      mockAnalyticsService.getSlaComplianceReport.mockResolvedValue({} as SlaComplianceReportDto);

      // Act
      await controller.getSlaComplianceReport(filters);

      // Assert
      expect(mockAnalyticsService.getSlaComplianceReport).toHaveBeenCalledWith(expectedFilters);
    });
  });

  describe('getTrendAnalysis', () => {
    it('トレンド分析を正常に取得できること', async () => {
      // Arrange
      const metric = 'inquiryCount';
      const dateRange: DateRangeDto = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      };

      const expectedResult: TrendAnalysisDto = {
        metric,
        period: `${dateRange.startDate} - ${dateRange.endDate}`,
        dataPoints: [
          {
            timestamp: '2024-01-01',
            value: 10,
            movingAverage: 10.0,
            percentageChange: 0.0
          },
          {
            timestamp: '2024-01-02',
            value: 12,
            movingAverage: 11.0,
            percentageChange: 20.0
          }
        ],
        trendDirection: 'increasing',
        trendStrength: 0.8,
        seasonalPatterns: [],
        anomalies: [],
        forecast: [
          {
            timestamp: '2024-02-01',
            predictedValue: 13.5,
            confidenceInterval: { lower: 10.8, upper: 16.2 },
            accuracy: 0.85
          }
        ]
      };

      mockAnalyticsService.getTrendAnalysis.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getTrendAnalysis(metric, dateRange);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.getTrendAnalysis).toHaveBeenCalledWith(metric, dateRange);
    });

    it('サポートされていないメトリックでエラーが発生すること', async () => {
      // Arrange
      const invalidMetric = 'invalidMetric';
      const dateRange: DateRangeDto = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      };

      // Act & Assert
      await expect(controller.getTrendAnalysis(invalidMetric, dateRange))
        .rejects.toThrow('サポートされていないメトリックです: invalidMetric');
    });
  });

  describe('generateReport', () => {
    it('パフォーマンスレポートを正常に生成できること', async () => {
      // Arrange
      const reportType = 'performance';
      const filters: AnalyticsFiltersDto = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      };

      const expectedResult: ReportGenerationDto = {
        reportId: 'report_123456789_abcdef123',
        reportType,
        title: 'パフォーマンス分析レポート',
        description: 'ユーザーとチームのパフォーマンス分析結果',
        generatedAt: new Date(),
        period: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z'
        },
        filters,
        sections: [
          {
            sectionId: 'performance-overview',
            title: 'パフォーマンス概要',
            type: 'metric',
            data: {},
            insights: ['パフォーマンスが向上しています']
          }
        ],
        summary: {
          keyMetrics: [
            {
              name: '総問い合わせ数',
              value: 100,
              unit: '件',
              change: 10,
              changeDirection: 'up',
              status: 'good'
            }
          ],
          highlights: ['パフォーマンスが向上しています'],
          concerns: [],
          overallScore: 85
        },
        recommendations: [
          {
            category: 'パフォーマンス',
            title: '対応時間の改善',
            description: '平均対応時間を短縮することで顧客満足度を向上できます',
            priority: 'medium',
            estimatedImpact: '顧客満足度10%向上',
            actionItems: ['テンプレート活用の推進', 'FAQ充実化']
          }
        ]
      };

      mockAnalyticsService.generateReport.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.generateReport(reportType, filters);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.generateReport).toHaveBeenCalledWith(reportType, filters);
    });

    it('サポートされていないレポートタイプでエラーが発生すること', async () => {
      // Arrange
      const invalidReportType = 'invalidType' as any;
      const filters: AnalyticsFiltersDto = {};

      // Act & Assert
      await expect(controller.generateReport(invalidReportType, filters))
        .rejects.toThrow('サポートされていないレポートタイプです: invalidType');
    });
  });

  describe('getPerformanceComparison', () => {
    it('ユーザー間パフォーマンス比較を正常に取得できること', async () => {
      // Arrange
      const userIds = 'user-1,user-2,user-3';
      const dateRange: DateRangeDto = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z'
      };

      const mockUserPerformance: UserPerformanceDto = {
        userId: 'user-1',
        userName: 'ユーザー1',
        email: 'user1@example.com',
        totalInquiriesHandled: 30,
        resolvedInquiries: 28,
        averageResponseTimeHours: 2.5,
        averageResolutionTimeHours: 18.0,
        slaComplianceRate: 90.0,
        customerSatisfactionScore: 4.2,
        workloadDistribution: [],
        performanceTrend: [],
        topCategories: []
      };

      mockAnalyticsService.getUserPerformance.mockResolvedValue(mockUserPerformance);

      // Act
      const result = await controller.getPerformanceComparison(userIds, undefined, dateRange);

      // Assert
      expect(result).toBeDefined();
      expect(result.comparisonType).toBe('user');
      expect(result.userComparison).toBeDefined();
      expect(result.userComparison.users).toHaveLength(3);
      expect(mockAnalyticsService.getUserPerformance).toHaveBeenCalledTimes(3);
    });

    it('分析期間が指定されていない場合エラーが発生すること', async () => {
      // Arrange
      const userIds = 'user-1,user-2';

      // Act & Assert
      await expect(controller.getPerformanceComparison(userIds, undefined, undefined))
        .rejects.toThrow('分析期間の指定が必要です');
    });
  });

  describe('getSlaViolationAlerts', () => {
    it('SLA違反アラートを正常に取得できること', async () => {
      // Arrange
      const severity = 'high';
      const appId = 'app-123';

      const mockSlaReport: SlaComplianceReportDto = {
        overallComplianceRate: 75.0, // 80%を下回る
        complianceByPriority: [
          {
            priority: InquiryPriority.HIGH,
            targetHours: 4,
            complianceRate: 60.0, // 70%を下回る
            averageResponseTimeHours: 5.5,
            violationCount: 8,
            totalCount: 20
          }
        ],
        complianceByCategory: [],
        complianceByUser: [],
        complianceByApp: [],
        complianceTrend: [],
        violationAnalysis: {
          totalViolations: 15,
          violationRate: 25.0,
          commonCauses: [],
          timePatterns: [],
          impactAnalysis: {
            customerSatisfactionImpact: 0.3,
            escalationRate: 8.0,
            averageResolutionDelayHours: 3.0,
            businessImpactScore: 4.0
          }
        },
        improvementRecommendations: []
      };

      mockAnalyticsService.getSlaComplianceReport.mockResolvedValue(mockSlaReport);

      // Act
      const result = await controller.getSlaViolationAlerts(severity, appId);

      // Assert
      expect(result).toBeDefined();
      expect(result.alerts).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.overallComplianceRate).toBe(75.0);
      
      // 全体SLA達成率低下アラートが生成されることを確認
      const overallAlert = result.alerts.find((alert: any) => alert.type === 'overall_compliance');
      expect(overallAlert).toBeDefined();
      expect(overallAlert.severity).toBe('medium');

      // 優先度別SLA違反アラートが生成されることを確認
      const priorityAlert = result.alerts.find((alert: any) => alert.type === 'priority_compliance');
      expect(priorityAlert).toBeDefined();
      expect(priorityAlert.severity).toBe('high');
    });
  });

  describe('getPerformanceRecommendations', () => {
    it('ユーザー固有のパフォーマンス改善提案を正常に取得できること', async () => {
      // Arrange
      const userId = 'user-123';

      const mockUserPerformance: UserPerformanceDto = {
        userId,
        userName: 'テストユーザー',
        email: 'test@example.com',
        totalInquiriesHandled: 50,
        resolvedInquiries: 45,
        averageResponseTimeHours: 10.0, // 8時間を超える
        averageResolutionTimeHours: 24.0,
        slaComplianceRate: 75.0, // 80%を下回る
        customerSatisfactionScore: 4.2,
        workloadDistribution: [],
        performanceTrend: [],
        topCategories: []
      };

      mockAnalyticsService.getUserPerformance.mockResolvedValue(mockUserPerformance);
      mockAnalyticsService.getSlaComplianceReport.mockResolvedValue({
        overallComplianceRate: 90.0
      } as SlaComplianceReportDto);

      // Act
      const result = await controller.getPerformanceRecommendations(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // SLA改善提案が含まれることを確認
      const slaRecommendation = result.recommendations.find((rec: any) => rec.category === 'SLA改善');
      expect(slaRecommendation).toBeDefined();
      expect(slaRecommendation.priority).toBe('high');

      // 対応時間短縮提案が含まれることを確認
      const responseTimeRecommendation = result.recommendations.find((rec: any) => rec.category === '対応時間短縮');
      expect(responseTimeRecommendation).toBeDefined();
      expect(responseTimeRecommendation.priority).toBe('medium');
    });

    it('チーム固有のパフォーマンス改善提案を正常に取得できること', async () => {
      // Arrange
      const teamId = 'team-123';

      const mockTeamPerformance: TeamPerformanceDto = {
        teamId,
        teamName: 'テストチーム',
        memberCount: 3,
        totalInquiriesHandled: 150,
        resolvedInquiries: 135,
        averageResponseTimeHours: 3.0,
        averageResolutionTimeHours: 20.0,
        teamSlaComplianceRate: 85.0,
        teamSatisfactionScore: 4.0,
        memberPerformances: [],
        workloadBalance: [
          {
            userId: 'user-1',
            userName: 'ユーザー1',
            currentWorkload: 50, // 平均の2倍
            averageWorkload: 25.0,
            workloadRatio: 2.0, // 1.5を超える
            efficiency: 90.0
          },
          {
            userId: 'user-2',
            userName: 'ユーザー2',
            currentWorkload: 10, // 平均の半分以下
            averageWorkload: 25.0,
            workloadRatio: 0.4, // 0.5を下回る
            efficiency: 85.0
          }
        ],
        performanceComparison: []
      };

      mockAnalyticsService.getTeamPerformance.mockResolvedValue(mockTeamPerformance);
      mockAnalyticsService.getSlaComplianceReport.mockResolvedValue({
        overallComplianceRate: 90.0
      } as SlaComplianceReportDto);

      // Act
      const result = await controller.getPerformanceRecommendations(undefined, teamId);

      // Assert
      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      
      // ワークロード最適化提案が含まれることを確認
      const workloadRecommendation = result.recommendations.find((rec: any) => rec.category === 'ワークロード最適化');
      expect(workloadRecommendation).toBeDefined();
      expect(workloadRecommendation.priority).toBe('medium');
    });
  });
});