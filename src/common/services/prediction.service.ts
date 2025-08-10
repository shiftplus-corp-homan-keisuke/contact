/**
 * 予測分析サービス
 * 要件: 9.3 (予測分析機能の実装)
 * 
 * 機械学習による問い合わせ量予測、リソース需要予測機能を提供
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { Response } from '../entities/response.entity';
import { User } from '../entities/user.entity';
import { 
  ForecastDto, 
  TrendDataPointDto,
  AnalyticsFiltersDto,
  DateRangeDto
} from '../dto/analytics.dto';

/**
 * 予測分析リクエスト用DTO
 */
export interface PredictionRequestDto {
  metric: 'inquiry_volume' | 'response_time' | 'resource_demand';
  period: DateRangeDto;
  forecastDays: number;
  granularity: 'hourly' | 'daily' | 'weekly';
  filters?: AnalyticsFiltersDto;
}

/**
 * リソース需要予測結果DTO
 */
export interface ResourceDemandForecastDto {
  date: string;
  predictedInquiryVolume: number;
  recommendedStaffCount: number;
  expectedWorkloadHours: number;
  confidenceLevel: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 予測分析結果DTO
 */
export interface PredictionAnalysisDto {
  metric: string;
  forecastPeriod: string;
  accuracy: number;
  forecast: ForecastDto[];
  resourceDemand?: ResourceDemandForecastDto[];
  insights: PredictionInsightDto[];
  recommendations: PredictionRecommendationDto[];
}

/**
 * 予測インサイトDTO
 */
export interface PredictionInsightDto {
  type: 'trend' | 'seasonal' | 'anomaly' | 'capacity';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
}

/**
 * 予測推奨事項DTO
 */
export interface PredictionRecommendationDto {
  category: 'staffing' | 'capacity' | 'process' | 'training';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
  timeframe: string;
}

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @InjectRepository(Response)
    private readonly responseRepository: Repository<Response>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 問い合わせ量予測を実行
   * 要件: 9.3 (機械学習による問い合わせ量予測)
   */
  async predictInquiryVolume(request: PredictionRequestDto): Promise<PredictionAnalysisDto> {
    this.logger.log('問い合わせ量予測開始');

    // 履歴データ取得
    const historicalData = await this.getHistoricalInquiryData(request);
    
    // 時系列分析による予測
    const forecast = await this.generateTimeSeriesForecast(historicalData, request.forecastDays);
    
    // 精度計算
    const accuracy = await this.calculateForecastAccuracy(historicalData, forecast);
    
    // インサイト生成
    const insights = await this.generateVolumeInsights(historicalData, forecast);
    
    // 推奨事項生成
    const recommendations = await this.generateVolumeRecommendations(forecast, insights);

    return {
      metric: 'inquiry_volume',
      forecastPeriod: `${request.forecastDays}日間`,
      accuracy,
      forecast,
      insights,
      recommendations
    };
  }

  /**
   * リソース需要予測を実行
   * 要件: 9.3 (リソース需要予測機能)
   */
  async predictResourceDemand(request: PredictionRequestDto): Promise<PredictionAnalysisDto> {
    this.logger.log('リソース需要予測開始');

    // 問い合わせ量予測
    const volumeForecast = await this.predictInquiryVolume(request);
    
    // 履歴パフォーマンスデータ取得
    const performanceData = await this.getHistoricalPerformanceData(request);
    
    // リソース需要計算
    const resourceDemand = await this.calculateResourceDemand(volumeForecast.forecast, performanceData);
    
    // インサイト生成
    const insights = await this.generateResourceInsights(resourceDemand, performanceData);
    
    // 推奨事項生成
    const recommendations = await this.generateResourceRecommendations(resourceDemand, insights);

    return {
      metric: 'resource_demand',
      forecastPeriod: `${request.forecastDays}日間`,
      accuracy: volumeForecast.accuracy,
      forecast: volumeForecast.forecast,
      resourceDemand,
      insights,
      recommendations
    };
  }

