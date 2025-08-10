/**
 * 予測分析コントローラー
 * 要件: 9.3 (予測分析機能の実装)
 */

import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseGuards, 
  Logger,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { PredictionService, PredictionRequestDto, PredictionAnalysisDto } from '../services/prediction.service';
import { AnalyticsFiltersDto, DateRangeDto } from '../dto/analytics.dto';
import { BaseResponseDto } from '../dto/base-response.dto';

/**
 * 予測分析リクエスト用DTO
 */
export class CreatePredictionRequestDto {
  metric: 'inquiry_volume' | 'response_time' | 'resource_demand';
  startDate: string;
  endDate: string;
  forecastDays: number;
  granularity: 'hourly' | 'daily' | 'weekly';
  appId?: string;
  appIds?: string[];
  categories?: string[];
}

/**
 * 予測分析可視化データDTO
 */
export class PredictionVisualizationDto {
  chartType: 'line' | 'bar' | 'area';
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  datasets: PredictionDatasetDto[];
  annotations?: PredictionAnnotationDto[];
}

export class PredictionDatasetDto {
  label: string;
  data: { x: string; y: number }[];
  color: string;
  type: 'historical' | 'forecast' | 'confidence';
}

export class PredictionAnnotationDto {
  type: 'line' | 'area' | 'point';
  value: any;
  label: string;
  color: string;
}

