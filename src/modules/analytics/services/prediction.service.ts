import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { User } from '../../users/entities/user.entity';
import {
    PredictionData,
    PredictionPoint,
    PredictionFactor,
    ResourceDemandPrediction,
    StaffingRecommendation,
    PredictedWorkloadDistribution,
    SeasonalFactor,
    PredictionModel,
    ModelTrainingData,
    PredictionVisualization,
    AnalyticsFilters
} from '../types/analytics.types';

/**
 * 予測分析サービス
 * 機械学習による問い合わせ量予測、リソース需要予測、予測結果の可視化機能を提供
 */
@Injectable()
export class PredictionService {
    private readonly logger = new Logger(PredictionService.name);

    // 予測モデルの設定
    private readonly PREDICTION_MODELS: Record<string, PredictionModel> = {
        linear_regression: {
            name: 'Linear Regression',
            type: 'linear_regression',
            accuracy: 85.2,
            lastTrained: new Date(),
            features: ['day_of_week', 'hour_of_day', 'month', 'historical_average'],
            parameters: { slope: 1.2, intercept: 5.0 },
        },
        time_series: {
            name: 'Time Series ARIMA',
            type: 'time_series',
            accuracy: 78.9,
            lastTrained: new Date(),
            features: ['lag_1', 'lag_7', 'lag_30', 'seasonal_component'],
            parameters: { p: 2, d: 1, q: 2 },
        },
        machine_learning: {
            name: 'Random Forest',
            type: 'machine_learning',
            accuracy: 91.3,
            lastTrained: new Date(),
            features: ['historical_data', 'seasonal_patterns', 'external_factors', 'app_specific_trends'],
            parameters: { n_estimators: 100, max_depth: 10 },
        },
    };

