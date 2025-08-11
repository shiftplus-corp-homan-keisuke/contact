/**
 * 問い合わせサービスのユニットテスト
 * 要件: 1.1, 1.3, 1.4 (問い合わせ登録・管理機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InquiryService } from '../inquiry.service';
import { Inquiry } from '../../entities/inquiry.entity';
import { Application } from '../../entities/application.entity';
import { User } from '../../entities/user.entity';
import { CreateInquiryDto, UpdateInquiryDto } from '../../dto/inquiry.dto';
import { InquiryStatus, InquiryPriority } from '../../types/inquiry.types';

describe('InquiryService', () => {
  let service: InquiryService;
  let inquiryRepository: jest.Mocked<Repository<Inquiry>>;
  let applicationRepository: jest.Mocked<Repository<Application>>;
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

  const mockApplication: Application = {
    id: 'test-app-id',
    name: 'テストアプリ',
    description: 'テストアプリケーション',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    inquiries: [],
    faqs: [],
    apiKeys: [],
    templates: [],
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiryService,
        {
          provide: getRepositoryToken(Inquiry),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Application),
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

    service = module.get<InquiryService>(InquiryService);
    inquiryRepository = module.get(getRepositoryToken(Inquiry));
    applicationRepository = module.get(getRepositoryToken(Application));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInquiry', () => {
    const createInquiryDto: CreateInquiryDto = {
      title: 'テスト問い合わせ',
      content: 'テスト内容',
      appId: 'test-app-id',
      customerEmail: 'test@example.com',
      customerName: 'テストユーザー',
      category: 'テストカテゴリ',
      priority: InquiryPriority.MEDIUM,
    };

    it('正常に問い合わせを作成できること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      inquiryRepository.create.mockReturnValue(mockInquiry);
      inquiryRepository.save.mockResolvedValue(mockInquiry);

      // Act
      const result = await service.createInquiry(createInquiryDto);

      // Assert
      expect(result).toEqual(mockInquiry);
      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: createInquiryDto.appId }
      });
      expect(inquiryRepository.create).toHaveBeenCalledWith({
        ...createInquiryDto,
        status: InquiryStatus.NEW,
        priority: InquiryPriority.MEDIUM,
      });
      expect(inquiryRepository.save).toHaveBeenCalledWith(mockInquiry);
    });

    it('必須項目が不足している場合はエラーを投げること', async () => {
      // Arrange
      const invalidDto = { ...createInquiryDto, title: '' };

      // Act & Assert
      await expect(service.createInquiry(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('存在しないアプリケーションIDの場合はエラーを投げること', async () => {
      // Arrange
      applicationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createInquiry(createInquiryDto)).rejects.toThrow(BadRequestException);
    });

    it('無効なメールアドレスの場合はエラーを投げること', async () => {
      // Arrange
      const invalidDto = { ...createInquiryDto, customerEmail: 'invalid-email' };

      // Act & Assert
      await expect(service.createInquiry(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInquiry', () => {
    it('正常に問い合わせを取得できること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);

      // Act
      const result = await service.getInquiry('test-inquiry-id');

      // Assert
      expect(result).toEqual(mockInquiry);
      expect(inquiryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-inquiry-id' },
        relations: ['application', 'assignedUser', 'responses', 'statusHistory'],
      });
    });

    it('存在しない問い合わせIDの場合はエラーを投げること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getInquiry('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateInquiry', () => {
    const updateInquiryDto: UpdateInquiryDto = {
      title: '更新されたタイトル',
      category: '更新されたカテゴリ',
      priority: InquiryPriority.HIGH,
      assignedTo: 'test-user-id',
    };

    it('正常に問い合わせを更新できること', async () => {
      // Arrange
      const updatedInquiry = { ...mockInquiry, ...updateInquiryDto };
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      userRepository.findOne.mockResolvedValue(mockUser);
      inquiryRepository.save.mockResolvedValue(updatedInquiry);

      // Act
      const result = await service.updateInquiry('test-inquiry-id', updateInquiryDto);

      // Assert
      expect(result).toEqual(updatedInquiry);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: updateInquiryDto.assignedTo }
      });
      expect(inquiryRepository.save).toHaveBeenCalled();
    });

    it('存在しない担当者IDの場合はエラーを投げること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateInquiry('test-inquiry-id', updateInquiryDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getInquiries', () => {
    it('正常に問い合わせ一覧を取得できること', async () => {
      // Arrange
      const mockInquiries = [mockInquiry];
      const total = 1;
      inquiryRepository.findAndCount.mockResolvedValue([mockInquiries, total]);

      // Act
      const result = await service.getInquiries(1, 20);

      // Assert
      expect(result).toEqual({
        items: mockInquiries,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(inquiryRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['application', 'assignedUser'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('validateInquiryData', () => {
    it('有効なデータの場合はバリデーションが成功すること', async () => {
      // Arrange
      const validDto: CreateInquiryDto = {
        title: 'テスト問い合わせ',
        content: 'テスト内容',
        appId: 'test-app-id',
        customerEmail: 'test@example.com',
      };

      // Act
      const result = await service.validateInquiryData(validDto);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('必須項目が不足している場合はバリデーションが失敗すること', async () => {
      // Arrange
      const invalidDto: CreateInquiryDto = {
        title: '',
        content: '',
        appId: '',
      };

      // Act
      const result = await service.validateInquiryData(invalidDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map(e => e.field)).toContain('title');
      expect(result.errors.map(e => e.field)).toContain('content');
      expect(result.errors.map(e => e.field)).toContain('appId');
    });

    it('タイトルが長すぎる場合はバリデーションが失敗すること', async () => {
      // Arrange
      const invalidDto: CreateInquiryDto = {
        title: 'a'.repeat(501), // 501文字
        content: 'テスト内容',
        appId: 'test-app-id',
      };

      // Act
      const result = await service.validateInquiryData(invalidDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'title' && e.code === 'MAX_LENGTH_EXCEEDED')).toBe(true);
    });

    it('無効なメールアドレスの場合はバリデーションが失敗すること', async () => {
      // Arrange
      const invalidDto: CreateInquiryDto = {
        title: 'テスト問い合わせ',
        content: 'テスト内容',
        appId: 'test-app-id',
        customerEmail: 'invalid-email',
      };

      // Act
      const result = await service.validateInquiryData(invalidDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'customerEmail' && e.code === 'INVALID_EMAIL_FORMAT')).toBe(true);
    });
  });

  describe('deleteInquiry', () => {
    it('正常に問い合わせを削除できること', async () => {
      // Arrange
      inquiryRepository.findOne.mockResolvedValue(mockInquiry);
      inquiryRepository.remove.mockResolvedValue(mockInquiry);

      // Act
      await service.deleteInquiry('test-inquiry-id');

      // Assert
      expect(inquiryRepository.remove).toHaveBeenCalledWith(mockInquiry);
    });
  });
});