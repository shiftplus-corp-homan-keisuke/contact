import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TemplateMacroService } from '../services/template-macro.service';
import { Macro } from '../entities/macro.entity';
import { MacroUsage } from '../entities/macro-usage.entity';
import { User } from '../../users/entities/user.entity';

describe('TemplateMacroService', () => {
    let service: TemplateMacroService;
    let macroRepository: jest.Mocked<Repository<Macro>>;
    let macroUsageRepository: jest.Mocked<Repository<MacroUsage>>;

    const mockMacro: Partial<Macro> = {
        id: 'macro-1',
        name: 'test-macro',
        content: 'Hello {{name}}!',
        variables: { name: 'Name' },
        description: 'Test macro',
        isShared: false,
        usageCount: 0,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockUser: Partial<User> = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        roleId: 'role-1',
        isActive: true,
    };

    beforeEach(async () => {
        const mockMacroRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };

        const mockMacroUsageRepository = {
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            find: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TemplateMacroService,
                {
                    provide: getRepositoryToken(Macro),
                    useValue: mockMacroRepository,
                },
                {
                    provide: getRepositoryToken(MacroUsage),
                    useValue: mockMacroUsageRepository,
                },
            ],
        }).compile();

        service = module.get<TemplateMacroService>(TemplateMacroService);
        macroRepository = module.get(getRepositoryToken(Macro));
        macroUsageRepository = module.get(getRepositoryToken(MacroUsage));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createMacro', () => {
        it('新しいマクロを正常に作成できること', async () => {
            macroRepository.findOne.mockResolvedValue(null);
            macroRepository.create.mockReturnValue(mockMacro as Macro);
            macroRepository.save.mockResolvedValue(mockMacro as Macro);

            const result = await service.createMacro(
                'test-macro',
                'Hello {{name}}!',
                { name: 'Name' },
                'user-1',
                'Test macro',
                false,
            );

            expect(macroRepository.findOne).toHaveBeenCalledWith({
                where: { name: 'test-macro', createdBy: 'user-1' },
            });
            expect(macroRepository.create).toHaveBeenCalledWith({
                name: 'test-macro',
                content: 'Hello {{name}}!',
                variables: { name: 'Name' },
                description: 'Test macro',
                isShared: false,
                createdBy: 'user-1',
            });
            expect(result).toEqual(mockMacro);
        });

        it('同名のマクロが存在する場合はエラーを投げること', async () => {
            macroRepository.findOne.mockResolvedValue(mockMacro as Macro);

            await expect(
                service.createMacro(
                    'test-macro',
                    'Hello {{name}}!',
                    { name: 'Name' },
                    'user-1',
                ),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('updateMacro', () => {
        it('マクロを正常に更新できること', async () => {
            const updatedMacro = { ...mockMacro, name: 'updated-macro' };
            macroRepository.findOne.mockResolvedValue(mockMacro as Macro);
            macroRepository.save.mockResolvedValue(updatedMacro as Macro);

            const result = await service.updateMacro('macro-1', 'user-1', {
                name: 'updated-macro',
            });

            expect(macroRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'macro-1' },
            });
            expect(result.name).toBe('updated-macro');
        });

        it('存在しないマクロの場合はエラーを投げること', async () => {
            macroRepository.findOne.mockResolvedValue(null);

            await expect(
                service.updateMacro('non-existent', 'user-1', { name: 'new-name' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('作成者以外が更新しようとした場合はエラーを投げること', async () => {
            macroRepository.findOne.mockResolvedValue(mockMacro as Macro);

            await expect(
                service.updateMacro('macro-1', 'other-user', { name: 'new-name' }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('deleteMacro', () => {
        it('マクロを正常に削除できること', async () => {
            macroRepository.findOne.mockResolvedValue(mockMacro as Macro);
            macroRepository.remove.mockResolvedValue(mockMacro as Macro);

            await service.deleteMacro('macro-1', 'user-1');

            expect(macroRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'macro-1' },
            });
            expect(macroRepository.remove).toHaveBeenCalledWith(mockMacro);
        });

        it('存在しないマクロの場合はエラーを投げること', async () => {
            macroRepository.findOne.mockResolvedValue(null);

            await expect(service.deleteMacro('non-existent', 'user-1')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('作成者以外が削除しようとした場合はエラーを投げること', async () => {
            macroRepository.findOne.mockResolvedValue(mockMacro as Macro);

            await expect(service.deleteMacro('macro-1', 'other-user')).rejects.toThrow(
                ForbiddenException,
            );
        });
    });

    describe('executeMacro', () => {
        it('マクロを正常に実行できること', async () => {
            macroRepository.findOne.mockResolvedValue(mockMacro as Macro);
            macroRepository.update.mockResolvedValue({ affected: 1 } as any);
            macroUsageRepository.create.mockReturnValue({} as MacroUsage);
            macroUsageRepository.save.mockResolvedValue({} as MacroUsage);

            const result = await service.executeMacro('macro-1', 'user-1', {
                name: 'World',
            });

            expect(result).toBe('Hello World!');
            expect(macroRepository.update).toHaveBeenCalledWith('macro-1', {
                usageCount: expect.any(Function),
            });
        });

        it('存在しないマクロの場合はエラーを投げること', async () => {
            macroRepository.findOne.mockResolvedValue(null);

            await expect(
                service.executeMacro('non-existent', 'user-1', { name: 'World' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('非共有マクロに他のユーザーがアクセスした場合はエラーを投げること', async () => {
            macroRepository.findOne.mockResolvedValue(mockMacro as Macro);

            await expect(
                service.executeMacro('macro-1', 'other-user', { name: 'World' }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('共有マクロには他のユーザーもアクセスできること', async () => {
            const sharedMacro = { ...mockMacro, isShared: true };
            macroRepository.findOne.mockResolvedValue(sharedMacro as Macro);
            macroRepository.update.mockResolvedValue({ affected: 1 } as any);
            macroUsageRepository.create.mockReturnValue({} as MacroUsage);
            macroUsageRepository.save.mockResolvedValue({} as MacroUsage);

            const result = await service.executeMacro('macro-1', 'other-user', {
                name: 'World',
            });

            expect(result).toBe('Hello World!');
        });
    });

    describe('getUserMacros', () => {
        it('ユーザーのマクロ一覧を取得できること', async () => {
            const macros = [mockMacro];
            macroRepository.find.mockResolvedValue(macros as Macro[]);

            const result = await service.getUserMacros('user-1');

            expect(macroRepository.find).toHaveBeenCalledWith({
                where: [{ createdBy: 'user-1' }, { isShared: true }],
                order: { createdAt: 'DESC' },
            });
            expect(result).toEqual(macros);
        });
    });

    describe('getPopularMacros', () => {
        it('人気のマクロを取得できること', async () => {
            const macros = [mockMacro];
            macroRepository.find.mockResolvedValue(macros as Macro[]);

            const result = await service.getPopularMacros(10);

            expect(macroRepository.find).toHaveBeenCalledWith({
                where: { isShared: true },
                order: { usageCount: 'DESC' },
                take: 10,
            });
            expect(result).toEqual(macros);
        });
    });

    describe('getMacroUsageStats', () => {
        it('マクロの使用統計を取得できること', async () => {
            macroRepository.findOne.mockResolvedValue(mockMacro as Macro);
            macroUsageRepository.count.mockResolvedValue(5);
            macroUsageRepository.find.mockResolvedValue([
                {
                    id: 'usage-1',
                    macroId: 'macro-1',
                    userId: 'user-1',
                    expandedVariables: { name: 'World' },
                    expandedContent: 'Hello World!',
                    usedAt: new Date(),
                    macro: mockMacro as Macro,
                    user: mockUser as User,
                } as MacroUsage,
            ]);

            const result = await service.getMacroUsageStats('macro-1', 'user-1');

            expect(result.totalUsage).toBe(5);
            expect(result.recentUsage).toHaveLength(1);
        });
    });
});