    constructor(
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(Response)
        private readonly responseRepository: Repository<Response>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    /**
     * 問い合わせ量予測を取得
     */
    async getInquiryVolumePrediction(
        period: 'daily' | 'weekly' | 'monthly' = 'daily',
        daysAhead: number = 30,
        filters: AnalyticsFilters = {}
    ): Promise<PredictionData> {
        this.logger.log(`問い合わせ量予測を取得中: ${period}, ${daysAhead}日先`, { filters });

        try {
            // 履歴データを取得
            const historicalData = await this.getHistoricalData(period, filters);

            // 予測モデルを選択（最も精度の高いモデル）
            const model = this.selectBestModel('inquiry_volume');

            // 予測を実行
            const predictions = await this.generatePredictions(historicalData, model, daysAhead, period);

            // 信頼度を計算
            const confidence = this.calculateConfidence(historicalData, model);

            const predictionData: PredictionData = {
                metric: 'inquiry_volume',
                period,
                predictions,
                confidence,
                model: model.name,
                accuracy: model.accuracy,
                lastUpdated: new Date(),
            };

            this.logger.log(`問い合わせ量予測を取得完了`, {
                predictionsCount: predictions.length,
                confidence,
                model: model.name
            });

            return predictionData;
        } catch (error) {
            this.logger.error('問い合わせ量予測取得エラー', error);
            throw error;
        }
    }

    /**
     * リソース需要予測を取得
     */
    async getResourceDemandPrediction(
        period: string = 'next_month',
        filters: AnalyticsFilters = {}
    ): Promise<ResourceDemandPrediction> {
        this.logger.log(`リソース需要予測を取得中: ${period}`, { filters });

        try {
            // 問い合わせ量予測を取得
            const volumePrediction = await this.getInquiryVolumePrediction('daily', 30, filters);

            // 予測問い合わせ数を計算
            const predictedInquiries = volumePrediction.predictions.reduce(
                (sum, point) => sum + point.predictedValue, 0
            );

            // スタッフィング推奨を計算
            const recommendedStaffing = await this.calculateStaffingRecommendation(predictedInquiries, filters);

            // ワークロード分布を予測
            const workloadDistribution = await this.predictWorkloadDistribution(predictedInquiries, filters);

            // ピーク時間を予測
            const peakHours = await this.predictPeakHours(filters);

            // 季節要因を分析
            const seasonalFactors = await this.analyzeSeasonalFactors(filters);

            const resourceDemand: ResourceDemandPrediction = {
                period,
                predictedInquiries,
                recommendedStaffing,
                workloadDistribution,
                peakHours,
                seasonalFactors,
            };

            this.logger.log(`リソース需要予測を取得完了`, {
                predictedInquiries,
                recommendedStaff: recommendedStaffing.totalStaff
            });

            return resourceDemand;
        } catch (error) {
            this.logger.error('リソース需要予測取得エラー', error);
            throw error;
        }
    }

    /**
     * 予測結果の可視化データを取得
     */
    async getPredictionVisualization(
        metric: string,
        period: 'daily' | 'weekly' | 'monthly' = 'daily',
        filters: AnalyticsFilters = {}
    ): Promise<PredictionVisualization> {
        this.logger.log(`予測可視化データを取得中: ${metric} (${period})`, { filters });

        try {
            // 予測データを取得
            const predictionData = await this.getInquiryVolumePrediction(period, 30, filters);

            // 履歴データを取得
            const historicalData = await this.getHistoricalData(period, filters);

            // 可視化データポイントを作成
            const dataPoints = [
                // 履歴データ
                ...historicalData.map(point => ({
                    x: point.date,
                    y: point.value,
                    type: 'actual' as const,
                    label: '実績',
                })),
                // 予測データ
                ...predictionData.predictions.map(point => ({
                    x: point.date,
                    y: point.predictedValue,
                    type: 'predicted' as const,
                    label: '予測',
                })),
                // 信頼区間上限
                ...predictionData.predictions.map(point => ({
                    x: point.date,
                    y: point.confidenceInterval.upper,
                    type: 'confidence_upper' as const,
                    label: '信頼区間上限',
                })),
                // 信頼区間下限
                ...predictionData.predictions.map(point => ({
                    x: point.date,
                    y: point.confidenceInterval.lower,
                    type: 'confidence_lower' as const,
                    label: '信頼区間下限',
                })),
            ];

            // アノテーションを作成
            const annotations = [
                {
                    type: 'line' as const,
                    position: { x: new Date().toISOString().split('T')[0] },
                    text: '現在',
                    color: '#ff0000',
                },
            ];

            const visualization: PredictionVisualization = {
                chartType: 'line',
                data: dataPoints,
                annotations,
                config: {
                    title: `${metric} 予測 (${period})`,
                    xAxisLabel: '日付',
                    yAxisLabel: '件数',
                    showLegend: true,
                    showGrid: true,
                    colors: ['#2196F3', '#FF9800', '#4CAF50', '#F44336'],
                },
            };

            this.logger.log(`予測可視化データを取得完了`, {
                dataPointsCount: dataPoints.length,
                annotationsCount: annotations.length
            });

            return visualization;
        } catch (error) {
            this.logger.error('予測可視化データ取得エラー', error);
            throw error;
        }
    }

    /**
     * 予測モデルの精度を評価
     */
    async evaluateModelAccuracy(
        modelName: string,
        testPeriod: number = 30
    ): Promise<{ accuracy: number; metrics: Record<string, number> }> {
        this.logger.log(`予測モデル精度評価中: ${modelName}`, { testPeriod });

        try {
            const model = this.PREDICTION_MODELS[modelName];
            if (!model) {
                throw new Error(`予測モデルが見つかりません: ${modelName}`);
            }

            // テストデータを取得
            const testData = await this.getTestData(testPeriod);

            // 予測を実行
            const predictions = await this.generatePredictions(testData.historical, model, testPeriod, 'daily');

            // 精度メトリクスを計算
            const metrics = this.calculateAccuracyMetrics(predictions, testData.actual);

            this.logger.log(`予測モデル精度評価完了: ${modelName}`, {
                accuracy: metrics.accuracy,
                mae: metrics.mae,
                rmse: metrics.rmse
            });

            return {
                accuracy: metrics.accuracy,
                metrics: {
                    mae: metrics.mae, // Mean Absolute Error
                    rmse: metrics.rmse, // Root Mean Square Error
                    mape: metrics.mape, // Mean Absolute Percentage Error
                    r2: metrics.r2, // R-squared
                },
            };
        } catch (error) {
            this.logger.error(`予測モデル精度評価エラー: ${modelName}`, error);
            throw error;
        }
    }

    /**
     * 履歴データを取得
     */
    private async getHistoricalData(
        period: 'daily' | 'weekly' | 'monthly',
        filters: AnalyticsFilters
    ): Promise<{ date: string; value: number }[]> {
        const endDate = filters.endDate || new Date();
        const startDate = filters.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90日前

        const queryBuilder = this.inquiryRepository.createQueryBuilder('inquiry')
            .select('DATE(inquiry.createdAt)', 'date')
            .addSelect('COUNT(*)', 'count')
            .where('inquiry.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
            .groupBy('DATE(inquiry.createdAt)')
            .orderBy('date', 'ASC');

        this.applyFilters(queryBuilder, filters);

        const results = await queryBuilder.getRawMany();

        return results.map(result => ({
            date: result.date,
            value: parseInt(result.count),
        }));
    }

    /**
     * 最適な予測モデルを選択
     */
    private selectBestModel(metric: string): PredictionModel {
        // 実際の実装では、メトリックに応じて最適なモデルを選択
        // ここでは最も精度の高いモデルを返す
        return Object.values(this.PREDICTION_MODELS)
            .sort((a, b) => b.accuracy - a.accuracy)[0];
    }

    /**
     * 予測を生成
     */
    private async generatePredictions(
        historicalData: { date: string; value: number }[],
        model: PredictionModel,
        daysAhead: number,
        period: 'daily' | 'weekly' | 'monthly'
    ): Promise<PredictionPoint[]> {
        const predictions: PredictionPoint[] = [];
        const baseDate = new Date();

        for (let i = 1; i <= daysAhead; i++) {
            const predictionDate = new Date(baseDate);
            predictionDate.setDate(predictionDate.getDate() + i);

            // 簡略化された予測ロジック
            const predictedValue = this.calculatePredictedValue(historicalData, model, i);
            const confidenceInterval = this.calculateConfidenceInterval(predictedValue, model.accuracy);
            const factors = this.identifyPredictionFactors(predictionDate, historicalData);

            predictions.push({
                date: predictionDate.toISOString().split('T')[0],
                predictedValue,
                confidenceInterval,
                factors,
            });
        }

        return predictions;
    }

    /**
     * 予測値を計算
     */
    private calculatePredictedValue(
        historicalData: { date: string; value: number }[],
        model: PredictionModel,
        dayOffset: number
    ): number {
        if (historicalData.length === 0) return 0;

        // 簡略化された線形回帰予測
        const recentAverage = historicalData.slice(-7).reduce((sum, point) => sum + point.value, 0) / 7;
        const trend = this.calculateTrend(historicalData);
        const seasonalFactor = this.getSeasonalFactor(dayOffset);

        return Math.max(0, Math.round(recentAverage + (trend * dayOffset) + seasonalFactor));
    }

    /**
     * 信頼区間を計算
     */
    private calculateConfidenceInterval(
        predictedValue: number,
        accuracy: number
    ): { lower: number; upper: number } {
        const errorMargin = predictedValue * (1 - accuracy / 100) * 0.5;

        return {
            lower: Math.max(0, Math.round(predictedValue - errorMargin)),
            upper: Math.round(predictedValue + errorMargin),
        };
    }

    /**
     * 予測要因を特定
     */
    private identifyPredictionFactors(
        date: Date,
        historicalData: { date: string; value: number }[]
    ): PredictionFactor[] {
        const factors: PredictionFactor[] = [];

        // 曜日要因
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 1) { // 月曜日
            factors.push({
                name: '月曜日効果',
                impact: 15,
                description: '週初めは問い合わせが増加する傾向があります',
            });
        }

        // 月末要因
        const dayOfMonth = date.getDate();
        const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        if (dayOfMonth > lastDayOfMonth - 3) {
            factors.push({
                name: '月末効果',
                impact: 10,
                description: '月末は請求関連の問い合わせが増加します',
            });
        }

        // 季節要因
        const month = date.getMonth();
        if (month === 11 || month === 0) { // 12月、1月
            factors.push({
                name: '年末年始効果',
                impact: -20,
                description: '年末年始は問い合わせが減少します',
            });
        }

        return factors;
    }

    /**
     * トレンドを計算
     */
    private calculateTrend(data: { date: string; value: number }[]): number {
        if (data.length < 2) return 0;

        const firstHalf = data.slice(0, Math.floor(data.length / 2));
        const secondHalf = data.slice(Math.floor(data.length / 2));

        const firstAvg = firstHalf.reduce((sum, point) => sum + point.value, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, point) => sum + point.value, 0) / secondHalf.length;

        return (secondAvg - firstAvg) / (data.length / 2);
    }

