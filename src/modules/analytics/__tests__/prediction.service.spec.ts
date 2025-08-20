import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PredictionService } from '../services/prediction.service';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { User } from '../../users/entities/user.entity';
import { AnalyticsFilters } from '../types/analytics.types';

describe('PredictionService', () => {
    let service: PredictionService;
    let inquiryRepository: Repository<Inquiry>;
    let responseRepository: Repository<Response>;
    let userRepository: Repository<User>;

    const mockInquiryRepository = {
        createQueryBuilder: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockResponseRepository = {
        createQueryBuilder: jest.fn(),
        find: jest.fn(),
    };

    const mockUserRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PredictionService,
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: mockInquiryRepository,
                },
                {
                    provide: getRepositoryToken(Response),
                    useValue: mockResponseRepository,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<PredictionService>(PredictionService);
        inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
        responseRepository = module.get<Repository<Response>>(getRepositoryToken(Response));
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getInquiryVolumePrediction', () => {
        it('問い合わせ量予測を正しく取得できること', async () => {
            const mockHistoricalData = [
                { date: '2024-01-01', count: '10' },
                { date: '2024-01-02', count: '12' },
                { date: '2024-01-03', count: '8' },
                { date: '2024-01-04', count: '15' },
                { date: '2024-01-05', count: '11' },
            ];

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mockHistoricalData),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getInquiryVolumePrediction('daily', 7);

            expect(result).toBeDefined();
            expect(result.metric).toBe('inquiry_volume');
            expect(result.period).toBe('daily');
            expect(result.predictions).toHaveLength(7);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.model).toBeDefined();
            expect(result.accuracy).toBeGreaterThan(0);
            expect(result.lastUpdated).toBeInstanceOf(Date);

            // 各予測ポイントの構造を確認
            result.predictions.forEach(prediction => {
                expect(prediction.date).toBeDefined();
                expect(prediction.predictedValue).toBeGreaterThanOrEqual(0);
                expect(prediction.confidenceInterval).toBeDefined();
                expect(prediction.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
                expect(prediction.confidenceInterval.upper).toBeGreaterThanOrEqual(prediction.confidenceInterval.lower);
                expect(prediction.factors).toBeDefined();
            });
        });

        it('フィルターが正しく適用されること', async () => {
            const filters: AnalyticsFilters = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                appIds: ['app1'],
                categories: ['technical'],
            };

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            await service.getInquiryVolumePrediction('daily', 7, filters);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.appId IN (:...appIds)',
                { appIds: filters.appIds }
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inquiry.category IN (:...categories)',
                { categories: filters.categories }
            );
        });

        it('履歴データがない場合でも予測を生成できること', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getInquiryVolumePrediction('daily', 7);

            expect(result).toBeDefined();
            expect(result.predictions).toHaveLength(7);
            // 履歴データがない場合、予測値は0になる
            result.predictions.forEach(prediction => {
                expect(prediction.predictedValue).toBe(0);
            });
        });
    });

    describe('getResourceDemandPrediction', () => {
        it('リソース需要予測を正しく取得できること', async () => {
            const mockHistoricalData = [
                { date: '2024-01-01', count: '10' },
                { date: '2024-01-02', count: '12' },
                { date: '2024-01-03', count: '8' },
            ];

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mockHistoricalData),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getResourceDemandPrediction('next_month');

            expect(result).toBeDefined();
            expect(result.period).toBe('next_month');
            expect(result.predictedInquiries).toBeGreaterThanOrEqual(0);
            expect(result.recommendedStaffing).toBeDefined();
            expect(result.recommendedStaffing.totalStaff).toBeGreaterThan(0);
            expect(result.recommendedStaffing.skillDistribution).toBeDefined();
            expect(result.recommendedStaffing.shiftRecommendations).toBeDefined();
            expect(result.workloadDistribution).toBeDefined();
            expect(result.workloadDistribution.byCategory).toBeDefined();
            expect(result.workloadDistribution.byPriority).toBeDefined();
            expect(result.workloadDistribution.byApp).toBeDefined();
            expect(result.peakHours).toBeDefined();
            expect(result.seasonalFactors).toBeDefined();
        });

        it('スタッフィング推奨が適切に計算されること', async () => {
            const mockHistoricalData = [
                { date: '2024-01-01', count: '20' },
                { date: '2024-01-02', count: '25' },
                { date: '2024-01-03', count: '18' },
            ];

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mockHistoricalData),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getResourceDemandPrediction('next_month');

            expect(result.recommendedStaffing.totalStaff).toBeGreaterThan(0);
            expect(result.recommendedStaffing.skillDistribution).toHaveLength(3);
            expect(result.recommendedStaffing.shiftRecommendations).toHaveLength(3);

            // スキル分布の合計が総スタッフ数と一致することを確認
            const totalSkillStaff = result.recommendedStaffing.skillDistribution
                .reduce((sum, skill) => sum + skill.requiredCount, 0);
            expect(totalSkillStaff).toBe(result.recommendedStaffing.totalStaff);
        });
    });

    describe('getPredictionVisualization', () => {
        it('予測可視化データを正しく取得できること', async () => {
            const mockHistoricalData = [
                { date: '2024-01-01', count: '10' },
                { date: '2024-01-02', count: '12' },
                { date: '2024-01-03', count: '8' },
            ];

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mockHistoricalData),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getPredictionVisualization('inquiry_volume', 'daily');

            expect(result).toBeDefined();
            expect(result.chartType).toBe('line');
            expect(result.data).toBeDefined();
            expect(result.data.length).toBeGreaterThan(0);
            expect(result.annotations).toBeDefined();
            expect(result.config).toBeDefined();
            expect(result.config.title).toContain('inquiry_volume');
            expect(result.config.xAxisLabel).toBe('日付');
            expect(result.config.yAxisLabel).toBe('件数');

            // データポイントの種類を確認
            const dataTypes = [...new Set(result.data.map(point => point.type))];
            expect(dataTypes).toContain('actual');
            expect(dataTypes).toContain('predicted');
            expect(dataTypes).toContain('confidence_upper');
            expect(dataTypes).toContain('confidence_lower');
        });

        it('アノテーションが正しく設定されること', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getPredictionVisualization('inquiry_volume', 'daily');

            expect(result.annotations).toHaveLength(1);
            expect(result.annotations[0].type).toBe('line');
            expect(result.annotations[0].text).toBe('現在');
            expect(result.annotations[0].color).toBe('#ff0000');
        });
    });

    describe('evaluateModelAccuracy', () => {
        it('予測モデルの精度評価を正しく実行できること', async () => {
            const modelName = 'linear_regression';
            const testPeriod = 30;

            const result = await service.evaluateModelAccuracy(modelName, testPeriod);

            expect(result).toBeDefined();
            expect(result.accuracy).toBeGreaterThanOrEqual(0);
            expect(result.accuracy).toBeLessThanOrEqual(100);
            expect(result.metrics).toBeDefined();
            expect(result.metrics.mae).toBeGreaterThanOrEqual(0);
            expect(result.metrics.rmse).toBeGreaterThanOrEqual(0);
            expect(result.metrics.mape).toBeGreaterThanOrEqual(0);
            expect(result.metrics.r2).toBeGreaterThanOrEqual(-1);
            expect(result.metrics.r2).toBeLessThanOrEqual(1);
        });

        it('存在しないモデル名の場合はエラーを投げること', async () => {
            const modelName = 'nonexistent_model';

            await expect(service.evaluateModelAccuracy(modelName)).rejects.toThrow(
                `予測モデルが見つかりません: ${modelName}`
            );
        });

        it('精度メトリクスが正しく計算されること', async () => {
            const modelName = 'machine_learning';
            const result = await service.evaluateModelAccuracy(modelName, 10);

            // MAEはRMSE以下であることを確認
            expect(result.metrics.mae).toBeLessThanOrEqual(result.metrics.rmse);

            // MAPEは0以上であることを確認
            expect(result.metrics.mape).toBeGreaterThanOrEqual(0);

            // 精度はMAPEから計算されることを確認
            expect(result.accuracy).toBeLessThanOrEqual(100);
        });
    });

    describe('季節要因分析', () => {
        it('季節要因が正しく分析されること', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getResourceDemandPrediction('next_year');

            expect(result.seasonalFactors).toBeDefined();
            expect(result.seasonalFactors.length).toBeGreaterThan(0);

            result.seasonalFactors.forEach(factor => {
                expect(factor.name).toBeDefined();
                expect(factor.impact).toBeDefined();
                expect(factor.period).toBeDefined();
                expect(factor.description).toBeDefined();
            });

            // 年末年始の負の影響を確認
            const yearEndFactor = result.seasonalFactors.find(f => f.name === '年末年始');
            expect(yearEndFactor).toBeDefined();
            expect(yearEndFactor!.impact).toBeLessThan(0);

            // 新年度の正の影響を確認
            const newYearFactor = result.seasonalFactors.find(f => f.name === '新年度');
            expect(newYearFactor).toBeDefined();
            expect(newYearFactor!.impact).toBeGreaterThan(0);
        });
    });

    describe('エラーハンドリング', () => {
        it('データベースエラーが発生した場合は適切にエラーを投げること', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockRejectedValue(new Error('Database error')),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            await expect(service.getInquiryVolumePrediction('daily', 7)).rejects.toThrow('Database error');
        });
    });

    describe('予測精度の検証', () => {
        it('予測値が合理的な範囲内であること', async () => {
            const mockHistoricalData = [
                { date: '2024-01-01', count: '10' },
                { date: '2024-01-02', count: '12' },
                { date: '2024-01-03', count: '8' },
                { date: '2024-01-04', count: '15' },
                { date: '2024-01-05', count: '11' },
            ];

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue(mockHistoricalData),
            };

            mockInquiryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getInquiryVolumePrediction('daily', 7);

            // 予測値が負の値でないことを確認
            result.predictions.forEach(prediction => {
                expect(prediction.predictedValue).toBeGreaterThanOrEqual(0);
                expect(prediction.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
                expect(prediction.confidenceInterval.upper).toBeGreaterThanOrEqual(prediction.confidenceInterval.lower);
            });

            // 信頼度が合理的な範囲内であることを確認
            expect(result.confidence).toBeGreaterThanOrEqual(50);
            expect(result.confidence).toBeLessThanOrEqual(100);
        });
    });
});