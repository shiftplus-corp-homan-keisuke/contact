import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TemplatesService } from '../services/templates.service';
import { TemplateMacroService } from '../services/template-macro.service';
import { TemplatesRepository } from '../repositories/templates.repository';
import { Template, TemplateVariable, TemplateUsage } from '../entities';
import { CreateTemplateRequest } from '../types';

describe('TemplatesService', () => {
    let service: TemplatesService;
    let templatesRepository: jest.Mocked<TemplatesRepository>;
    let variableRepository: jest.Mocked<Repository<TemplateVariable>>;
    let usageRepository: jest.Mocked<Repository<TemplateUsage>>;
    let macroService: jest.Mocked<TemplateMacroService>;

    const mockTemplate: Template = {
        id: 'template-1',
        name: 'テストテンプレート',
        category: 'サポート',
        content: 'こんにちは、{{customerName}}様',
        tags: ['挨拶', 'サポート'],
        isShared: false,
        usageCount: 0,
        createdBy: 'user-1',
        variables: [],
        creator: null,
        usages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const mockTemplatesRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findWithFilters: jest.fn(),
            getPopularTemplates: jest.fn(),
            findByUserId: jest.fn(),
            incrementUsageCount: jest.fn(),
        };

        const mockVariableRepository = {
            save: jest.fn(),
            delete: jest.fn(),
        };

        const mockUsageRepository = {
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
        };

        const mockMacroService = {
            getUserMacros: jest.fn(),
            executeMacro: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TemplatesService,
                {
                    provide: TemplatesRepository,
                    useValue: mockTemplatesRepository,
                },
                {
                    provide: TemplateMacroService,
                    useValue: mockMacroService,
                },
                {
                    provide: getRepositoryToken(TemplateVariable),
                    useValue: mockVariableRepository,
                },
                {
                    provide: getRepositoryToken(TemplateUsage),
                    useValue: mockUsageRepository,
                },
            ],
        }).compile();

        service = module.get<TemplatesService>(TemplatesService);
        templatesRepository = module.get(TemplatesRepository);
        macroService = module.get(TemplateMacroService);
        variableRepository = module.get(getRepositoryToken(TemplateVariable));
        usageRepository = module.get(getRepositoryToken(TemplateUsage));

        // macroServiceを使用するテストケースを追加
        macroService.getUserMacros.mockResolvedValue([]);
        macroService.executeMacro.mockResolvedValue('expanded content');
    });

    describe('createTemplate', () => {
        it('テンプレートを正常に作成できること', async () => {
            const createRequest: CreateTemplateRequest = {
                name: 'テストテンプレート',
                category: 'サポート',
                content: 'こんにちは、{{customerName}}様',
                tags: ['挨拶'],
                isShared: false,
            };

            templatesRepository.create.mockResolvedValue(mockTemplate);
            templatesRepository.findById.mockResolvedValue(mockTemplate);

            const result = await service.createTemplate(createRequest, 'user-1');

            expect(templatesRepository.create).toHaveBeenCalledWith({
                ...createRequest,
                createdBy: 'user-1',
                isShared: false,
            });
            expect(result).toEqual(mockTemplate);
        });

        it('変数付きテンプレートを作成できること', async () => {
            const createRequest: CreateTemplateRequest = {
                name: 'テストテンプレート',
                category: 'サポート',
                content: 'こんにちは、{{customerName}}様',
                variables: [
                    {
                        id: 'var-1',
                        name: 'customerName',
                        type: 'text',
                        required: true,
                        description: '顧客名',
                    },
                ],
            };

            templatesRepository.create.mockResolvedValue(mockTemplate);
            templatesRepository.findById.mockResolvedValue(mockTemplate);
            variableRepository.save.mockResolvedValue([{
                id: 'var-1',
                templateId: 'template-1',
                name: 'customerName',
                type: 'text',
                required: true,
                description: '顧客名',
                defaultValue: null,
                options: null,
                orderIndex: 0,
                template: null,
            }]);

            const result = await service.createTemplate(createRequest, 'user-1');

            expect(variableRepository.save).toHaveBeenCalled();
            expect(result).toEqual(mockTemplate);
        });
    });

    describe('getTemplate', () => {
        it('テンプレートを正常に取得できること', async () => {
            templatesRepository.findById.mockResolvedValue(mockTemplate);

            const result = await service.getTemplate('template-1', 'user-1');

            expect(result).toEqual(mockTemplate);
        });

        it('存在しないテンプレートの場合はNotFoundExceptionを投げること', async () => {
            templatesRepository.findById.mockResolvedValue(null);

            await expect(
                service.getTemplate('nonexistent', 'user-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('アクセス権限がない場合はForbiddenExceptionを投げること', async () => {
            const privateTemplate = { ...mockTemplate, isShared: false, createdBy: 'other-user' };
            templatesRepository.findById.mockResolvedValue(privateTemplate);

            await expect(
                service.getTemplate('template-1', 'user-1'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('共有テンプレートは他のユーザーもアクセスできること', async () => {
            const sharedTemplate = { ...mockTemplate, isShared: true, createdBy: 'other-user' };
            templatesRepository.findById.mockResolvedValue(sharedTemplate);

            const result = await service.getTemplate('template-1', 'user-1');

            expect(result).toEqual(sharedTemplate);
        });
    });

    describe('updateTemplate', () => {
        it('テンプレートを正常に更新できること', async () => {
            const updateRequest = {
                name: '更新されたテンプレート',
                content: '更新された内容',
            };

            templatesRepository.findById.mockResolvedValue(mockTemplate);
            templatesRepository.update.mockResolvedValue({ ...mockTemplate, ...updateRequest });

            const result = await service.updateTemplate('template-1', updateRequest, 'user-1');

            expect(templatesRepository.update).toHaveBeenCalledWith('template-1', updateRequest);
            expect(result.name).toBe(updateRequest.name);
        });

        it('他人のテンプレートは更新できないこと', async () => {
            const otherUserTemplate = { ...mockTemplate, createdBy: 'other-user' };
            templatesRepository.findById.mockResolvedValue(otherUserTemplate);

            await expect(
                service.updateTemplate('template-1', { name: '更新' }, 'user-1'),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('deleteTemplate', () => {
        it('テンプレートを正常に削除できること', async () => {
            templatesRepository.findById.mockResolvedValue(mockTemplate);
            templatesRepository.delete.mockResolvedValue(undefined);

            await service.deleteTemplate('template-1', 'user-1');

            expect(templatesRepository.delete).toHaveBeenCalledWith('template-1');
        });

        it('他人のテンプレートは削除できないこと', async () => {
            const otherUserTemplate = { ...mockTemplate, createdBy: 'other-user' };
            templatesRepository.findById.mockResolvedValue(otherUserTemplate);

            await expect(
                service.deleteTemplate('template-1', 'user-1'),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('recordTemplateUsage', () => {
        it('テンプレート使用を正常に記録できること', async () => {
            templatesRepository.findById.mockResolvedValue(mockTemplate);
            usageRepository.create.mockReturnValue({} as TemplateUsage);
            usageRepository.save.mockResolvedValue({} as TemplateUsage);
            templatesRepository.incrementUsageCount.mockResolvedValue(undefined);

            await service.recordTemplateUsage('template-1', 'user-1', 'inquiry-1', 5, 'とても良い');

            expect(usageRepository.create).toHaveBeenCalledWith({
                templateId: 'template-1',
                userId: 'user-1',
                inquiryId: 'inquiry-1',
                rating: 5,
                feedback: 'とても良い',
            });
            expect(templatesRepository.incrementUsageCount).toHaveBeenCalledWith('template-1');
        });
    });
});