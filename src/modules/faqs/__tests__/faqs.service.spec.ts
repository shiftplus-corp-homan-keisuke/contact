import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FAQsService } from '../services/faqs.service';
import { FAQsRepository } from '../repositories/faqs.repository';
import { CreateFAQDto, UpdateFAQDto } from '../dto';
import { FAQ } from '../entities';

describe('FAQsService', () => {
    let service: FAQsService;
    let repository: jest.Mocked<FAQsRepository>;

    const mockFAQ: FAQ = {
        id: 'faq-1',
        appId: 'app-1',
        question: 'テスト質問',
        answer: 'テスト回答',
        category: 'テスト',
        orderIndex: 0,
        isPublished: false,
        tags: ['tag1', 'tag2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        application: null,
    };

    const mockRepository = {
        create: jest.fn(),
        findById: jest.fn(),
        findByAppId: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findPublishedByAppId: jest.fn(),
        getCategories: jest.fn(),
        getTags: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FAQsService,
                {
                    provide: FAQsRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<FAQsService>(FAQsService);
        repository = module.get(FAQsRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createFAQ', () => {
        it('FAQ作成が成功すること', async () => {
            const createFAQDto: CreateFAQDto = {
                appId: 'app-1',
                question: 'テスト質問',
                answer: 'テスト回答',
                category: 'テスト',
            };

            repository.create.mockResolvedValue(mockFAQ);

            const result = await service.createFAQ(createFAQDto);

            expect(repository.create).toHaveBeenCalledWith(createFAQDto);
            expect(result).toEqual(mockFAQ);
        });

        it('FAQ作成でエラーが発生した場合、BadRequestExceptionをスローすること', async () => {
            const createFAQDto: CreateFAQDto = {
                appId: 'app-1',
                question: 'テスト質問',
                answer: 'テスト回答',
            };

            repository.create.mockRejectedValue(new Error('Database error'));

            await expect(service.createFAQ(createFAQDto)).rejects.toThrow(BadRequestException);
        });
    });

    describe('getFAQById', () => {
        it('FAQ取得が成功すること', async () => {
            repository.findById.mockResolvedValue(mockFAQ);

            const result = await service.getFAQById('faq-1');

            expect(repository.findById).toHaveBeenCalledWith('faq-1');
            expect(result).toEqual(mockFAQ);
        });

        it('FAQが見つからない場合、NotFoundExceptionをスローすること', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(service.getFAQById('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getFAQsByApp', () => {
        it('アプリ別FAQ取得が成功すること', async () => {
            const faqs = [mockFAQ];
            repository.findByAppId.mockResolvedValue(faqs);

            const result = await service.getFAQsByApp('app-1');

            expect(repository.findByAppId).toHaveBeenCalledWith('app-1', undefined);
            expect(result).toEqual(faqs);
        });

        it('フィルタ付きでアプリ別FAQ取得が成功すること', async () => {
            const faqs = [mockFAQ];
            const filters = { category: 'テスト' };
            repository.findByAppId.mockResolvedValue(faqs);

            const result = await service.getFAQsByApp('app-1', filters);

            expect(repository.findByAppId).toHaveBeenCalledWith('app-1', filters);
            expect(result).toEqual(faqs);
        });
    });

    describe('updateFAQ', () => {
        it('FAQ更新が成功すること', async () => {
            const updateFAQDto: UpdateFAQDto = {
                question: '更新された質問',
            };
            const updatedFAQ = { ...mockFAQ, question: '更新された質問' };

            repository.findById.mockResolvedValue(mockFAQ);
            repository.update.mockResolvedValue(updatedFAQ);

            const result = await service.updateFAQ('faq-1', updateFAQDto);

            expect(repository.findById).toHaveBeenCalledWith('faq-1');
            expect(repository.update).toHaveBeenCalledWith('faq-1', updateFAQDto);
            expect(result).toEqual(updatedFAQ);
        });

        it('存在しないFAQを更新しようとした場合、NotFoundExceptionをスローすること', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(service.updateFAQ('nonexistent', {})).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteFAQ', () => {
        it('FAQ削除が成功すること', async () => {
            repository.findById.mockResolvedValue(mockFAQ);
            repository.delete.mockResolvedValue(undefined);

            await service.deleteFAQ('faq-1');

            expect(repository.findById).toHaveBeenCalledWith('faq-1');
            expect(repository.delete).toHaveBeenCalledWith('faq-1');
        });

        it('存在しないFAQを削除しようとした場合、NotFoundExceptionをスローすること', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(service.deleteFAQ('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('publishFAQ', () => {
        it('FAQ公開が成功すること', async () => {
            const publishedFAQ = { ...mockFAQ, isPublished: true };
            repository.findById.mockResolvedValue(mockFAQ);
            repository.update.mockResolvedValue(publishedFAQ);

            const result = await service.publishFAQ('faq-1');

            expect(repository.update).toHaveBeenCalledWith('faq-1', { isPublished: true });
            expect(result).toEqual(publishedFAQ);
        });
    });

    describe('unpublishFAQ', () => {
        it('FAQ非公開が成功すること', async () => {
            const unpublishedFAQ = { ...mockFAQ, isPublished: false };
            repository.findById.mockResolvedValue(mockFAQ);
            repository.update.mockResolvedValue(unpublishedFAQ);

            const result = await service.unpublishFAQ('faq-1');

            expect(repository.update).toHaveBeenCalledWith('faq-1', { isPublished: false });
            expect(result).toEqual(unpublishedFAQ);
        });
    });

    describe('getPublishedFAQs', () => {
        it('公開済みFAQ取得が成功すること', async () => {
            const publishedFAQs = [{ ...mockFAQ, isPublished: true }];
            repository.findPublishedByAppId.mockResolvedValue(publishedFAQs);

            const result = await service.getPublishedFAQs('app-1');

            expect(repository.findPublishedByAppId).toHaveBeenCalledWith('app-1');
            expect(result).toEqual(publishedFAQs);
        });
    });

    describe('getFAQAnalytics', () => {
        it('FAQ分析データ取得が成功すること', async () => {
            const faqs = [
                { ...mockFAQ, category: 'カテゴリ1', isPublished: true },
                { ...mockFAQ, id: 'faq-2', category: 'カテゴリ2', isPublished: false },
                { ...mockFAQ, id: 'faq-3', category: 'カテゴリ1', isPublished: true },
            ];
            repository.findByAppId.mockResolvedValue(faqs);

            const result = await service.getFAQAnalytics('app-1');

            expect(result).toEqual({
                totalFAQs: 3,
                publishedFAQs: 2,
                categoriesCount: 2,
                mostViewedFAQs: [],
                categoryBreakdown: [
                    { category: 'カテゴリ1', count: 2 },
                    { category: 'カテゴリ2', count: 1 },
                ],
            });
        });
    });

    describe('bulkUpdatePublishStatus', () => {
        it('複数FAQ一括公開状態更新が成功すること', async () => {
            const faq1 = { ...mockFAQ, id: 'faq-1' };
            const faq2 = { ...mockFAQ, id: 'faq-2' };
            const updatedFAQ1 = { ...faq1, isPublished: true };
            const updatedFAQ2 = { ...faq2, isPublished: true };

            repository.findById
                .mockResolvedValueOnce(faq1)
                .mockResolvedValueOnce(faq2);
            repository.update
                .mockResolvedValueOnce(updatedFAQ1)
                .mockResolvedValueOnce(updatedFAQ2);

            const result = await service.bulkUpdatePublishStatus(['faq-1', 'faq-2'], true);

            expect(result).toHaveLength(2);
            expect(result[0].isPublished).toBe(true);
            expect(result[1].isPublished).toBe(true);
        });

        it('一部のFAQ更新に失敗しても他のFAQは更新されること', async () => {
            const faq1 = { ...mockFAQ, id: 'faq-1' };
            const updatedFAQ1 = { ...faq1, isPublished: true };

            repository.findById
                .mockResolvedValueOnce(faq1)
                .mockResolvedValueOnce(null); // 2番目のFAQは見つからない
            repository.update.mockResolvedValueOnce(updatedFAQ1);

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const result = await service.bulkUpdatePublishStatus(['faq-1', 'nonexistent'], true);

            expect(result).toHaveLength(1);
            expect(result[0].isPublished).toBe(true);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });
});