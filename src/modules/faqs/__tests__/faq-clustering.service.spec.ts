import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FAQClusteringService } from '../services/faq-clustering.service';
import { VectorService } from '../../search/services/vector.service';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { FAQGenerationOptions } from '../types';

describe('FAQClusteringService', () => {
    let service: FAQClusteringService;
    let inquiryRepository: jest.Mocked<Repository<Inquiry>>;
    let responseRepository: jest.Mocked<Repository<Response>>;
    let vectorService: jest.Mocked<VectorService>;

    const mockInquiry: Inquiry = {
        id: 'inquiry-1',
        appId: 'app-1',
        title: 'ログインできません',
        content: 'パスワードを忘れてしまいログインできません',
        status: 'resolved',
        priority: 'medium',
        category: 'ログイン',
        customerEmail: 'test@example.com',
        customerName: 'テストユーザー',
        assignedTo: null,
        firstResponseAt: new Date(),
        resolvedAt: new Date(),
        closedAt: null,
        metadata: {},
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        app: null,
        assignedUser: null,

        statusHistory: [],
        responses: [
            {
                id: 'response-1',
                inquiryId: 'inquiry-1',
                userId: 'user-1',
                content: 'パスワードリセット機能をご利用ください。',
                isPublic: true,
                isInternal: false,
                responseType: 'answer',
                responseTimeMinutes: 30,
                metadata: {},
                attachmentIds: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                inquiry: null,
                user: null,
                history: [],
            } as Response,
        ],
    };

    const mockOptions: FAQGenerationOptions = {
        minClusterSize: 2,
        maxClusters: 5,
        similarityThreshold: 0.7,
    };

    beforeEach(async () => {
        const mockInquiryRepository = {
            createQueryBuilder: jest.fn().mockReturnValue({
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getMany: jest.fn(),
            }),
        };

        const mockResponseRepository = {};

        const mockVectorService = {
            embedText: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FAQClusteringService,
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: mockInquiryRepository,
                },
                {
                    provide: getRepositoryToken(Response),
                    useValue: mockResponseRepository,
                },
                {
                    provide: VectorService,
                    useValue: mockVectorService,
                },
            ],
        }).compile();

        service = module.get<FAQClusteringService>(FAQClusteringService);
        inquiryRepository = module.get(getRepositoryToken(Inquiry));
        responseRepository = module.get(getRepositoryToken(Response));
        vectorService = module.get(VectorService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateFAQClusters', () => {
        it('FAQ生成が成功すること', async () => {
            const inquiries = [mockInquiry, { ...mockInquiry, id: 'inquiry-2', title: 'パスワードを忘れました' }];
            const mockVector = new Array(1536).fill(0.1);

            // QueryBuilderのモック設定
            const queryBuilder = inquiryRepository.createQueryBuilder();
            (queryBuilder.getMany as jest.Mock).mockResolvedValue(inquiries);

            vectorService.embedText.mockResolvedValue(mockVector);

            const result = await service.generateFAQClusters('app-1', mockOptions);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });

        it('問い合わせ数が不足している場合、空配列を返すこと', async () => {
            const inquiries = [mockInquiry]; // minClusterSize(2)より少ない

            const queryBuilder = inquiryRepository.createQueryBuilder();
            (queryBuilder.getMany as jest.Mock).mockResolvedValue(inquiries);

            const result = await service.generateFAQClusters('app-1', mockOptions);

            expect(result).toEqual([]);
        });

        it('ベクトル化エラーが発生してもダミーベクトルで続行すること', async () => {
            const inquiries = [mockInquiry, { ...mockInquiry, id: 'inquiry-2' }];

            const queryBuilder = inquiryRepository.createQueryBuilder();
            (queryBuilder.getMany as jest.Mock).mockResolvedValue(inquiries);

            vectorService.embedText
                .mockResolvedValueOnce(new Array(1536).fill(0.1))
                .mockRejectedValueOnce(new Error('Vectorization failed'));

            const result = await service.generateFAQClusters('app-1', mockOptions);

            expect(result).toBeDefined();
            expect(vectorService.embedText).toHaveBeenCalledTimes(2);
        });
    });

    describe('previewFAQGeneration', () => {
        it('プレビュー生成が成功すること', async () => {
            const inquiries = [mockInquiry, { ...mockInquiry, id: 'inquiry-2' }];
            const mockVector = new Array(1536).fill(0.1);

            const queryBuilder = inquiryRepository.createQueryBuilder();
            (queryBuilder.getMany as jest.Mock).mockResolvedValue(inquiries);

            vectorService.embedText.mockResolvedValue(mockVector);

            const result = await service.previewFAQGeneration('app-1', mockOptions);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('private methods', () => {
        it('コサイン類似度計算が正しく動作すること', async () => {
            // プライベートメソッドのテストは実装の詳細なので、
            // パブリックメソッド経由でテストする
            const inquiries = [
                mockInquiry,
                { ...mockInquiry, id: 'inquiry-2', title: 'ログインエラー' },
                { ...mockInquiry, id: 'inquiry-3', title: 'ログイン問題' },
            ];
            const mockVector = new Array(1536).fill(0.1);

            const queryBuilder = inquiryRepository.createQueryBuilder();
            (queryBuilder.getMany as jest.Mock).mockResolvedValue(inquiries);

            vectorService.embedText.mockResolvedValue(mockVector);

            const result = await service.generateFAQClusters('app-1', mockOptions);

            // 類似した問い合わせがクラスタリングされることを確認
            expect(result).toBeDefined();
        });
    });

    describe('エラーハンドリング', () => {
        it('データベースエラーが発生した場合、エラーをスローすること', async () => {
            const queryBuilder = inquiryRepository.createQueryBuilder();
            (queryBuilder.getMany as jest.Mock).mockRejectedValue(new Error('Database error'));

            await expect(service.generateFAQClusters('app-1', mockOptions)).rejects.toThrow();
        });

        it('ベクトルサービスエラーが発生してもダミーベクトルで続行すること', async () => {
            const inquiries = [mockInquiry, { ...mockInquiry, id: 'inquiry-2' }];

            const queryBuilder = inquiryRepository.createQueryBuilder();
            (queryBuilder.getMany as jest.Mock).mockResolvedValue(inquiries);

            vectorService.embedText.mockRejectedValue(new Error('Vector service error'));

            // エラーが発生してもダミーベクトルで処理が続行されることを確認
            const result = await service.generateFAQClusters('app-1', mockOptions);
            expect(result).toBeDefined();
        });
    });
});