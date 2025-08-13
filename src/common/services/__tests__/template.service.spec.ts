/**
 * テンプレートサービステスト
 * 要件: 10.1, 10.2, 10.3 (テンプレート管理システム)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TemplateService } from '../../../modules/templates/services/template.service';
import { TemplateRepository } from '../../repositories/template.repository';
import { HybridSearchService } from '../../../modules/search/services/hybrid-search.service';
import { Template } from '../../entities/template.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { Application } from '../../entities/application.entity';
import { CreateTemplateDto, UseTemplateDto } from '../../dto/template.dto';
import { TemplateVariableType, TemplateUsageContext } from '../../types/template.types';

describe('TemplateService', () => {
  let service: TemplateService;
  let templateRepository: jest.Mocked<TemplateRepository>;
  let userRepository: jest.Mocked<Repository<User>>;
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let hybridSearchService: jest.Mocked<HybridSearchService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: { id: 'role-1', name: 'user' },
  };

  const mockTemplate = {
    id: 'template-1',
    name: 'Test Template',
    content: 'Hello {{name}}, your inquiry {{inquiry_id}} has been received.',
    category: 'greeting',
    description: 'Test template',
    createdBy: 'user-1',
    isShared: false,
    isActive: true,
    usageCount: 0,
    effectivenessScore: null,
    tags: ['test'],
    variables: [
      {
        id: 'var-1',
        name: 'name',
        type: TemplateVariableType.TEXT,
        isRequired: true,
      },
      {
        id: 'var-2',
        name: 'inquiry_id',
        type: TemplateVariableType.TEXT,
        isRequired: true,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockTemplateRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      search: jest.fn(),
      createVariable: jest.fn(),
      createUsage: jest.fn(),
      incrementUsageCount: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockApplicationRepository = {
      findOne: jest.fn(),
    };

    const mockHybridSearchService = {
      embedText: jest.fn(),
      storeVector: jest.fn(),
      updateVector: jest.fn(),
      hybridSearch: jest.fn(),
      vectorSearch: jest.fn(),
      fullTextSearch: jest.fn(),
      ragSearch: jest.fn(),
      deleteVector: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: TemplateRepository,
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepository,
        },
        {
          provide: HybridSearchService,
          useValue: mockHybridSearchService,
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    templateRepository = module.get(TemplateRepository);
    userRepository = module.get(getRepositoryToken(User));
    applicationRepository = module.get(getRepositoryToken(Application));
    hybridSearchService = module.get(HybridSearchService);
  });

  describe('createTemplate', () => {
    it('テンプレートを正常に作成できること', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Test Template',
        content: 'Hello {{name}}',
        category: 'greeting',
        description: 'Test template',
        isShared: false,
        tags: ['test'],
        variables: [
          {
            name: 'name',
            type: TemplateVariableType.TEXT,
            isRequired: true,
          },
        ],
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);
      templateRepository.create.mockResolvedValue(mockTemplate as any);
      templateRepository.findById.mockResolvedValue(mockTemplate as any);
      templateRepository.createVariable.mockResolvedValue({} as any);
      hybridSearchService.embedText.mockResolvedValue([0.1, 0.2, 0.3]);
      hybridSearchService.storeVector.mockResolvedValue();

      const result = await service.createTemplate(createDto, 'user-1');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Template');
      expect(templateRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        content: createDto.content,
        category: createDto.category,
        description: createDto.description,
        appId: undefined,
        createdBy: 'user-1',
        isShared: false,
        tags: ['test'],
      });
      expect(templateRepository.createVariable).toHaveBeenCalled();
      expect(hybridSearchService.storeVector).toHaveBeenCalled();
    });

    it('存在しないユーザーの場合はエラーを投げること', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Test Template',
        content: 'Hello {{name}}',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.createTemplate(createDto, 'invalid-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('useTemplate', () => {
    it('テンプレートを正常に使用できること', async () => {
      const useDto: UseTemplateDto = {
        templateId: 'template-1',
        variables: {
          name: 'John Doe',
          inquiry_id: 'INQ-001',
        },
        context: TemplateUsageContext.RESPONSE,
      };

      templateRepository.findById.mockResolvedValue(mockTemplate as any);
      templateRepository.createUsage.mockResolvedValue({ id: 'usage-1' } as any);
      templateRepository.incrementUsageCount.mockResolvedValue();

      const result = await service.useTemplate(useDto, 'user-1');

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello John Doe, your inquiry INQ-001 has been received.');
      expect(result.variables).toEqual(useDto.variables);
      expect(result.usageId).toBe('usage-1');
      expect(templateRepository.createUsage).toHaveBeenCalled();
      expect(templateRepository.incrementUsageCount).toHaveBeenCalledWith('template-1');
    });

    it('必須変数が不足している場合はエラーを含むこと', async () => {
      const useDto: UseTemplateDto = {
        templateId: 'template-1',
        variables: {
          name: 'John Doe',
          // inquiry_id が不足
        },
      };

      templateRepository.findById.mockResolvedValue(mockTemplate as any);
      templateRepository.createUsage.mockResolvedValue({ id: 'usage-1' } as any);
      templateRepository.incrementUsageCount.mockResolvedValue();

      const result = await service.useTemplate(useDto, 'user-1');

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].variable).toBe('inquiry_id');
      expect(result.errors[0].type).toBe('missing');
    });

    it('存在しないテンプレートの場合はエラーを投げること', async () => {
      const useDto: UseTemplateDto = {
        templateId: 'invalid-template',
        variables: {},
      };

      templateRepository.findById.mockResolvedValue(null);

      await expect(service.useTemplate(useDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTemplate', () => {
    it('テンプレートを正常に取得できること', async () => {
      templateRepository.findById.mockResolvedValue(mockTemplate as any);

      const result = await service.getTemplate('template-1', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('template-1');
      expect(result.name).toBe('Test Template');
    });

    it('存在しないテンプレートの場合はエラーを投げること', async () => {
      templateRepository.findById.mockResolvedValue(null);

      await expect(service.getTemplate('invalid-template', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('アクセス権限がない場合はエラーを投げること', async () => {
      const restrictedTemplate = {
        ...mockTemplate,
        createdBy: 'other-user',
        isShared: false,
      };

      templateRepository.findById.mockResolvedValue(restrictedTemplate as any);
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        role: { name: 'user' },
      } as any);

      await expect(service.getTemplate('template-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('suggestTemplates', () => {
    it('テンプレート提案を正常に取得できること', async () => {
      const suggestionDto = {
        content: 'I need help with login',
        limit: 5,
      };

      const searchResults = [
        {
          id: 'template-1',
          combinedScore: 0.8,
        },
      ];

      hybridSearchService.hybridSearch.mockResolvedValue(searchResults as any);
      templateRepository.findById.mockResolvedValue(mockTemplate as any);

      const result = await service.suggestTemplates(suggestionDto, 'user-1');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].templateId).toBe('template-1');
      expect(result[0].relevanceScore).toBe(0.8);
    });
  });
});