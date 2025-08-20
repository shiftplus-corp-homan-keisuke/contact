/**
 * 回答サービスのユニットテスト
 * 要件2.1: 問い合わせと回答の関連付け機能のテスト
 * 要件2.3: 回答の追加・更新・履歴管理機能のテスト
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { ResponsesService } from '../services/responses.service';
import { Response } from '../entities/response.entity';
import { ResponseHistory } from '../entities/response-history.entity';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { CreateResponseDto, UpdateResponseDto } from '../dto';

describe('ResponsesService', () => {
    let service: ResponsesService;
    let responseRepository: jest.Mocked<Repository<Response>>;
    let responseHistoryRepository: jest.Mocked<Repository<ResponseHistory>>;
    let inquiryRepository: jest.Mocked<Repository<Inquiry>>;

    // テスト用のモックデータ
    const mockInquiry: Inquiry = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        appId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'テスト問い合わせ',
        content: 'テスト内容',
        status: 'new',
        priority: 'medium',
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        app: null,
        statusHistory: []
    };

    const mockResponse: Response = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        inquiryId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        content: 'テスト回答内容',
        isPublic: false,
        isInternal: false,
        responseType: 'answer',
        responseTimeMinutes: 30,
        attachmentIds: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        inquiry: mockInquiry,
        user: null,
        history: []
    };

    const mockCreateResponseDto: CreateResponseDto = {
        inquiryId: '550e8400-e29b-41d4-a716-446655440000',
        content: 'テスト回答内容',
        isPublic: false,
        isInternal: false,
        responseType: 'answer',
        responseTimeMinutes: 30
    };

    beforeEach(async () => {
        // モックリポジトリの作成
        const mockResponseRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            merge: jest.fn(),
            softDelete: jest.fn()
        };

        const mockResponseHistoryRepository = {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn()
        };

        const mockInquiryRepository = {
            findOne: jest.fn(),
            update: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResponsesService,
                {
                    provide: getRepositoryToken(Response),
                    useValue: mockResponseRepository
                },
                {
                    provide: getRepositoryToken(ResponseHistory),
                    useValue: mockResponseHistoryRepository
                },
                {
                    provide: getRepositoryToken(Inquiry),
                    useValue: mockInquiryRepository
                }
            ]
        }).compile();

        service = module.get<ResponsesService>(ResponsesService);
        responseRepository = module.get(getRepositoryToken(Response));
        responseHistoryRepository = module.get(getRepositoryToken(ResponseHistory));
        inquiryRepository = module.get(getRepositoryToken(Inquiry));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createResponse', () => {
        it('回答を正常に作成できること', async () => {
            // Arrange
            inquiryRepository.findOne.mockResolvedValue(mockInquiry);
            responseRepository.create.mockReturnValue(mockResponse);
            responseRepository.save.mockResolvedValue(mockResponse);
            responseHistoryRepository.create.mockReturnValue({} as ResponseHistory);
            responseHistoryRepository.save.mockResolvedValue({} as ResponseHistory);
            inquiryRepository.update.mockResolvedValue({ affected: 1 } as any);

            // Act
            const result = await service.createResponse(
                mockCreateResponseDto,
                '550e8400-e29b-41d4-a716-446655440003'
            );

            // Assert
            expect(inquiryRepository.findOne).toHaveBeenCalledWith({
                where: { id: mockCreateResponseDto.inquiryId }
            });
            expect(responseRepository.create).toHaveBeenCalledWith({
                ...mockCreateResponseDto,
                userId: '550e8400-e29b-41d4-a716-446655440003',
                isPublic: false,
                isInternal: false,
                attachmentIds: [],
                metadata: {}
            });
            expect(responseRepository.save).toHaveBeenCalledWith(mockResponse);
            expect(responseHistoryRepository.create).toHaveBeenCalled();
            expect(responseHistoryRepository.save).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.id).toBe(mockResponse.id);
        });

        it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
            // Arrange
            inquiryRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.createResponse(
                    mockCreateResponseDto,
                    '550e8400-e29b-41d4-a716-446655440003'
                )
            ).rejects.toThrow(BadRequestException);
        });

        it('必須項目が不足している場合はエラーを投げること', async () => {
            // Arrange
            const invalidDto = { ...mockCreateResponseDto, content: '' };

            // Act & Assert
            await expect(
                service.createResponse(
                    invalidDto,
                    '550e8400-e29b-41d4-a716-446655440003'
                )
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getResponse', () => {
        it('回答を正常に取得できること', async () => {
            // Arrange
            const mockResponseWithRelations = {
                ...mockResponse,
                user: {
                    id: '550e8400-e29b-41d4-a716-446655440003',
                    name: 'テストユーザー',
                    email: 'test@example.com',
                    passwordHash: 'hash',
                    roleId: '550e8400-e29b-41d4-a716-446655440004',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    role: null,
                    history: []
                },
                history: []
            };
            responseRepository.findOne.mockResolvedValue(mockResponseWithRelations);

            // Act
            const result = await service.getResponse('550e8400-e29b-41d4-a716-446655440002');

            // Assert
            expect(responseRepository.findOne).toHaveBeenCalledWith({
                where: { id: '550e8400-e29b-41d4-a716-446655440002' },
                relations: [
                    'user',
                    'inquiry',
                    'history',
                    'history.changedByUser'
                ],
                order: {
                    history: {
                        changedAt: 'ASC'
                    }
                }
            });
            expect(result).toBeDefined();
            expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440002');
        });

        it('存在しない回答IDの場合はエラーを投げること', async () => {
            // Arrange
            responseRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.getResponse('non-existent-id')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateResponse', () => {
        it('回答を正常に更新できること', async () => {
            // Arrange
            const updateResponseDto: UpdateResponseDto = {
                content: '更新された回答内容',
                updateComment: '追加情報を含めて更新'
            };

            responseRepository.findOne.mockResolvedValue(mockResponse);
            responseRepository.merge.mockReturnValue({ ...mockResponse, content: updateResponseDto.content });
            responseRepository.save.mockResolvedValue({ ...mockResponse, content: updateResponseDto.content });
            responseHistoryRepository.create.mockReturnValue({} as ResponseHistory);
            responseHistoryRepository.save.mockResolvedValue({} as ResponseHistory);

            // Act
            const result = await service.updateResponse(
                '550e8400-e29b-41d4-a716-446655440002',
                updateResponseDto,
                '550e8400-e29b-41d4-a716-446655440003',
                '127.0.0.1'
            );

            // Assert
            expect(responseRepository.findOne).toHaveBeenCalledWith({
                where: { id: '550e8400-e29b-41d4-a716-446655440002' }
            });
            expect(responseRepository.merge).toHaveBeenCalledWith(mockResponse, updateResponseDto);
            expect(responseRepository.save).toHaveBeenCalled();
            expect(responseHistoryRepository.create).toHaveBeenCalledWith({
                responseId: '550e8400-e29b-41d4-a716-446655440002',
                oldContent: 'テスト回答内容',
                newContent: '更新された回答内容',
                changedBy: '550e8400-e29b-41d4-a716-446655440003',
                changeType: 'update',
                comment: '追加情報を含めて更新',
                ipAddress: '127.0.0.1',
                metadata: {}
            });
            expect(result).toBeDefined();
            expect(result.content).toBe('更新された回答内容');
        });

        it('存在しない回答IDの場合はエラーを投げること', async () => {
            // Arrange
            responseRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.updateResponse(
                    'non-existent-id',
                    { content: '更新内容' },
                    '550e8400-e29b-41d4-a716-446655440003'
                )
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getResponsesByInquiry', () => {
        it('問い合わせに関連する回答一覧を正常に取得できること', async () => {
            // Arrange
            const mockResponses = [mockResponse];
            inquiryRepository.findOne.mockResolvedValue(mockInquiry);
            responseRepository.find.mockResolvedValue(mockResponses);

            // Act
            const result = await service.getResponsesByInquiry('550e8400-e29b-41d4-a716-446655440000');

            // Assert
            expect(inquiryRepository.findOne).toHaveBeenCalledWith({
                where: { id: '550e8400-e29b-41d4-a716-446655440000' }
            });
            expect(responseRepository.find).toHaveBeenCalledWith({
                where: { inquiryId: '550e8400-e29b-41d4-a716-446655440000' },
                relations: ['user'],
                order: { createdAt: 'ASC' }
            });
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(mockResponse.id);
        });

        it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
            // Arrange
            inquiryRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.getResponsesByInquiry('non-existent-id')
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getResponseHistory', () => {
        it('回答履歴を正常に取得できること', async () => {
            // Arrange
            const mockHistory: ResponseHistory[] = [
                {
                    id: '550e8400-e29b-41d4-a716-446655440004',
                    responseId: '550e8400-e29b-41d4-a716-446655440002',
                    oldContent: null,
                    newContent: 'テスト回答内容',
                    changedBy: '550e8400-e29b-41d4-a716-446655440003',
                    changedAt: new Date(),
                    changeType: 'create',
                    comment: '回答が作成されました',
                    metadata: {},
                    response: mockResponse,
                    changedByUser: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            responseRepository.findOne.mockResolvedValue(mockResponse);
            responseHistoryRepository.find.mockResolvedValue(mockHistory);

            // Act
            const result = await service.getResponseHistory('550e8400-e29b-41d4-a716-446655440002');

            // Assert
            expect(responseRepository.findOne).toHaveBeenCalledWith({
                where: { id: '550e8400-e29b-41d4-a716-446655440002' }
            });
            expect(responseHistoryRepository.find).toHaveBeenCalledWith({
                where: { responseId: '550e8400-e29b-41d4-a716-446655440002' },
                relations: ['changedByUser'],
                order: { changedAt: 'ASC' }
            });
            expect(result).toEqual(mockHistory);
        });

        it('存在しない回答IDの場合はエラーを投げること', async () => {
            // Arrange
            responseRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.getResponseHistory('non-existent-id')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteResponse', () => {
        it('回答を正常に削除できること', async () => {
            // Arrange
            responseRepository.findOne.mockResolvedValue(mockResponse);
            responseHistoryRepository.create.mockReturnValue({} as ResponseHistory);
            responseHistoryRepository.save.mockResolvedValue({} as ResponseHistory);
            responseRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

            // Act
            await service.deleteResponse(
                '550e8400-e29b-41d4-a716-446655440002',
                '550e8400-e29b-41d4-a716-446655440003',
                '127.0.0.1'
            );

            // Assert
            expect(responseRepository.findOne).toHaveBeenCalledWith({
                where: { id: '550e8400-e29b-41d4-a716-446655440002' }
            });
            expect(responseHistoryRepository.create).toHaveBeenCalledWith({
                responseId: '550e8400-e29b-41d4-a716-446655440002',
                oldContent: 'テスト回答内容',
                newContent: null,
                changedBy: '550e8400-e29b-41d4-a716-446655440003',
                changeType: 'delete',
                comment: '回答が削除されました',
                ipAddress: '127.0.0.1',
                metadata: {}
            });
            expect(responseRepository.softDelete).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440002');
        });

        it('存在しない回答IDの場合はエラーを投げること', async () => {
            // Arrange
            responseRepository.findOne.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.deleteResponse(
                    'non-existent-id',
                    '550e8400-e29b-41d4-a716-446655440003'
                )
            ).rejects.toThrow(NotFoundException);
        });
    });
});