/**
 * 問い合わせエンティティのテスト
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from './inquiry.entity';
import { Application } from './application.entity';
import { InquiryStatusHistory } from './inquiry-status-history.entity';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../users/entities/role.entity';

describe('Inquiry Entity', () => {
    let inquiryRepository: Repository<Inquiry>;
    let applicationRepository: Repository<Application>;
    let inquiryStatusHistoryRepository: Repository<InquiryStatusHistory>;
    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [Inquiry, Application, InquiryStatusHistory, User, Role],
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([Inquiry, Application, InquiryStatusHistory, User, Role]),
            ],
        }).compile();

        inquiryRepository = module.get('InquiryRepository');
        applicationRepository = module.get('ApplicationRepository');
        inquiryStatusHistoryRepository = module.get('InquiryStatusHistoryRepository');
        userRepository = module.get('UserRepository');
        roleRepository = module.get('RoleRepository');
    });

    afterAll(async () => {
        await module.close();
    });

    beforeEach(async () => {
        await inquiryStatusHistoryRepository.clear();
        await inquiryRepository.clear();
        await userRepository.clear();
        await roleRepository.clear();
        await applicationRepository.clear();
    });

    describe('基本的なCRUD操作', () => {
        it('問い合わせを作成できる', async () => {
            // アプリケーションの作成
            const app = applicationRepository.create({
                name: 'テストアプリ',
                description: 'テスト用アプリケーション',
                isActive: true,
            });
            const savedApp = await applicationRepository.save(app);

            // 問い合わせの作成
            const inquiry = inquiryRepository.create({
                appId: savedApp.id,
                title: 'テスト問い合わせ',
                content: 'これはテスト用の問い合わせです。',
                status: 'new',
                priority: 'medium',
                category: 'テスト',
                customerEmail: 'customer@example.com',
                customerName: '顧客テスト',
            });
            const savedInquiry = await inquiryRepository.save(inquiry);

            expect(savedInquiry.id).toBeDefined();
            expect(savedInquiry.title).toBe('テスト問い合わせ');
            expect(savedInquiry.content).toBe('これはテスト用の問い合わせです。');
            expect(savedInquiry.status).toBe('new');
            expect(savedInquiry.priority).toBe('medium');
            expect(savedInquiry.appId).toBe(savedApp.id);
            expect(savedInquiry.createdAt).toBeDefined();
            expect(savedInquiry.updatedAt).toBeDefined();
        });

        it('問い合わせとアプリケーションのリレーションが正しく動作する', async () => {
            // アプリケーションの作成
            const app = applicationRepository.create({
                name: 'リレーションテストアプリ',
                description: 'リレーションテスト用',
                isActive: true,
            });
            const savedApp = await applicationRepository.save(app);

            // 問い合わせの作成
            const inquiry = inquiryRepository.create({
                appId: savedApp.id,
                title: 'リレーションテスト',
                content: 'リレーションのテストです。',
                status: 'new',
                priority: 'low',
            });
            const savedInquiry = await inquiryRepository.save(inquiry);

            // リレーションを含む取得
            const inquiryWithApp = await inquiryRepository.findOne({
                where: { id: savedInquiry.id },
                relations: ['app'],
            });

            expect(inquiryWithApp).toBeDefined();
            expect(inquiryWithApp!.app).toBeDefined();
            expect(inquiryWithApp!.app.name).toBe('リレーションテストアプリ');
        });

        it('問い合わせ状態履歴を記録できる', async () => {
            // 必要なデータの準備
            const role = roleRepository.create({
                name: 'support',
                permissions: ['inquiry:update'],
                isActive: true,
            });
            const savedRole = await roleRepository.save(role);

            const user = userRepository.create({
                email: 'support@example.com',
                passwordHash: 'hashed_password',
                name: 'サポート担当者',
                roleId: savedRole.id,
                isActive: true,
            });
            const savedUser = await userRepository.save(user);

            const app = applicationRepository.create({
                name: 'テストアプリ',
                isActive: true,
            });
            const savedApp = await applicationRepository.save(app);

            const inquiry = inquiryRepository.create({
                appId: savedApp.id,
                title: '状態変更テスト',
                content: '状態変更のテストです。',
                status: 'new',
                priority: 'medium',
            });
            const savedInquiry = await inquiryRepository.save(inquiry);

            // 状態履歴の記録
            const statusHistory = inquiryStatusHistoryRepository.create({
                inquiryId: savedInquiry.id,
                oldStatus: 'new',
                newStatus: 'in_progress',
                changedBy: savedUser.id,
                comment: '対応開始',
                changedAt: new Date(),
            });
            const savedStatusHistory = await inquiryStatusHistoryRepository.save(statusHistory);

            expect(savedStatusHistory.id).toBeDefined();
            expect(savedStatusHistory.inquiryId).toBe(savedInquiry.id);
            expect(savedStatusHistory.oldStatus).toBe('new');
            expect(savedStatusHistory.newStatus).toBe('in_progress');
            expect(savedStatusHistory.changedBy).toBe(savedUser.id);
            expect(savedStatusHistory.comment).toBe('対応開始');
        });
    });

    describe('ステータス管理', () => {
        it('有効なステータス値を設定できる', async () => {
            const app = applicationRepository.create({
                name: 'ステータステストアプリ',
                isActive: true,
            });
            const savedApp = await applicationRepository.save(app);

            const validStatuses = ['new', 'in_progress', 'pending', 'resolved', 'closed'];

            for (const status of validStatuses) {
                const inquiry = inquiryRepository.create({
                    appId: savedApp.id,
                    title: `${status}ステータステスト`,
                    content: `${status}ステータスのテストです。`,
                    status: status as any,
                    priority: 'medium',
                });
                const savedInquiry = await inquiryRepository.save(inquiry);
                expect(savedInquiry.status).toBe(status);
            }
        });

        it('有効な優先度値を設定できる', async () => {
            const app = applicationRepository.create({
                name: '優先度テストアプリ',
                isActive: true,
            });
            const savedApp = await applicationRepository.save(app);

            const validPriorities = ['low', 'medium', 'high', 'urgent'];

            for (const priority of validPriorities) {
                const inquiry = inquiryRepository.create({
                    appId: savedApp.id,
                    title: `${priority}優先度テスト`,
                    content: `${priority}優先度のテストです。`,
                    status: 'new',
                    priority: priority as any,
                });
                const savedInquiry = await inquiryRepository.save(inquiry);
                expect(savedInquiry.priority).toBe(priority);
            }
        });
    });

    describe('バリデーション', () => {
        it('必須フィールドが不足している場合はエラーになる', async () => {
            const inquiry = inquiryRepository.create({
                // appId が不足
                title: 'テスト問い合わせ',
                content: 'テスト内容',
                status: 'new',
                priority: 'medium',
            });

            await expect(inquiryRepository.save(inquiry)).rejects.toThrow();
        });

        it('タイトルが長すぎる場合はエラーになる', async () => {
            const app = applicationRepository.create({
                name: 'テストアプリ',
                isActive: true,
            });
            const savedApp = await applicationRepository.save(app);

            const longTitle = 'a'.repeat(501); // 500文字を超える

            const inquiry = inquiryRepository.create({
                appId: savedApp.id,
                title: longTitle,
                content: 'テスト内容',
                status: 'new',
                priority: 'medium',
            });

            await expect(inquiryRepository.save(inquiry)).rejects.toThrow();
        });
    });
});