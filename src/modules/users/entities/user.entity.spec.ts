/**
 * ユーザーエンティティのテスト
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { UserHistory } from './user-history.entity';

describe('User Entity', () => {
    let userRepository: Repository<User>;
    let roleRepository: Repository<Role>;
    let userHistoryRepository: Repository<UserHistory>;
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [User, Role, UserHistory],
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([User, Role, UserHistory]),
            ],
        }).compile();

        userRepository = module.get('UserRepository');
        roleRepository = module.get('RoleRepository');
        userHistoryRepository = module.get('UserHistoryRepository');
    });

    afterAll(async () => {
        await module.close();
    });

    beforeEach(async () => {
        await userHistoryRepository.clear();
        await userRepository.clear();
        await roleRepository.clear();
    });

    describe('基本的なCRUD操作', () => {
        it('ロールとユーザーを作成できる', async () => {
            // ロールの作成
            const role = roleRepository.create({
                name: 'admin',
                description: 'システム管理者',
                permissions: ['user:create', 'user:read', 'user:update', 'user:delete'],
                isActive: true,
            });
            const savedRole = await roleRepository.save(role);

            // ユーザーの作成
            const user = userRepository.create({
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                name: 'テストユーザー',
                roleId: savedRole.id,
                isActive: true,
            });
            const savedUser = await userRepository.save(user);

            expect(savedUser.id).toBeDefined();
            expect(savedUser.email).toBe('test@example.com');
            expect(savedUser.name).toBe('テストユーザー');
            expect(savedUser.roleId).toBe(savedRole.id);
            expect(savedUser.createdAt).toBeDefined();
            expect(savedUser.updatedAt).toBeDefined();
        });

        it('ユーザーとロールのリレーションが正しく動作する', async () => {
            // ロールの作成
            const role = roleRepository.create({
                name: 'support',
                description: 'サポート担当者',
                permissions: ['inquiry:read', 'inquiry:update'],
                isActive: true,
            });
            const savedRole = await roleRepository.save(role);

            // ユーザーの作成
            const user = userRepository.create({
                email: 'support@example.com',
                passwordHash: 'hashed_password',
                name: 'サポート担当者',
                roleId: savedRole.id,
                isActive: true,
            });
            const savedUser = await userRepository.save(user);

            // リレーションを含む取得
            const userWithRole = await userRepository.findOne({
                where: { id: savedUser.id },
                relations: ['role'],
            });

            expect(userWithRole).toBeDefined();
            expect(userWithRole!.role).toBeDefined();
            expect(userWithRole!.role.name).toBe('support');
            expect(userWithRole!.role.permissions).toContain('inquiry:read');
        });

        it('ユーザー履歴を記録できる', async () => {
            // ロールの作成
            const role = roleRepository.create({
                name: 'admin',
                permissions: ['user:create'],
                isActive: true,
            });
            const savedRole = await roleRepository.save(role);

            // ユーザーの作成
            const user = userRepository.create({
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                name: 'テストユーザー',
                roleId: savedRole.id,
                isActive: true,
            });
            const savedUser = await userRepository.save(user);

            // 管理者ユーザーの作成
            const adminUser = userRepository.create({
                email: 'admin@example.com',
                passwordHash: 'hashed_password',
                name: '管理者',
                roleId: savedRole.id,
                isActive: true,
            });
            const savedAdminUser = await userRepository.save(adminUser);

            // ユーザー履歴の記録
            const history = userHistoryRepository.create({
                userId: savedUser.id,
                fieldName: 'name',
                oldValue: 'テストユーザー',
                newValue: '更新されたユーザー',
                changedBy: savedAdminUser.id,
                changedAt: new Date(),
                comment: 'ユーザー名の更新',
            });
            const savedHistory = await userHistoryRepository.save(history);

            expect(savedHistory.id).toBeDefined();
            expect(savedHistory.userId).toBe(savedUser.id);
            expect(savedHistory.fieldName).toBe('name');
            expect(savedHistory.oldValue).toBe('テストユーザー');
            expect(savedHistory.newValue).toBe('更新されたユーザー');
            expect(savedHistory.changedBy).toBe(savedAdminUser.id);
        });

        it('メールアドレスの一意制約が動作する', async () => {
            // ロールの作成
            const role = roleRepository.create({
                name: 'admin',
                permissions: ['user:create'],
                isActive: true,
            });
            const savedRole = await roleRepository.save(role);

            // 最初のユーザーの作成
            const user1 = userRepository.create({
                email: 'duplicate@example.com',
                passwordHash: 'hashed_password',
                name: 'ユーザー1',
                roleId: savedRole.id,
                isActive: true,
            });
            await userRepository.save(user1);

            // 同じメールアドレスで2番目のユーザーを作成しようとする
            const user2 = userRepository.create({
                email: 'duplicate@example.com',
                passwordHash: 'hashed_password',
                name: 'ユーザー2',
                roleId: savedRole.id,
                isActive: true,
            });

            await expect(userRepository.save(user2)).rejects.toThrow();
        });
    });

    describe('バリデーション', () => {
        it('必須フィールドが不足している場合はエラーになる', async () => {
            const user = userRepository.create({
                // email が不足
                passwordHash: 'hashed_password',
                name: 'テストユーザー',
                roleId: 'some-role-id',
                isActive: true,
            });

            await expect(userRepository.save(user)).rejects.toThrow();
        });
    });
});