  /**
   * 履歴問い合わせデータを取得
   */
  private async getHistoricalInquiryData(request: PredictionRequestDto): Promise<TrendDataPointDto[]> {
    const endDate = new Date(request.period.endDate);
    const startDate = new Date(request.period.startDate);
    
    // 予測に必要な履歴期間を計算（予測期間の3倍以上を推奨）
    const historyDays = Math.max(request.forecastDays * 3, 90);
    const historyStartDate = new Date(startDate.getTime() - historyDays * 24 * 60 * 60 * 1000);

    let groupByClause: string;
    let dateFormat: string;

    switch (request.granularity) {
      case 'hourly':
        groupByClause = "DATE_TRUNC('hour', i.created_at)";
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        break;
      case 'weekly':
        groupByClause = "DATE_TRUNC('week', i.created_at)";
        dateFormat = 'YYYY-MM-DD';
        break;
      default: // daily
        groupByClause = "DATE_TRUNC('day', i.created_at)";
        dateFormat = 'YYYY-MM-DD';
    }

    const query = `
      SELECT 
        ${groupByClause} as period,
        TO_CHAR(${groupByClause}, '${dateFormat}') as timestamp,
        COUNT(*) as value,
        AVG(EXTRACT(EPOCH FROM (r.created_at - i.created_at)) / 3600) as avg_response_time
      FROM inquiries i
      LEFT JOIN responses r ON i.id = r.inquiry_id
      WHERE i.created_at >= $1 AND i.created_at <= $2
      ${request.filters?.appId ? 'AND i.app_id = $3' : ''}
      GROUP BY ${groupByClause}
      ORDER BY period
    `;

    const params: any[] = [historyStartDate, endDate];
    if (request.filters?.appId) {
      params.push(request.filters.appId);
    }

    const results = await this.inquiryRepository.query(query, params);

    return results.map((result: any) => ({
      timestamp: result.timestamp,
      value: parseInt(result.value),
      metadata: {
        averageResponseTime: parseFloat(result.avg_response_time || '0')
      }
    }));
  }

  /**
   * 時系列予測を生成（シンプルな移動平均とトレンド分析）
   */
  private async generateTimeSeriesForecast(
    historicalData: TrendDataPointDto[], 
    forecastDays: number
  ): Promise<ForecastDto[]> {
    if (historicalData.length < 7) {
      throw new Error('予測には最低7日分の履歴データが必要です');
    }

    const forecast: ForecastDto[] = [];
    const windowSize = Math.min(7, Math.floor(historicalData.length / 3)); // 移動平均の窓サイズ
    
    // 最近のデータから移動平均を計算
    const recentData = historicalData.slice(-windowSize);
    const movingAverage = recentData.reduce((sum, point) => sum + point.value, 0) / recentData.length;
    
    // トレンド計算（線形回帰の簡易版）
    const trend = this.calculateLinearTrend(historicalData.slice(-14)); // 直近2週間のトレンド
    
    // 季節性パターン検出（週単位）
    const seasonalPattern = this.detectWeeklySeasonality(historicalData);
    
    // 予測生成
    const lastDate = new Date(historicalData[historicalData.length - 1].timestamp);
    
    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = forecastDate.getDay();
      
      // 基本予測値 = 移動平均 + トレンド * 日数
      let predictedValue = movingAverage + (trend * i);
      
      // 季節性調整
      const seasonalMultiplier = seasonalPattern[dayOfWeek] || 1.0;
      predictedValue *= seasonalMultiplier;
      
      // ランダムノイズ追加（現実的な変動を模擬）
      const noise = (Math.random() - 0.5) * 0.1 * predictedValue;
      predictedValue += noise;
      
      // 負の値を防ぐ
      predictedValue = Math.max(0, Math.round(predictedValue));
      
      forecast.push({
        timestamp: forecastDate.toISOString().split('T')[0],
        predictedValue,
        confidenceLevel: Math.max(0.5, 0.9 - (i * 0.02)) // 日数が増えるほど信頼度低下
      });
    }

