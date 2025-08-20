import { Test, TestingModule } from '@nestjs/testing';
import { MacroController } from '../controllers/macro.controller';
import { TemplateMacroService } from '../services/template-macro.service';
import { CreateMacroDto, UpdateMacroDto, ExecuteMacroDto } from '../dto/macro.dto';

describe('MacroController', () => {
    let controller: MacroController;
    let service: jest.Mocked<TemplateMacroService>;

    const mockMacro = {
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

    const mockRequest = {
        user: { id: 'user-1', name: 'Test User' },
    };

    beforeEach(async () => {
        const mockService = {
            createMacro: jest.fn(),
            updateMacro: jest.fn(),
            deleteMacro: jest.fn(),
            getUserMacros: jest.fn(),
            getMacroById: jest.fn(),
            executeMacro: jest.fn(),
            getMacroUsageStats: jest.fn(),
            getPopularMacros: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MacroController],
            providers: [
                {
                    provide: TemplateMacroService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<MacroController>(MacroController);
        service = module.get(TemplateMacroService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createMacro', () => {
        it('マクロを正常に作成できること', async () => {
            const createMacroDto: CreateMacroDto = {
                name: 'test-macro',
                content: 'Hello {{name}}!',
                variables: { name: 'Name' },
                description: 'Test macro',
                isShared: false,
            };

            service.createMacro.mockResolvedValue(mockMacro as any);

            const result = await controller.createMacro(createMacroDto, mockRequest);

            expect(service.createMacro).toHaveBeenCalledWith(
                'test-macro',
                'Hello {{name}}!',
                { name: 'Name' },
                'user-1',
                'Test macro',
                false,
            );
            expect(result.id).toBe('macro-1');
            expect(result.name).toBe('test-macro');
        });
    });

    describe('getUserMacros', () => {
        it('ユーザーのマクロ一覧を取得できること', async () => {
            service.getUserMacros.mockResolvedValue([mockMacro] as any);

            const result = await controller.getUserMacros(mockRequest);

            expect(service.getUserMacros).toHaveBeenCalledWith('user-1');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('macro-1');
        });
    });

    describe('getPopularMacros', () => {
        it('人気のマクロを取得できること', async () => {
            service.getPopularMacros.mockResolvedValue([mockMacro] as any);

            const result = await controller.getPopularMacros(10);

            expect(service.getPopularMacros).toHaveBeenCalledWith(10);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('macro-1');
        });
    });

    describe('getMacroById', () => {
        it('マクロの詳細を取得できること', async () => {
            service.getMacroById.mockResolvedValue(mockMacro as any);

            const result = await controller.getMacroById('macro-1', mockRequest);

            expect(service.getMacroById).toHaveBeenCalledWith('macro-1', 'user-1');
            expect(result.id).toBe('macro-1');
        });
    });

    describe('updateMacro', () => {
        it('マクロを正常に更新できること', async () => {
            const updateMacroDto: UpdateMacroDto = {
                name: 'updated-macro',
                description: 'Updated description',
            };

            const updatedMacro = { ...mockMacro, ...updateMacroDto };
            service.updateMacro.mockResolvedValue(updatedMacro as any);

            const result = await controller.updateMacro('macro-1', updateMacroDto, mockRequest);

            expect(service.updateMacro).toHaveBeenCalledWith('macro-1', 'user-1', updateMacroDto);
            expect(result.name).toBe('updated-macro');
        });
    });

    describe('deleteMacro', () => {
        it('マクロを正常に削除できること', async () => {
            service.deleteMacro.mockResolvedValue();

            await controller.deleteMacro('macro-1', mockRequest);

            expect(service.deleteMacro).toHaveBeenCalledWith('macro-1', 'user-1');
        });
    });

    describe('executeMacro', () => {
        it('マクロを正常に実行できること', async () => {
            const executeMacroDto: ExecuteMacroDto = {
                variableValues: { name: 'World' },
            };

            service.executeMacro.mockResolvedValue('Hello World!');

            const result = await controller.executeMacro('macro-1', executeMacroDto, mockRequest);

            expect(service.executeMacro).toHaveBeenCalledWith('macro-1', 'user-1', {
                name: 'World',
            });
            expect(result.expandedContent).toBe('Hello World!');
            expect(result.variableValues).toEqual({ name: 'World' });
        });
    });

    describe('getMacroUsageStats', () => {
        it('マクロの使用統計を取得できること', async () => {
            const mockStats = {
                totalUsage: 5,
                recentUsage: [
                    {
                        id: 'usage-1',
                        expandedVariables: { name: 'World' },
                        expandedContent: 'Hello World!',
                        usedAt: new Date(),
                        user: { id: 'user-1', name: 'Test User' },
                    },
                ],
            };

            service.getMacroUsageStats.mockResolvedValue(mockStats as any);

            const result = await controller.getMacroUsageStats('macro-1', mockRequest);

            expect(service.getMacroUsageStats).toHaveBeenCalledWith('macro-1', 'user-1');
            expect(result.totalUsage).toBe(5);
            expect(result.recentUsage).toHaveLength(1);
        });
    });
});