import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VectorizationService } from '../services/vectorization.service';
import { VectorService } from '../services/vector.service';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { FAQ } from '../../faqs/entities/faq.entity';

describe('VectorizationService', () => {
    let service: VectorizationService;
    let vectorService: jest.Mocked<VectorService>;
    let inquiryRepository: jest.Mocked<Repository<Inquiry>>;
    let responseRepository: jest.Mocked<Repository<Response>>;
    let faqRepository: jest.Mocked<Repository<FAQ>>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VectorizationService,
                {
                    provide: VectorService,
                    useValue: {
                        embedText: jest.fn(),
                        storeVector: jest.fn(),
                        deleteVector: jest.fn(),
                        getStats: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: {
                        findOne: jest.fn(),
                        find: jest.fn(),
                        count: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Response),
                    useValue: {
                        findOne: jest.fn(),
                        find: jest.fn(),
                        count: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(FAQ),
                    useValue: {
                        findOne: jest.fn(),
                        find: jest.fn(),
                        count: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<VectorizationService>(VectorizationService);
        vectorService = module.get(VectorService);
        inquiryRepository = module.get(getRepositoryToken(Inquiry));
        responseRepository = module.get(getRepositoryToken(Response));
        faqRepository = module.get(getRepositoryToken(FAQ));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('vectorizeInquiry', () => {
        it('問い合わせを正常にベクトル化できること', async () => {
            // Arrange
            const inquiryId = 'inquiry-1';
            const mockInquiry = {
                id: inquiryId,
                title: 'テスト問い合わせ',
                content: 'テスト内容です',
                appId: 'app-1',
                category: 'technical',
                status: 'new',
                createdAt: new Date('2024-01-01'),
                app: { id: 'app-1', name: 'テストアプリ' },
            };

            const mockVector = new Array(1536).fill(0.5);

            inquiryRepository.findOne.mockResolvedValue(mockInquiry as any);
            vectorService.embedText.mockResolvedValue(mockVector);

            // Act
            await service.vectorizeInquiry(inquiryId);

            // Assert
            expect(inquiryRepository.findOne).toHaveBeenCalledWith({
                where: { id: inquiryId },
                relations: ['app'],
            });
            expect(vectorService.embedText).toHaveBeenCalledWith('テスト問い合わせ テスト内容です');
            expect(vectorService.storeVector).toHaveBeenCalledWith(
                inquiryId,
                mockVector,
                {
                    id: inquiryId,
                    type: 'inquiry',
                    appId: 'app-1',
                    category: 'technical',
                    status: 'new',
                    createdAt: mockInquiry.createdAt.toISOString(),
                    title: 'テスト問い合わせ',
                }
            );
        });

        it('存在しない問い合わせの場合エラーが発生すること', async () => {
            // Arrange
            const inquiryId = 'non-existent';
            inquiryRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(service.vectorizeInquiry(inquiryId)).rejects.toThrow('Inquiry not found: non-existent');
        });
    });

    describe('vectorizeResponse', () => {
        it('回答を正常にベクトル化できること', async () => {
            // Arrange
            const responseId = 'response-1';
            const mockResponse = {
                id: responseId,
                content: 'テスト回答です',
                createdAt: new Date('2024-01-01'),
                inquiry: {
                    id: 'inquiry-1',
                    title: 'テスト問い合わせ',
                    appId: 'app-1',
                    category: 'technical',
                    status: 'resolved',
                    app: { id: 'app-1', name: 'テストアプリ' },
                },
            };

            const mockVector = new Array(1536).fill(0.6);

            responseRepository.findOne.mockResolvedValue(mockResponse as any);
            vectorService.embedText.mockResolvedValue(mockVector);

            // Act
            await service.vectorizeResponse(responseId);

            // Assert
            expect(responseRepository.findOne).toHaveBeenCalledWith({
                where: { id: responseId },
                relations: ['inquiry', 'inquiry.app'],
            });
            expect(vectorService.embedText).toHaveBeenCalledWith('テスト回答です');
            expect(vectorService.storeVector).toHaveBeenCalledWith(
                responseId,
                mockVector,
                {
                    id: responseId,
                    type: 'response',
                    appId: 'app-1',
                    category: 'technical',
                    status: 'resolved',
                    createdAt: mockResponse.createdAt.toISOString(),
                    title: '回答: テスト問い合わせ',
                }
            );
        });

        it('存在しない回答の場合エラーが発生すること', async () => {
            // Arrange
            const responseId = 'non-existent';
            responseRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(service.vectorizeResponse(responseId)).rejects.toThrow('Response not found: non-existent');
        });
    });

    describe('vectorizeFAQ', () => {
        it('FAQを正常にベクトル化できること', async () => {
            // Arrange
            const faqId = 'faq-1';
            const mockFAQ = {
                id: faqId,
                question: 'テスト質問',
                answer: 'テスト回答',
                applicationId: 'app-1',
                category: 'general',
                createdAt: new Date('2024-01-01'),
                application: { id: 'app-1', name: 'テストアプリ' },
            };

            const mockVector = new Array(1536).fill(0.7);

            faqRepository.findOne.mockResolvedValue(mockFAQ as any);
            vectorService.embedText.mockResolvedValue(mockVector);

            // Act
            await service.vectorizeFAQ(faqId);

            // Assert
            expect(faqRepository.findOne).toHaveBeenCalledWith({
                where: { id: faqId },
                relations: ['application'],
            });
            expect(vectorService.embedText).toHaveBeenCalledWith('テスト質問 テスト回答');
            expect(vectorService.storeVector).toHaveBeenCalledWith(
                faqId,
                mockVector,
                {
                    id: faqId,
                    type: 'faq',
                    appId: 'app-1',
                    category: 'general',
                    createdAt: mockFAQ.createdAt.toISOString(),
                    title: 'テスト質問',
                }
            );
        });

        it('存在しないFAQの場合エラーが発生すること', async () => {
            // Arrange
            const faqId = 'non-existent';
            faqRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(service.vectorizeFAQ(faqId)).rejects.toThrow('FAQ not found: non-existent');
        });
    });

    describe('deleteVector', () => {
        it('ベクトルを正常に削除できること', async () => {
            // Arrange
            const id = 'test-id';

            // Act
            await service.deleteVector(id);

            // Assert
            expect(vectorService.deleteVector).toHaveBeenCalledWith(id);
        });
    });

    describe('vectorizeAllExistingData', () => {
        it('既存データを一括ベクトル化できること', async () => {
            // Arrange
            const mockInquiries = [
                { id: 'inquiry-1', app: { id: 'app-1' } },
                { id: 'inquiry-2', app: { id: 'app-1' } },
            ];
            const mockResponses = [
                { id: 'response-1', inquiry: { app: { id: 'app-1' } } },
            ];
            const mockFAQs = [
                { id: 'faq-1', application: { id: 'app-1' } },
            ];

            inquiryRepository.find.mockResolvedValue(mockInquiries as any);
            responseRepository.find.mockResolvedValue(mockResponses as any);
            faqRepository.find.mockResolvedValue(mockFAQs as any);

            // 個別のベクトル化メソッドをモック化
            jest.spyOn(service, 'vectorizeInquiry').mockResolvedValue();
            jest.spyOn(service, 'vectorizeResponse').mockResolvedValue();
            jest.spyOn(service, 'vectorizeFAQ').mockResolvedValue();

            vectorService.getStats.mockReturnValue({ totalVectors: 4, indexConfig: {} as any });

            // Act
            await service.vectorizeAllExistingData();

            // Assert
            expect(service.vectorizeInquiry).toHaveBeenCalledTimes(2);
            expect(service.vectorizeResponse).toHaveBeenCalledTimes(1);
            expect(service.vectorizeFAQ).toHaveBeenCalledTimes(1);
        });

        it('エラーが発生してもスキップして続行すること', async () => {
            // Arrange
            const mockInquiries = [
                { id: 'inquiry-1', app: { id: 'app-1' } },
                { id: 'inquiry-2', app: { id: 'app-1' } },
            ];

            inquiryRepository.find.mockResolvedValue(mockInquiries as any);
            responseRepository.find.mockResolvedValue([]);
            faqRepository.find.mockResolvedValue([]);

            // 最初の問い合わせでエラー、2番目は成功
            jest.spyOn(service, 'vectorizeInquiry')
                .mockRejectedValueOnce(new Error('Test error'))
                .mockResolvedValueOnce();

            vectorService.getStats.mockReturnValue({ totalVectors: 1, indexConfig: {} as any });

            // Act
            await service.vectorizeAllExistingData();

            // Assert
            expect(service.vectorizeInquiry).toHaveBeenCalledTimes(2);
        });
    });

    describe('getVectorizationStats', () => {
        it('ベクトル化統計を正常に取得できること', async () => {
            // Arrange
            inquiryRepository.count.mockResolvedValue(10);
            responseRepository.count.mockResolvedValue(20);
            faqRepository.count.mockResolvedValue(5);
            vectorService.getStats.mockReturnValue({ totalVectors: 35, indexConfig: {} as any });

            // Act
            const stats = await service.getVectorizationStats();

            // Assert
            expect(stats).toEqual({
                totalVectors: 35,
                inquiryVectors: 10,
                responseVectors: 20,
                faqVectors: 5,
            });
        });
    });
});