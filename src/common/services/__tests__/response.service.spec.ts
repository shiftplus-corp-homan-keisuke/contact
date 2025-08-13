/**
 * 回答サービスのユニットテスト
 * 要件: 2.1, 2.3, 2.4 (回答管理機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResponseService } from '../../../modules/responses/services/response.service';
import { Response } from '../../entities/response.entity';
import { ResponseHistory } from '../../entities/response-history.entity';
import { Inquiry } from '../../entities/inquiry.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { CreateResponseDto, UpdateResponseDto } from '../../dto/response.dto';
import { InquiryStatus, InquiryPriority } from '../../types/inquiry.types';

describe('ResponseService', () => {
  let service: ResponseService;
  let responseRepository: jest.Mocked<Repository<Response>>;
  let responseHistoryRepository: jest.Mocked<Repository<ResponseHistory>>;
  let inquiryRepository: jest.Mocked<Repository<Inquiry>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockInquiry: Inquiry = {
    id: 'test-inquiry-id',
    appId: 'test-app-id',
    title: 'テスト問い合わせ',
    content: 'テスト内容',
    status: InquiryStatus.NEW,
    priority: InquiryPriority.MEDIUM,
    category: 'テストカテゴリ',
    customerEmail: 'test@example.com',
    customerName: 'テストユーザー',
    assignedTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    application: null,
    assignedUser: null,
    responses: [],
    statusHistory: [],
    templateUsages: [],
    files: [],
  };

  const mockUser: User = {
    id: 'test-user-id',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    name: 'テストユーザー',
    roleId: 'role-id',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: null,
    assignedInquiries: [],
    responses: [],
    history: [],
    changedHistory: [],
    templates: [],
    templateUsages: [],
  };

  const mockResponse: Response = {
    id: 'test-response-id',
    inquiryId: 'test-inquiry-id',
    userId: 'test-user-id',
    content: 'テスト回答',
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    inquiry: mockInquiry,
    user: mockUser,
    history: [],
    templateUsages: [],
  };

  const mockResponseHistory: ResponseHistory = {
    id: 'test-history-id',
    responseId: 'test-response-id',
    oldContent: '古い回答',
    newContent: '新しい回答',
    changedBy: 'test-user-id',
    changedAt: new Date(),
    response: mockResponse,
    changedByUser: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseService,
        {
          provide: getRepositoryToken(Response),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ResponseHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Inquiry),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResponseService>(ResponseService);
    responseRepository = module.get(getRepositoryToken(Response));
    responseHistoryRepository = module.get(getRepositoryToken(ResponseHistory));
    inquiryRepository = module.get(getRepositoryToken(Inquiry));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createResponse', () => {
    const createResponseDto: CreateResponseDto = {
      inquiryId: 'test-inquiry-id',
      content: 'テスト回答',
      isPublic: false,
    };

    it('正常に回答を追加できること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      userRepository.findOne.mockResolvedValue(mockUser);
      responseRepository.create.mockReturnValue(mockResponse);
      responseRepository.save.mockResolvedValue(mockResponse);

      // Act
      const result = await service.createResponse(createResponseDto, 'test-user-id');

      // Assert
      expect(result).toEqual(mockResponse);
      expect(inquiryRepository.findOne).toHaveBeenCalledWith({
        where: { id: createResponseDto.inquiryId }
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-user-id' }
      });
      expect(responseRepository.create).toHaveBeenCalledWith({
        inquiryId: createResponseDto.inquiryId,
        userId: 'test-user-id',
        content: createResponseDto.content,
        isPublic: false,
      });
      expect(responseRepository.save).toHaveBeenCalledWith(mockResponse);
    });

    it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createResponse(createResponseDto, 'test-user-id'))
        .rejects.toThrow(BadRequestException);
    });

    it('存在しないユーザーIDの場合はエラーを投げること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createResponse(createResponseDto, 'test-user-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('updateResponse', () => {
    const updateResponseDto: UpdateResponseDto = {
      content: '更新された回答',
      isPublic: true,
    };

    it('正常に回答を更新できること', async () => {
      // Arrange
      const updatedResponse = { ...mockResponse, ...updateResponseDto };
      responseRepository.findOne.mockResolvedValue(mockResponse);
      responseHistoryRepository.create.mockReturnValue(mockResponseHistory);
      responseHistoryRepository.save.mockResolvedValue(mockResponseHistory);
      responseRepository.save.mockResolvedValue(updatedResponse);

      // Act
      const result = await service.updateResponse('test-response-id', updateResponseDto, 'test-user-id');

      // Assert
      expect(result).toEqual(updatedResponse);
      expect(responseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-response-id' },
        relations: ['user', 'inquiry'],
      });
      expect(responseHistoryRepository.create).toHaveBeenCalledWith({
        responseId: 'test-response-id',
        oldContent: 'テスト回答',
        newContent: '更新された回答',
        changedBy: 'test-user-id',
      });
      expect(responseRepository.save).toHaveBeenCalled();
    });

    it('存在しない回答IDの場合はエラーを投げること', async () => {
      // Arrange
      responseRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateResponse('non-existent-id', updateResponseDto, 'test-user-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('内容が変更されない場合は履歴を記録しないこと', async () => {
      // Arrange
      const noChangeDto = { isPublic: true }; // contentは変更なし
      const updatedResponse = { ...mockResponse, isPublic: true };
      responseRepository.findOne.mockResolvedValue(mockResponse);
      responseRepository.save.mockResolvedValue(updatedResponse);

      // Act
      await service.updateResponse('test-response-id', noChangeDto, 'test-user-id');

      // Assert
      expect(responseHistoryRepository.create).not.toHaveBeenCalled();
      expect(responseHistoryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getResponse', () => {
    it('正常に回答を取得できること', async () => {
      // Arrange
      responseRepository.findOne.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getResponse('test-response-id', 'test-user-id');

      // Assert
      expect(result).toEqual(mockResponse);
      expect(responseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-response-id' },
        relations: ['user', 'inquiry', 'history', 'history.changedByUser'],
      });
    });

    it('存在しない回答IDの場合はエラーを投げること', async () => {
      // Arrange
      responseRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getResponse('non-existent-id', 'test-user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getResponsesByInquiry', () => {
    it('正常に問い合わせの回答一覧を取得できること', async () => {
      // Arrange
      const mockResponses = [mockResponse];
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      responseRepository.find.mockResolvedValue(mockResponses);

      // Act
      const result = await service.getResponsesByInquiry('test-inquiry-id');

      // Assert
      expect(result).toEqual(mockResponses);
      expect(inquiryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-inquiry-id' }
      });
      expect(responseRepository.find).toHaveBeenCalledWith({
        where: { inquiryId: 'test-inquiry-id' },
        relations: ['user', 'history', 'history.changedByUser'],
        order: { createdAt: 'ASC' },
      });
    });

    it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getResponsesByInquiry('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getResponseHistory', () => {
    it('正常に回答履歴を取得できること', async () => {
      // Arrange
      const mockHistory = [mockResponseHistory];
      responseRepository.findOne.mockResolvedValue(mockResponse);
      responseHistoryRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getResponseHistory('test-response-id');

      // Assert
      expect(result).toEqual(mockHistory);
      expect(responseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-response-id' }
      });
      expect(responseHistoryRepository.find).toHaveBeenCalledWith({
        where: { responseId: 'test-response-id' },
        relations: ['changedByUser'],
        order: { changedAt: 'DESC' },
      });
    });

    it('存在しない回答IDの場合はエラーを投げること', async () => {
      // Arrange
      responseRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getResponseHistory('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getResponsesByInquiry (public only)', () => {
    it('正常に公開回答一覧を取得できること', async () => {
      // Arrange
      const publicResponse = { ...mockResponse, isPublic: true };
      const mockPublicResponses = [publicResponse];
      responseRepository.find.mockResolvedValue(mockPublicResponses);

      // Act
      const result = await service.getResponsesByInquiry('test-inquiry-id', 'test-user-id', false);

      // Assert
      expect(result).toEqual(mockPublicResponses);
      expect(responseRepository.find).toHaveBeenCalledWith({
        where: { 
          inquiryId: 'test-inquiry-id',
          isPublic: true 
        },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('deleteResponse', () => {
    it('正常に回答を削除できること', async () => {
      // Arrange
      responseRepository.findOne.mockResolvedValue(mockResponse);
      responseHistoryRepository.delete.mockResolvedValue({ affected: 1, raw: {} });
      responseRepository.remove.mockResolvedValue(mockResponse);

      // Act
      await service.deleteResponse('test-response-id');

      // Assert
      expect(responseHistoryRepository.delete).toHaveBeenCalledWith({ responseId: 'test-response-id' });
      expect(responseRepository.remove).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('getResponseStats', () => {
    it('正常に回答統計を取得できること', async () => {
      // Arrange
      responseRepository.count
        .mockResolvedValueOnce(10) // total responses
        .mockResolvedValueOnce(6); // public responses

      // Act
      const result = await service.getResponseStats('test-inquiry-id');

      // Assert
      expect(result).toEqual({
        totalResponses: 10,
        publicResponses: 6,
        privateResponses: 4,
      });
      expect(responseRepository.count).toHaveBeenCalledTimes(2);
    });

    it('問い合わせIDが指定されない場合は全体統計を取得すること', async () => {
      // Arrange
      responseRepository.count
        .mockResolvedValueOnce(100) // total responses
        .mockResolvedValueOnce(60); // public responses

      // Act
      const result = await service.getResponseStats();

      // Assert
      expect(result).toEqual({
        totalResponses: 100,
        publicResponses: 60,
        privateResponses: 40,
      });
      expect(responseRepository.count).toHaveBeenCalledWith({ where: {} });
    });
  });
});