import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Logger,
    HttpStatus,
    HttpCode
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../users/guards/roles.guard';
import { Roles } from '../../users/decorators/roles.decorator';
import { PredictionService } from '../services/prediction.service';
import { AnalyticsFiltersDto } from '../dto/analytics.dto';
import { ApiSuccessResponseDto } from '../../../common/dto/api-response.dto';

/**
 * 予測分析コントローラー
 * 機械学習による問い合わせ量予測、リソース需要予測、予測結果の可視化APIエンドポイントを提供
 */
@ApiTags('Prediction Analytics')
@Controller('analytics/predictions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PredictionController {
    private readonly logger = new Logger(PredictionController.name);

    constructor(private readonly predictionService: PredictionService) { }

    /**
     * 問い合わせ量予測を取得
     */
    @Get('inquiry-volume')
    @Roles('admin', 'support')
    @ApiOperation({
        summary: '問い合わせ量予測取得',
        description: '機械学習モデルを使用して将来の問い合わせ量を予測'
    })
    @ApiQuery({
        name: 'period',
        required: false,
        description: '予測期間',
        enum: ['daily', 'weekly', 'monthly']
    })
    @ApiQuery({
        name: 'daysAhead',
        required: false,
        description: '予測日数',
        type: Number
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '問い合わせ量予測取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getInquiryVolumePrediction(
        @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
        @Query('daysAhead') daysAhead: number = 30,
        @Query() filters: AnalyticsFiltersDto
    ): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log(`問い合わせ量予測取得リクエスト: ${period}, ${daysAhead}日先`, { filters });

        try {
            const analyticsFilters = {
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate) : undefined,
                appIds: filters.appIds,
                categories: filters.categories,
                statuses: filters.statuses,
                priorities: filters.priorities,
                assignedTo: filters.assignedTo,
            };

            const prediction = await this.predictionService.getInquiryVolumePrediction(
                period,
                daysAhead,
                analyticsFilters
            );

            this.logger.log(`問い合わせ量予測取得成功`, {
                predictionsCount: prediction.predictions.length,
                confidence: prediction.confidence,
                model: prediction.model
            });

            return {
                success: true,
                data: prediction,
                message: '問い合わせ量予測を取得しました',
            };
        } catch (error) {
            this.logger.error('問い合わせ量予測取得エラー', error);
            throw error;
        }
    }

    /**
     * リソース需要予測を取得
     */
    @Get('resource-demand')
    @Roles('admin', 'support')
    @ApiOperation({
        summary: 'リソース需要予測取得',
        description: '予測問い合わせ量に基づくスタッフィング推奨とワークロード分布を取得'
    })
    @ApiQuery({
        name: 'period',
        required: false,
        description: '予測期間',
        default: 'next_month'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'リソース需要予測取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getResourceDemandPrediction(
        @Query('period') period: string = 'next_month',
        @Query() filters: AnalyticsFiltersDto
    ): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log(`リソース需要予測取得リクエスト: ${period}`, { filters });

        try {
            const analyticsFilters = {
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate) : undefined,
                appIds: filters.appIds,
                categories: filters.categories,
                statuses: filters.statuses,
                priorities: filters.priorities,
                assignedTo: filters.assignedTo,
            };

            const resourceDemand = await this.predictionService.getResourceDemandPrediction(
                period,
                analyticsFilters
            );

            this.logger.log(`リソース需要予測取得成功`, {
                predictedInquiries: resourceDemand.predictedInquiries,
                recommendedStaff: resourceDemand.recommendedStaffing.totalStaff
            });

            return {
                success: true,
                data: resourceDemand,
                message: 'リソース需要予測を取得しました',
            };
        } catch (error) {
            this.logger.error('リソース需要予測取得エラー', error);
            throw error;
        }
    }

    /**
     * 予測結果の可視化データを取得
     */
    @Get('visualization/:metric')
    @Roles('admin', 'support', 'viewer')
    @ApiOperation({
        summary: '予測可視化データ取得',
        description: '予測結果をグラフ表示するための可視化データを取得'
    })
    @ApiParam({
        name: 'metric',
        description: '予測メトリック',
        example: 'inquiry_volume'
    })
    @ApiQuery({
        name: 'period',
        required: false,
        description: '予測期間',
        enum: ['daily', 'weekly', 'monthly']
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '予測可視化データ取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getPredictionVisualization(
        @Param('metric') metric: string,
        @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
        @Query() filters: AnalyticsFiltersDto
    ): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log(`予測可視化データ取得リクエスト: ${metric} (${period})`, { filters });

        try {
            const analyticsFilters = {
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate) : undefined,
                appIds: filters.appIds,
                categories: filters.categories,
                statuses: filters.statuses,
                priorities: filters.priorities,
                assignedTo: filters.assignedTo,
            };

            const visualization = await this.predictionService.getPredictionVisualization(
                metric,
                period,
                analyticsFilters
            );

            this.logger.log(`予測可視化データ取得成功: ${metric}`, {
                dataPointsCount: visualization.data.length,
                chartType: visualization.chartType
            });

            return {
                success: true,
                data: visualization,
                message: `${metric}の予測可視化データを取得しました`,
            };
        } catch (error) {
            this.logger.error(`予測可視化データ取得エラー: ${metric}`, error);
            throw error;
        }
    }

    /**
     * 予測モデルの精度評価を取得
     */
    @Get('models/:modelName/accuracy')
    @Roles('admin')
    @ApiOperation({
        summary: '予測モデル精度評価取得',
        description: '指定された予測モデルの精度評価とメトリクスを取得'
    })
    @ApiParam({
        name: 'modelName',
        description: '予測モデル名',
        enum: ['linear_regression', 'time_series', 'machine_learning']
    })
    @ApiQuery({
        name: 'testPeriod',
        required: false,
        description: 'テスト期間（日数）',
        type: Number
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '予測モデル精度評価取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getModelAccuracy(
        @Param('modelName') modelName: string,
        @Query('testPeriod') testPeriod: number = 30
    ): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log(`予測モデル精度評価取得リクエスト: ${modelName}`, { testPeriod });

        try {
            const evaluation = await this.predictionService.evaluateModelAccuracy(modelName, testPeriod);

            this.logger.log(`予測モデル精度評価取得成功: ${modelName}`, {
                accuracy: evaluation.accuracy,
                mae: evaluation.metrics.mae
            });

            return {
                success: true,
                data: evaluation,
                message: `${modelName}の精度評価を取得しました`,
            };
        } catch (error) {
            this.logger.error(`予測モデル精度評価取得エラー: ${modelName}`, error);
            throw error;
        }
    }

    /**
     * 季節要因分析を取得
     */
    @Get('seasonal-factors')
    @Roles('admin', 'support')
    @ApiOperation({
        summary: '季節要因分析取得',
        description: '問い合わせ量に影響する季節要因とその影響度を分析'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '季節要因分析取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getSeasonalFactors(@Query() filters: AnalyticsFiltersDto): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('季節要因分析取得リクエスト', { filters });

        try {
            // リソース需要予測から季節要因を取得
            const analyticsFilters = {
                startDate: filters.startDate ? new Date(filters.startDate) : undefined,
                endDate: filters.endDate ? new Date(filters.endDate) : undefined,
                appIds: filters.appIds,
                categories: filters.categories,
                statuses: filters.statuses,
                priorities: filters.priorities,
                assignedTo: filters.assignedTo,
            };

            const resourceDemand = await this.predictionService.getResourceDemandPrediction(
                'next_year',
                analyticsFilters
            );

            const seasonalAnalysis = {
                factors: resourceDemand.seasonalFactors,
                summary: {
                    totalFactors: resourceDemand.seasonalFactors.length,
                    positiveImpacts: resourceDemand.seasonalFactors.filter(f => f.impact > 0).length,
                    negativeImpacts: resourceDemand.seasonalFactors.filter(f => f.impact < 0).length,
                    maxPositiveImpact: Math.max(...resourceDemand.seasonalFactors.map(f => f.impact)),
                    maxNegativeImpact: Math.min(...resourceDemand.seasonalFactors.map(f => f.impact)),
                },
                recommendations: this.generateSeasonalRecommendations(resourceDemand.seasonalFactors),
            };

            this.logger.log('季節要因分析取得成功', {
                factorsCount: seasonalAnalysis.factors.length
            });

            return {
                success: true,
                data: seasonalAnalysis,
                message: '季節要因分析を取得しました',
            };
        } catch (error) {
            this.logger.error('季節要因分析取得エラー', error);
            throw error;
        }
    }

    /**
     * 予測精度の比較分析を取得
     */
    @Get('models/comparison')
    @Roles('admin')
    @ApiOperation({
        summary: '予測モデル比較分析取得',
        description: '複数の予測モデルの精度を比較分析'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '予測モデル比較分析取得成功',
    })
    @HttpCode(HttpStatus.OK)
    async getModelComparison(): Promise<ApiSuccessResponseDto<any>> {
        this.logger.log('予測モデル比較分析取得リクエスト');

        try {
            const models = ['linear_regression', 'time_series', 'machine_learning'];
            const comparisons = await Promise.all(
                models.map(async (model) => {
                    try {
                        const evaluation = await this.predictionService.evaluateModelAccuracy(model, 30);
                        return {
                            model,
                            ...evaluation,
                        };
                    } catch (error) {
                        this.logger.warn(`モデル評価エラー: ${model}`, error);
                        return {
                            model,
                            accuracy: 0,
                            metrics: { mae: 0, rmse: 0, mape: 0, r2: 0 },
                        };
                    }
                })
            );

            const bestModel = comparisons.reduce((best, current) =>
                current.accuracy > best.accuracy ? current : best
            );

            const comparison = {
                models: comparisons,
                bestModel: bestModel.model,
                summary: {
                    averageAccuracy: comparisons.reduce((sum, comp) => sum + comp.accuracy, 0) / comparisons.length,
                    accuracyRange: {
                        min: Math.min(...comparisons.map(comp => comp.accuracy)),
                        max: Math.max(...comparisons.map(comp => comp.accuracy)),
                    },
                },
                recommendations: this.generateModelRecommendations(comparisons),
            };

            this.logger.log('予測モデル比較分析取得成功', {
                modelsCount: comparisons.length,
                bestModel: bestModel.model
            });

            return {
                success: true,
                data: comparison,
                message: '予測モデル比較分析を取得しました',
            };
        } catch (error) {
            this.logger.error('予測モデル比較分析取得エラー', error);
            throw error;
        }
    }

    /**
     * 季節要因に基づく推奨事項を生成
     */
    private generateSeasonalRecommendations(factors: any[]): string[] {
        const recommendations: string[] = [];

        factors.forEach(factor => {
            if (factor.impact > 20) {
                recommendations.push(`${factor.name}期間中は${factor.impact}%の増加が予想されるため、事前にスタッフを増員してください。`);
            } else if (factor.impact < -20) {
                recommendations.push(`${factor.name}期間中は${Math.abs(factor.impact)}%の減少が予想されるため、リソースの再配分を検討してください。`);
            }
        });

        if (recommendations.length === 0) {
            recommendations.push('現在の季節要因は比較的安定しており、大きな調整は不要です。');
        }

        return recommendations;
    }

    /**
     * モデル比較に基づく推奨事項を生成
     */
    private generateModelRecommendations(comparisons: any[]): string[] {
        const recommendations: string[] = [];
        const bestModel = comparisons.reduce((best, current) =>
            current.accuracy > best.accuracy ? current : best
        );

        recommendations.push(`最も精度の高い${bestModel.model}モデル（精度: ${bestModel.accuracy.toFixed(1)}%）の使用を推奨します。`);

        const lowAccuracyModels = comparisons.filter(comp => comp.accuracy < 80);
        if (lowAccuracyModels.length > 0) {
            recommendations.push(`精度が80%を下回るモデル（${lowAccuracyModels.map(m => m.model).join(', ')}）の再トレーニングを検討してください。`);
        }

        const accuracyVariance = Math.max(...comparisons.map(comp => comp.accuracy)) -
            Math.min(...comparisons.map(comp => comp.accuracy));
        if (accuracyVariance > 20) {
            recommendations.push('モデル間の精度差が大きいため、アンサンブル手法の導入を検討してください。');
        }

        return recommendations;
    }
}