@ApiTags('予測分析')
@Controller('prediction')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PredictionController {
  private readonly logger = new Logger(PredictionController.name);

  constructor(private readonly predictionService: PredictionService) {}

  /**
   * 問い合わせ量予測を実行
   * 要件: 9.3 (機械学習による問い合わせ量予測)
   */
  @Post('inquiry-volume')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: '問い合わせ量予測' })
  @ApiResponse({ 
    status: 200, 
    description: '予測分析結果',
    type: BaseResponseDto
  })
  async predictInquiryVolume(
    @Body() request: CreatePredictionRequestDto
  ): Promise<BaseResponseDto<PredictionAnalysisDto>> {
    this.logger.log('問い合わせ量予測リクエスト受信');

    try {
      // リクエスト検証
      this.validatePredictionRequest(request);

      const predictionRequest: PredictionRequestDto = {
        metric: 'inquiry_volume',
        period: {
          startDate: request.startDate,
          endDate: request.endDate
        },
        forecastDays: request.forecastDays,
        granularity: request.granularity,
        filters: {
          appId: request.appId,
          appIds: request.appIds,
          categories: request.categories
        }
      };

      const result = await this.predictionService.predictInquiryVolume(predictionRequest);

      return {
        success: true,
        data: result,
        message: '問い合わせ量予測が完了しました',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('問い合わせ量予測エラー', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * リソース需要予測を実行
   * 要件: 9.3 (リソース需要予測機能)
   */
  @Post('resource-demand')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'リソース需要予測' })
  @ApiResponse({ 
    status: 200, 
    description: 'リソース需要予測結果',
    type: BaseResponseDto
  })
  async predictResourceDemand(
    @Body() request: CreatePredictionRequestDto
  ): Promise<BaseResponseDto<PredictionAnalysisDto>> {
    this.logger.log('リソース需要予測リクエスト受信');

    try {
      // リクエスト検証
      this.validatePredictionRequest(request);

      const predictionRequest: PredictionRequestDto = {
        metric: 'resource_demand',
        period: {
          startDate: request.startDate,
          endDate: request.endDate
        },
        forecastDays: request.forecastDays,
        granularity: request.granularity,
        filters: {
          appId: request.appId,
          appIds: request.appIds,
          categories: request.categories
        }
      };

      const result = await this.predictionService.predictResourceDemand(predictionRequest);

      return {
        success: true,
        data: result,
        message: 'リソース需要予測が完了しました',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('リソース需要予測エラー', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 予測結果の可視化データを取得
   * 要件: 9.3 (予測結果の可視化機能)
   */
  @Get('visualization')
  @Roles('admin', 'manager', 'analyst', 'support')
  @ApiOperation({ summary: '予測結果可視化データ取得' })
  @ApiResponse({ 
    status: 200, 
    description: '可視化データ',
    type: BaseResponseDto
  })
  async getPredictionVisualization(
    @Query('metric') metric: 'inquiry_volume' | 'resource_demand',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('forecastDays') forecastDays: string,
    @Query('granularity') granularity: 'daily' | 'weekly' = 'daily',
    @Query('appId') appId?: string
  ): Promise<BaseResponseDto<PredictionVisualizationDto[]>> {
    this.logger.log('予測可視化データ取得リクエスト受信');

    try {
      const request: CreatePredictionRequestDto = {
        metric,
        startDate,
        endDate,
        forecastDays: parseInt(forecastDays),
        granularity,
        appId
      };

      // 予測分析実行
      let predictionResult: PredictionAnalysisDto;
      
      if (metric === 'inquiry_volume') {
        const predictionRequest: PredictionRequestDto = {
          metric: 'inquiry_volume',
          period: { startDate, endDate },
          forecastDays: parseInt(forecastDays),
          granularity,
          filters: { appId }
        };
        predictionResult = await this.predictionService.predictInquiryVolume(predictionRequest);
      } else {
        const predictionRequest: PredictionRequestDto = {
          metric: 'resource_demand',
          period: { startDate, endDate },
          forecastDays: parseInt(forecastDays),
          granularity,
          filters: { appId }
        };
        predictionResult = await this.predictionService.predictResourceDemand(predictionRequest);
      }

      // 可視化データ生成
      const visualizations = this.generateVisualizationData(predictionResult, metric);

      return {
        success: true,
        data: visualizations,
        message: '可視化データを取得しました',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('予測可視化データ取得エラー', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 予測精度レポートを取得
   */
  @Get('accuracy-report')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: '予測精度レポート取得' })
  @ApiResponse({ 
    status: 200, 
    description: '予測精度レポート',
    type: BaseResponseDto
  })
  async getPredictionAccuracyReport(
    @Query('days') days: string = '30'
  ): Promise<BaseResponseDto<any>> {
    this.logger.log('予測精度レポート取得リクエスト受信');

    try {
      const daysNum = parseInt(days);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysNum * 24 * 60 * 60 * 1000);

      // 複数の予測を実行して精度を評価
      const volumePrediction = await this.predictionService.predictInquiryVolume({
        metric: 'inquiry_volume',
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        forecastDays: 7,
        granularity: 'daily'
      });

      const resourcePrediction = await this.predictionService.predictResourceDemand({
        metric: 'resource_demand',
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        forecastDays: 7,
        granularity: 'daily'
      });

      const accuracyReport = {
        period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        volumePredictionAccuracy: volumePrediction.accuracy,
        resourcePredictionAccuracy: resourcePrediction.accuracy,
        overallAccuracy: (volumePrediction.accuracy + resourcePrediction.accuracy) / 2,
        recommendations: [
          ...volumePrediction.recommendations,
          ...resourcePrediction.recommendations
        ].slice(0, 5), // 上位5件の推奨事項
        lastUpdated: new Date().toISOString()
      };

      return {
        success: true,
        data: accuracyReport,
        message: '予測精度レポートを取得しました',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('予測精度レポート取得エラー', error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * リクエスト検証
   */
  private validatePredictionRequest(request: CreatePredictionRequestDto): void {
    if (!request.startDate || !request.endDate) {
      throw new BadRequestException('開始日と終了日は必須です');
    }

    if (!request.forecastDays || request.forecastDays < 1 || request.forecastDays > 90) {
      throw new BadRequestException('予測日数は1-90日の範囲で指定してください');
    }

    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('開始日は終了日より前である必要があります');
    }

    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) {
      throw new BadRequestException('予測には最低7日間の履歴データが必要です');
    }

    if (daysDiff > 365) {
      throw new BadRequestException('履歴期間は最大365日までです');
    }
  }

  /**
   * 可視化データを生成
   * 要件: 9.3 (予測結果の可視化機能)
   */
  private generateVisualizationData(
    predictionResult: PredictionAnalysisDto, 
    metric: string
  ): PredictionVisualizationDto[] {
    const visualizations: PredictionVisualizationDto[] = [];

    // メイン予測チャート
    const mainChart: PredictionVisualizationDto = {
      chartType: 'line',
      title: metric === 'inquiry_volume' ? '問い合わせ量予測' : 'リソース需要予測',
      xAxisLabel: '日付',
      yAxisLabel: metric === 'inquiry_volume' ? '問い合わせ件数' : '必要スタッフ数',
      datasets: [
        {
          label: '予測値',
          data: predictionResult.forecast.map(f => ({
            x: f.timestamp,
            y: f.predictedValue
          })),
          color: '#3B82F6',
          type: 'forecast'
        }
      ],
      annotations: []
    };

    // 信頼区間の追加
    if (predictionResult.forecast.length > 0) {
      const confidenceData = predictionResult.forecast.map(f => ({
        x: f.timestamp,
        y: f.confidenceLevel * 100
      }));

      mainChart.datasets.push({
        label: '信頼度 (%)',
        data: confidenceData,
        color: '#10B981',
        type: 'confidence'
      });
    }

    visualizations.push(mainChart);

    // リソース需要の場合、追加チャートを生成
    if (metric === 'resource_demand' && predictionResult.resourceDemand) {
      // スタッフ需要チャート
      const staffChart: PredictionVisualizationDto = {
        chartType: 'bar',
        title: '推奨スタッフ数',
        xAxisLabel: '日付',
        yAxisLabel: 'スタッフ数',
        datasets: [
          {
            label: '推奨スタッフ数',
            data: predictionResult.resourceDemand.map(r => ({
              x: r.date,
              y: r.recommendedStaffCount
            })),
            color: '#F59E0B',
            type: 'forecast'
          }
        ]
      };

      visualizations.push(staffChart);

      // 作業時間予測チャート
      const workloadChart: PredictionVisualizationDto = {
        chartType: 'area',
        title: '予想作業時間',
        xAxisLabel: '日付',
        yAxisLabel: '作業時間 (時間)',
        datasets: [
          {
            label: '予想作業時間',
            data: predictionResult.resourceDemand.map(r => ({
              x: r.date,
              y: r.expectedWorkloadHours
            })),
            color: '#EF4444',
            type: 'forecast'
          }
        ],
        annotations: [
          {
            type: 'line',
            value: 80, // 標準作業時間の上限
            label: '標準容量上限',
            color: '#DC2626'
          }
        ]
      };

      visualizations.push(workloadChart);

      // リスクレベル分布
      const riskDistribution = this.calculateRiskDistribution(predictionResult.resourceDemand);
      const riskChart: PredictionVisualizationDto = {
        chartType: 'bar',
        title: 'リスクレベル分布',
        xAxisLabel: 'リスクレベル',
        yAxisLabel: '日数',
        datasets: [
          {
            label: 'リスクレベル別日数',
            data: [
              { x: '低', y: riskDistribution.low },
              { x: '中', y: riskDistribution.medium },
              { x: '高', y: riskDistribution.high }
            ],
            color: '#8B5CF6',
            type: 'forecast'
          }
        ]
      };

      visualizations.push(riskChart);
    }

    return visualizations;
  }

  /**
   * リスクレベル分布を計算
   */
  private calculateRiskDistribution(resourceDemand: any[]): { low: number; medium: number; high: number } {
    const distribution = { low: 0, medium: 0, high: 0 };

    resourceDemand.forEach(r => {
      distribution[r.riskLevel]++;
    });

    return distribution;
  }
}