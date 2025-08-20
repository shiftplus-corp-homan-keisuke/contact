import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { TemplatesModule } from '../templates.module';
import { Macro } from '../entities/macro.entity';
import { MacroUsage } from '../entities/macro-usage.entity';

describe('Macro Integration Tests', () => {
    let app: INestApplication;
    let macroRepository: Repository<Macro>;
    let macroUsageRepository: Repository<MacroUsage>;

    const testUser = {
        id: 'test-user-1',
        name: 'Test User',
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [Macro, MacroUsage],
                    synchronize: true,
                }),
                TemplatesModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        macroRepository = moduleFixture.get('MacroRepository');
        macroUsageRepository = moduleFixture.get('MacroUsageRepository');
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(async () => {
        await macroRepository.clear();
        await macroUsageRepository.clear();
    });

    describe('POST /macros', () => {
        it('新しいマクロを作成できること', async () => {
            const createMacroDto = {
                name: 'greeting-macro',
                content: 'こんにちは、{{customer_name}}様。{{message}}',
                variables: {
                    customer_name: '顧客名',
                    message: 'メッセージ',
                },
                description: '挨拶用マクロ',
                isShared: false,
            };

            const response = await request(app.getHttpServer())
                .post('/macros')
                .send(createMacroDto)
                .expect(201);

            expect(response.body).toMatchObject({
                name: 'greeting-macro',
                content: 'こんにちは、{{customer_name}}様。{{message}}',
                variables: {
                    customer_name: '顧客名',
                    message: 'メッセージ',
                },
                description: '挨拶用マクロ',
                isShared: false,
                usageCount: 0,
            });
            expect(response.body.id).toBeDefined();
            expect(response.body.createdAt).toBeDefined();
        });

        it('同名のマクロが存在する場合はエラーを返すこと', async () => {
            // 最初のマクロを作成
            await macroRepository.save({
                name: 'duplicate-macro',
                content: 'Test content',
                variables: {},
                createdBy: testUser.id,
            });

            const createMacroDto = {
                name: 'duplicate-macro',
                content: 'Another content',
                variables: {},
            };

            await request(app.getHttpServer())
                .post('/macros')
                .send(createMacroDto)
                .expect(400);
        });
    });

    describe('GET /macros', () => {
        it('ユーザーのマクロ一覧を取得できること', async () => {
            // テストデータを作成
            await macroRepository.save([
                {
                    name: 'user-macro-1',
                    content: 'Content 1',
                    variables: {},
                    createdBy: testUser.id,
                    isShared: false,
                },
                {
                    name: 'user-macro-2',
                    content: 'Content 2',
                    variables: {},
                    createdBy: testUser.id,
                    isShared: true,
                },
                {
                    name: 'shared-macro',
                    content: 'Shared content',
                    variables: {},
                    createdBy: 'other-user',
                    isShared: true,
                },
            ]);

            const response = await request(app.getHttpServer())
                .get('/macros')
                .expect(200);

            expect(response.body).toHaveLength(3); // 自分のマクロ2つ + 共有マクロ1つ
            expect(response.body.map((m: any) => m.name)).toContain('user-macro-1');
            expect(response.body.map((m: any) => m.name)).toContain('user-macro-2');
            expect(response.body.map((m: any) => m.name)).toContain('shared-macro');
        });
    });

    describe('POST /macros/:id/execute', () => {
        it('マクロを実行して変数を展開できること', async () => {
            // テストマクロを作成
            const macro = await macroRepository.save({
                name: 'test-macro',
                content: 'Hello {{name}}! Your order {{order_id}} is ready.',
                variables: {
                    name: 'Customer Name',
                    order_id: 'Order ID',
                },
                createdBy: testUser.id,
                isShared: false,
                usageCount: 0,
            });

            const executeMacroDto = {
                variableValues: {
                    name: '田中太郎',
                    order_id: 'ORD-12345',
                },
            };

            const response = await request(app.getHttpServer())
                .post(`/macros/${macro.id}/execute`)
                .send(executeMacroDto)
                .expect(200);

            expect(response.body).toMatchObject({
                expandedContent: 'Hello 田中太郎! Your order ORD-12345 is ready.',
                variableValues: {
                    name: '田中太郎',
                    order_id: 'ORD-12345',
                },
            });

            // 使用回数が増加していることを確認
            const updatedMacro = await macroRepository.findOne({
                where: { id: macro.id },
            });
            expect(updatedMacro?.usageCount).toBe(1);

            // 使用統計が記録されていることを確認
            const usageCount = await macroUsageRepository.count({
                where: { macroId: macro.id },
            });
            expect(usageCount).toBe(1);
        });

        it('存在しないマクロの実行時はエラーを返すこと', async () => {
            const executeMacroDto = {
                variableValues: { name: 'Test' },
            };

            await request(app.getHttpServer())
                .post('/macros/non-existent-id/execute')
                .send(executeMacroDto)
                .expect(404);
        });
    });

    describe('PUT /macros/:id', () => {
        it('マクロを更新できること', async () => {
            // テストマクロを作成
            const macro = await macroRepository.save({
                name: 'original-name',
                content: 'Original content',
                variables: {},
                createdBy: testUser.id,
            });

            const updateMacroDto = {
                name: 'updated-name',
                content: 'Updated content',
                description: 'Updated description',
            };

            const response = await request(app.getHttpServer())
                .put(`/macros/${macro.id}`)
                .send(updateMacroDto)
                .expect(200);

            expect(response.body).toMatchObject({
                name: 'updated-name',
                content: 'Updated content',
                description: 'Updated description',
            });
        });
    });

    describe('DELETE /macros/:id', () => {
        it('マクロを削除できること', async () => {
            // テストマクロを作成
            const macro = await macroRepository.save({
                name: 'to-be-deleted',
                content: 'Content',
                variables: {},
                createdBy: testUser.id,
            });

            await request(app.getHttpServer())
                .delete(`/macros/${macro.id}`)
                .expect(204);

            // マクロが削除されていることを確認
            const deletedMacro = await macroRepository.findOne({
                where: { id: macro.id },
            });
            expect(deletedMacro).toBeNull();
        });
    });

    describe('GET /macros/popular', () => {
        it('人気のマクロを取得できること', async () => {
            // テストデータを作成
            await macroRepository.save([
                {
                    name: 'popular-macro-1',
                    content: 'Content 1',
                    variables: {},
                    createdBy: testUser.id,
                    isShared: true,
                    usageCount: 10,
                },
                {
                    name: 'popular-macro-2',
                    content: 'Content 2',
                    variables: {},
                    createdBy: testUser.id,
                    isShared: true,
                    usageCount: 5,
                },
                {
                    name: 'unpopular-macro',
                    content: 'Content 3',
                    variables: {},
                    createdBy: testUser.id,
                    isShared: true,
                    usageCount: 1,
                },
            ]);

            const response = await request(app.getHttpServer())
                .get('/macros/popular?limit=2')
                .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body[0].name).toBe('popular-macro-1');
            expect(response.body[1].name).toBe('popular-macro-2');
        });
    });
});