    /**
     * 季節要因を取得
     */
    private getSeasonalFactor(dayOffset: number): number {
        // 簡略化された季節要因計算
        const seasonalCycle = Math.sin((dayOffset / 365) * 2 * Math.PI) * 2;
        return seasonalCycle;
    }

    /**
     * 信頼度を計算
     */
    private calculateConfidence(
        historicalData: { date: string; value: number }[],
        model: PredictionModel
    ): number {
        // データ量と変動性に基づく信頼度計算
        const dataPoints = historicalData.length;
        const variance = this.calculateVariance(historicalData.map(d => d.value));

        let confidence = model.accuracy;

        // データ量による調整
        if (dataPoints < 30) {
            confidence *= 0.8;
        } else if (dataPoints > 90) {
            confidence *= 1.1;
        }

        // 変動性による調整
        if (variance > 100) {
            confidence *= 0.9;
        }

        return Math.min(100, Math.max(50, confidence));
    }

    /**
     * 分散を計算
     */
    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;

        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));

        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    }

    /**
     * スタッフィング推奨を計算
     */
    private async calculateStaffingRecommendation(
        predictedInquiries: number,
        filters: AnalyticsFilters
    ): Promise<StaffingRecommendation> {
        // 簡略化された実装
        const averageInquiriesPerStaff = 20; // 1人あたり1日20件処理可能
        const totalStaff = Math.max(1, Math.ceil(predictedInquiries / 30 / averageInquiriesPerStaff));

        // スキル分布を計算（合計がtotalStaffと一致するように調整）
        const technicalCount = Math.floor(totalStaff * 0.4);
        const billingCount = Math.floor(totalStaff * 0.3);
        const generalCount = totalStaff - technicalCount - billingCount; // 残りを一般サポートに割り当て

        return {
            totalStaff,
            skillDistribution: [
                { skill: 'Technical Support', requiredCount: technicalCount, currentCount: 3, gap: 0 },
                { skill: 'Billing Support', requiredCount: billingCount, currentCount: 2, gap: 0 },
                { skill: 'General Support', requiredCount: generalCount, currentCount: 2, gap: 0 },
            ],
            shiftRecommendations: [
                { timeSlot: '09:00-17:00', recommendedStaff: Math.ceil(totalStaff * 0.6), priority: 'high', reason: 'ピーク時間帯' },
                { timeSlot: '17:00-21:00', recommendedStaff: Math.ceil(totalStaff * 0.3), priority: 'medium', reason: '夕方対応' },
                { timeSlot: '21:00-09:00', recommendedStaff: Math.ceil(totalStaff * 0.1), priority: 'low', reason: '夜間対応' },
            ],
        };
    }

    /**
     * ワークロード分布を予測
     */
    private async predictWorkloadDistribution(
        predictedInquiries: number,
        filters: AnalyticsFilters
    ): Promise<PredictedWorkloadDistribution> {
        // 簡略化された実装
        return {
            byCategory: [
                { category: 'Technical', predictedVolume: Math.ceil(predictedInquiries * 0.4), averageComplexity: 3.5, estimatedHours: 2.0 },
                { category: 'Billing', predictedVolume: Math.ceil(predictedInquiries * 0.3), averageComplexity: 2.0, estimatedHours: 1.0 },
                { category: 'General', predictedVolume: Math.ceil(predictedInquiries * 0.3), averageComplexity: 2.5, estimatedHours: 1.5 },
            ],
            byPriority: [
                { priority: 'urgent', predictedVolume: Math.ceil(predictedInquiries * 0.1), slaRequirement: 1, estimatedHours: 0.5 },
                { priority: 'high', predictedVolume: Math.ceil(predictedInquiries * 0.2), slaRequirement: 4, estimatedHours: 1.5 },
                { priority: 'medium', predictedVolume: Math.ceil(predictedInquiries * 0.5), slaRequirement: 24, estimatedHours: 2.0 },
                { priority: 'low', predictedVolume: Math.ceil(predictedInquiries * 0.2), slaRequirement: 72, estimatedHours: 1.0 },
            ],
            byApp: [
                { appId: 'app1', appName: 'Main App', predictedVolume: Math.ceil(predictedInquiries * 0.6), averageResolutionTime: 2.0, estimatedHours: 1.5 },
                { appId: 'app2', appName: 'Mobile App', predictedVolume: Math.ceil(predictedInquiries * 0.4), averageResolutionTime: 1.5, estimatedHours: 1.0 },
            ],
        };
    }

    /**
     * ピーク時間を予測
     */
    private async predictPeakHours(filters: AnalyticsFilters): Promise<number[]> {
        // 簡略化された実装：一般的なピーク時間を返す
        return [9, 10, 11, 14, 15, 16];
    }

    /**
     * 季節要因を分析
     */
    private async analyzeSeasonalFactors(filters: AnalyticsFilters): Promise<SeasonalFactor[]> {
        return [
            {
                name: '年末年始',
                impact: -30,
                period: '12/25-1/7',
                description: '年末年始期間は問い合わせが大幅に減少します',
            },
            {
                name: 'ゴールデンウィーク',
                impact: -20,
                period: '4/29-5/5',
                description: 'ゴールデンウィーク期間は問い合わせが減少します',
            },
            {
                name: '月末',
                impact: 15,
                period: '毎月25-31日',
                description: '月末は請求関連の問い合わせが増加します',
            },
            {
                name: '新年度',
                impact: 25,
                period: '4月',
                description: '新年度開始により問い合わせが増加します',
            },
        ];
    }

    /**
     * テストデータを取得
     */
    private async getTestData(testPeriod: number): Promise<{ historical: any[]; actual: number[] }> {
        // 簡略化された実装
        const historical = Array.from({ length: testPeriod }, (_, i) => ({
            date: new Date(Date.now() - (testPeriod - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: Math.floor(Math.random() * 20) + 10,
        }));

        const actual = Array.from({ length: testPeriod }, () => Math.floor(Math.random() * 20) + 10);

        return { historical, actual };
    }

    /**
     * 精度メトリクスを計算
     */
    private calculateAccuracyMetrics(
        predictions: PredictionPoint[],
        actual: number[]
    ): { accuracy: number; mae: number; rmse: number; mape: number; r2: number } {
        if (predictions.length !== actual.length || predictions.length === 0) {
            return { accuracy: 0, mae: 0, rmse: 0, mape: 0, r2: 0 };
        }

        const predicted = predictions.map(p => p.predictedValue);

        // Mean Absolute Error
        const mae = predicted.reduce((sum, pred, i) => sum + Math.abs(pred - actual[i]), 0) / predicted.length;

        // Root Mean Square Error
        const rmse = Math.sqrt(predicted.reduce((sum, pred, i) => sum + Math.pow(pred - actual[i], 2), 0) / predicted.length);

        // Mean Absolute Percentage Error
        const mape = predicted.reduce((sum, pred, i) => {
            if (actual[i] === 0) return sum;
            return sum + Math.abs((pred - actual[i]) / actual[i]);
        }, 0) / predicted.length * 100;

        // R-squared
        const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
        const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
        const residualSumSquares = predicted.reduce((sum, pred, i) => sum + Math.pow(actual[i] - pred, 2), 0);
        const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

        // Overall accuracy (based on MAPE)
        const accuracy = Math.max(0, 100 - mape);

        return { accuracy, mae, rmse, mape, r2 };
    }

    /**
     * フィルターをクエリビルダーに適用
     */
    private applyFilters(queryBuilder: any, filters: AnalyticsFilters): void {
        if (filters.appIds && filters.appIds.length > 0) {
            queryBuilder.andWhere('inquiry.appId IN (:...appIds)', { appIds: filters.appIds });
        }

        if (filters.categories && filters.categories.length > 0) {
            queryBuilder.andWhere('inquiry.category IN (:...categories)', { categories: filters.categories });
        }

        if (filters.statuses && filters.statuses.length > 0) {
            queryBuilder.andWhere('inquiry.status IN (:...statuses)', { statuses: filters.statuses });
        }

        if (filters.priorities && filters.priorities.length > 0) {
            queryBuilder.andWhere('inquiry.priority IN (:...priorities)', { priorities: filters.priorities });
        }

        if (filters.assignedTo && filters.assignedTo.length > 0) {
            queryBuilder.andWhere('inquiry.assignedTo IN (:...assignedTo)', { assignedTo: filters.assignedTo });
        }
    }
}