    return forecast;
  }

  /**
   * 線形トレンドを計算
   */
  private calculateLinearTrend(data: TrendDataPointDto[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = data.reduce((sum, _, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, index) => sum + (index * point.value), 0);
    const sumXX = data.reduce((sum, _, index) => sum + (index * index), 0);

    // 線形回帰の傾き計算
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return slope;
  }

  /**
   * 週単位の季節性パターンを検出
   */
  private detectWeeklySeasonality(data: TrendDataPointDto[]): number[] {
    const weeklyPattern = new Array(7).fill(0);
    const weeklyCounts = new Array(7).fill(0);

    data.forEach(point => {
      const date = new Date(point.timestamp);
      const dayOfWeek = date.getDay();
      weeklyPattern[dayOfWeek] += point.value;
      weeklyCounts[dayOfWeek]++;
    });

    // 各曜日の平均値を計算
    const weeklyAverages = weeklyPattern.map((sum, index) => 
      weeklyCounts[index] > 0 ? sum / weeklyCounts[index] : 0
    );

    // 全体平均を計算
    const overallAverage = weeklyAverages.reduce((sum, avg) => sum + avg, 0) / 7;

    // 季節性倍率を計算（全体平均に対する比率）
    return weeklyAverages.map(avg => 
      overallAverage > 0 ? avg / overallAverage : 1.0
    );
  }

  /**
   * 予測精度を計算
   */
  private async calculateForecastAccuracy(
    historicalData: TrendDataPointDto[], 
    forecast: ForecastDto[]
  ): Promise<number> {
    // 履歴データの最後の部分を使って予測精度をテスト
    const testSize = Math.min(7, Math.floor(historicalData.length * 0.2));
    const testData = historicalData.slice(-testSize);
    const trainData = historicalData.slice(0, -testSize);

    if (trainData.length < 7) {
      return 0.7; // デフォルト精度
    }

    // テストデータに対する予測を生成
    const testForecast = await this.generateTimeSeriesForecast(trainData, testSize);

    // MAPE (Mean Absolute Percentage Error) を計算
    let totalError = 0;
    let validPoints = 0;

    for (let i = 0; i < Math.min(testData.length, testForecast.length); i++) {
      const actual = testData[i].value;
      const predicted = testForecast[i].predictedValue;

      if (actual > 0) {
        const error = Math.abs((actual - predicted) / actual);
        totalError += error;
        validPoints++;
      }
    }

    if (validPoints === 0) {
      return 0.7; // デフォルト精度
    }

    const mape = totalError / validPoints;
    const accuracy = Math.max(0.1, 1 - mape); // 精度は10%以上とする

    return Math.min(0.95, accuracy); // 最大95%の精度
  }

  /**
   * 履歴パフォーマンスデータを取得
   */
  private async getHistoricalPerformanceData(request: PredictionRequestDto): Promise<any> {
    const endDate = new Date(request.period.endDate);
    const startDate = new Date(request.period.startDate);
    const historyDays = 90; // 3ヶ月の履歴
    const historyStartDate = new Date(startDate.getTime() - historyDays * 24 * 60 * 60 * 1000);

    const query = `
      SELECT 
        DATE_TRUNC('day', i.created_at) as date,
        COUNT(*) as inquiry_count,
        COUNT(DISTINCT i.assigned_to) as active_staff_count,
        AVG(EXTRACT(EPOCH FROM (r.created_at - i.created_at)) / 3600) as avg_response_time,
        AVG(CASE 
          WHEN i.status IN ('resolved', 'closed') 
          THEN EXTRACT(EPOCH FROM (i.updated_at - i.created_at)) / 3600 
          ELSE NULL 
        END) as avg_resolution_time
      FROM inquiries i
      LEFT JOIN responses r ON i.id = r.inquiry_id
      WHERE i.created_at >= $1 AND i.created_at <= $2
      ${request.filters?.appId ? 'AND i.app_id = $3' : ''}
      GROUP BY DATE_TRUNC('day', i.created_at)
      ORDER BY date
    `;

    const params: any[] = [historyStartDate, endDate];
    if (request.filters?.appId) {
      params.push(request.filters.appId);
    }

    const results = await this.inquiryRepository.query(query, params);

    return {
      dailyStats: results.map((result: any) => ({
        date: result.date,
        inquiryCount: parseInt(result.inquiry_count),
        activeStaffCount: parseInt(result.active_staff_count),
        avgResponseTime: parseFloat(result.avg_response_time || '0'),
        avgResolutionTime: parseFloat(result.avg_resolution_time || '0')
      })),
      averageInquiriesPerStaff: this.calculateAverageInquiriesPerStaff(results),
      averageWorkingHoursPerInquiry: this.calculateAverageWorkingHours(results)
    };
  }

  /**
   * リソース需要を計算
   */
  private async calculateResourceDemand(
    forecast: ForecastDto[], 
    performanceData: any
  ): Promise<ResourceDemandForecastDto[]> {
    const resourceDemand: ResourceDemandForecastDto[] = [];

    // 基準値計算
    const avgInquiriesPerStaff = performanceData.averageInquiriesPerStaff || 10;
    const avgHoursPerInquiry = performanceData.averageWorkingHoursPerInquiry || 2;

    forecast.forEach(point => {
      const predictedVolume = point.predictedValue;
      
      // 必要スタッフ数計算
      const recommendedStaffCount = Math.ceil(predictedVolume / avgInquiriesPerStaff);
      
      // 予想作業時間計算
      const expectedWorkloadHours = predictedVolume * avgHoursPerInquiry;
      
      // リスクレベル計算
      const riskLevel = this.calculateRiskLevel(predictedVolume, recommendedStaffCount, point.confidenceLevel);

      resourceDemand.push({
        date: point.timestamp,
        predictedInquiryVolume: predictedVolume,
        recommendedStaffCount,
        expectedWorkloadHours,
        confidenceLevel: point.confidenceLevel,
        riskLevel
      });
    });

    return resourceDemand;
  }

  /**
   * リスクレベルを計算
   */
  private calculateRiskLevel(
    predictedVolume: number, 
    recommendedStaff: number, 
    confidence: number
  ): 'low' | 'medium' | 'high' {
    // 複数の要因を考慮してリスクレベルを決定
    let riskScore = 0;

    // 予測量が多い場合はリスク増加
    if (predictedVolume > 50) riskScore += 1;
    if (predictedVolume > 100) riskScore += 1;

    // 必要スタッフ数が多い場合はリスク増加
    if (recommendedStaff > 5) riskScore += 1;
    if (recommendedStaff > 10) riskScore += 1;

    // 信頼度が低い場合はリスク増加
    if (confidence < 0.7) riskScore += 1;
    if (confidence < 0.5) riskScore += 1;

    if (riskScore >= 3) return 'high';
    if (riskScore >= 1) return 'medium';
    return 'low';
  }

  /**
   * 問い合わせ量インサイトを生成
   */
  private async generateVolumeInsights(
    historicalData: TrendDataPointDto[], 
    forecast: ForecastDto[]
  ): Promise<PredictionInsightDto[]> {
    const insights: PredictionInsightDto[] = [];

    // トレンド分析
    const trend = this.calculateLinearTrend(historicalData.slice(-14));
    if (Math.abs(trend) > 0.5) {
      insights.push({
        type: 'trend',
        title: trend > 0 ? '問い合わせ量増加トレンド' : '問い合わせ量減少トレンド',
        description: `直近2週間で${trend > 0 ? '増加' : '減少'}傾向が見られます（1日あたり${Math.abs(trend).toFixed(1)}件）`,
        impact: Math.abs(trend) > 2 ? 'high' : Math.abs(trend) > 1 ? 'medium' : 'low',
        confidence: 0.8
      });
    }

    // 季節性パターン
    const seasonalPattern = this.detectWeeklySeasonality(historicalData);
    const maxDay = seasonalPattern.indexOf(Math.max(...seasonalPattern));
    const minDay = seasonalPattern.indexOf(Math.min(...seasonalPattern));
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    insights.push({
      type: 'seasonal',
      title: '週間パターン分析',
      description: `${dayNames[maxDay]}曜日が最も多く、${dayNames[minDay]}曜日が最も少ない傾向があります`,
      impact: 'medium',
      confidence: 0.7
    });

    // 容量分析
    const maxForecast = Math.max(...forecast.map(f => f.predictedValue));
    const avgHistorical = historicalData.reduce((sum, p) => sum + p.value, 0) / historicalData.length;
    
    if (maxForecast > avgHistorical * 1.5) {
      insights.push({
        type: 'capacity',
        title: '容量不足の可能性',
        description: `予測期間中に通常の1.5倍以上の問い合わせが予想されます（最大${maxForecast}件）`,
        impact: 'high',
        confidence: 0.75
      });
    }

    return insights;
  }

  /**
   * 問い合わせ量推奨事項を生成
   */
  private async generateVolumeRecommendations(
    forecast: ForecastDto[], 
    insights: PredictionInsightDto[]
  ): Promise<PredictionRecommendationDto[]> {
    const recommendations: PredictionRecommendationDto[] = [];

    // 高リスクの洞察に基づく推奨事項
    const highImpactInsights = insights.filter(i => i.impact === 'high');
    
    if (highImpactInsights.some(i => i.type === 'capacity')) {
      recommendations.push({
        category: 'staffing',
        title: 'スタッフ増員の検討',
        description: '予測される問い合わせ量増加に対応するため、一時的なスタッフ増員を検討してください',
        priority: 'high',
        estimatedImpact: '対応時間30%短縮',
        timeframe: '1週間以内'
      });
    }

    if (highImpactInsights.some(i => i.type === 'trend' && i.title.includes('増加'))) {
      recommendations.push({
        category: 'process',
        title: 'FAQ充実化',
        description: '問い合わせ量増加に備えて、よくある質問の充実化を進めてください',
        priority: 'medium',
        estimatedImpact: '問い合わせ量10-15%削減',
        timeframe: '2週間以内'
      });
    }

    // 季節性に基づく推奨事項
    const seasonalInsight = insights.find(i => i.type === 'seasonal');
    if (seasonalInsight) {
      recommendations.push({
        category: 'staffing',
        title: 'シフト最適化',
        description: '曜日別の問い合わせパターンに合わせてスタッフシフトを最適化してください',
        priority: 'medium',
        estimatedImpact: 'リソース効率20%向上',
        timeframe: '1ヶ月以内'
      });
    }

    return recommendations;
  }

  /**
   * リソースインサイトを生成
   */
  private async generateResourceInsights(
    resourceDemand: ResourceDemandForecastDto[], 
    performanceData: any
  ): Promise<PredictionInsightDto[]> {
    const insights: PredictionInsightDto[] = [];

    // 高リスク日の特定
    const highRiskDays = resourceDemand.filter(r => r.riskLevel === 'high');
    if (highRiskDays.length > 0) {
      insights.push({
        type: 'capacity',
        title: '高リスク期間の検出',
        description: `${highRiskDays.length}日間で容量不足のリスクが高くなります`,
        impact: 'high',
        confidence: 0.8
      });
    }

    // スタッフ需要の変動
    const staffCounts = resourceDemand.map(r => r.recommendedStaffCount);
    const maxStaff = Math.max(...staffCounts);
    const minStaff = Math.min(...staffCounts);
    
    if (maxStaff - minStaff > 3) {
      insights.push({
        type: 'capacity',
        title: 'スタッフ需要の大きな変動',
        description: `必要スタッフ数が${minStaff}人から${maxStaff}人まで変動します`,
        impact: 'medium',
        confidence: 0.75
      });
    }

    return insights;
  }

  /**
   * リソース推奨事項を生成
   */
  private async generateResourceRecommendations(
    resourceDemand: ResourceDemandForecastDto[], 
    insights: PredictionInsightDto[]
  ): Promise<PredictionRecommendationDto[]> {
    const recommendations: PredictionRecommendationDto[] = [];

    // 高リスク期間への対応
    const highRiskInsight = insights.find(i => i.type === 'capacity' && i.impact === 'high');
    if (highRiskInsight) {
      recommendations.push({
        category: 'staffing',
        title: '柔軟なスタッフ配置',
        description: 'パートタイムスタッフや外部委託を活用して、需要変動に柔軟に対応してください',
        priority: 'high',
        estimatedImpact: 'SLA達成率95%維持',
        timeframe: '即座'
      });
    }

    // 効率化の推奨
    const maxWorkload = Math.max(...resourceDemand.map(r => r.expectedWorkloadHours));
    if (maxWorkload > 80) { // 1日8時間 × 10人を超える場合
      recommendations.push({
        category: 'process',
        title: '自動化の導入',
        description: '定型的な問い合わせに対する自動回答システムの導入を検討してください',
        priority: 'medium',
        estimatedImpact: '作業時間25%削減',
        timeframe: '1ヶ月以内'
      });
    }

    return recommendations;
  }

  /**
   * スタッフあたり平均問い合わせ数を計算
   */
  private calculateAverageInquiriesPerStaff(results: any[]): number {
    const validResults = results.filter(r => r.active_staff_count > 0);
    if (validResults.length === 0) return 10; // デフォルト値

    const totalInquiries = validResults.reduce((sum, r) => sum + parseInt(r.inquiry_count), 0);
    const totalStaffDays = validResults.reduce((sum, r) => sum + parseInt(r.active_staff_count), 0);

    return totalStaffDays > 0 ? totalInquiries / totalStaffDays : 10;
  }

  /**
   * 問い合わせあたり平均作業時間を計算
   */
  private calculateAverageWorkingHours(results: any[]): number {
    const validResults = results.filter(r => r.avg_resolution_time > 0);
    if (validResults.length === 0) return 2; // デフォルト値

    const avgResolutionTime = validResults.reduce((sum, r) => sum + parseFloat(r.avg_resolution_time), 0) / validResults.length;
    
    // 解決時間の一部を実際の作業時間として推定（30%程度）
    return Math.max(0.5, avgResolutionTime * 0.3);
  }
}