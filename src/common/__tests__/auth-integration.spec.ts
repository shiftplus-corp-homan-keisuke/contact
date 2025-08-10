/**
 * 認証・権限管理システムの統合テスト
 * 要件: 5.1, 5.2, 5.3, 5.4 (権限管理機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';

import { AuthModule } from '../modules/auth.module';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuthAttempt } from '../entities/auth-attempt.entity';
import { UserHistory } from '../entities/user-history.entity';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';
import { PermissionService } from '../services/permission.service';
import { ResourceType, ActionType, RoleType } from '../types/role.types';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let roleService: RoleService;
  let permissionService: PermissionService;
  let adminToken: string;
  let supportToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, Role, AuthAttempt, UserHistory],
          synchronize: true,
          logging: false,
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    roleService = moduleFixture.get<RoleService>(RoleService);
    permissionService = moduleFixture.get<PermissionService>(PermissionService);

    // 事前定義された役割を作成
    await permissionService.createPredefinedRoles();

    // テスト用ユーザーを作成
    const adminRole = await roleService.getRoleByName(RoleType.ADMIN);
    const supportRole = await roleService.getRoleByName(RoleType.SUPPORT_STAFF);
    const viewerRole = await roleService.getRoleByName(RoleType.VIEWER);

    const adminUser = await authService.createUser({
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin User',
      roleId: adminRole.id,
    });

    const supportUser = await authService.createUser({
      email: 'support@example.com',
      password: 'support123',
      name: 'Support User',
      roleId: supportRole.id,
    });

    const viewerUser = await authService.createUser({
      email: 'viewer@example.com',
      password: 'viewer123',
      name: 'Viewer User',
      roleId: viewerRole.id,
    });

    // 認証トークンを取得
    const adminAuth = await authService.login({ email: 'admin@example.com', password: 'admin123' });
    const supportAuth = await authService.login({ email: 'support@example.com', password: 'support123' });
    const viewerAuth = await authService.login({ email: 'viewer@example.com', password: 'viewer123' });

    adminToken = adminAuth.accessToken;
    supportToken = supportAuth.accessToken;
    viewerToken = viewerAuth.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Role Management API', () => {
    describe('POST /roles', () => {
      it('管理者は新しい役割を作成できるべき', async () => {
        // 要件: 5.4 - 管理者権限を持つユーザーの全機能アクセス許可
        const newRole = {
          name: 'custom-role',
          description: 'カスタム役割',
          permissions: [
            {
              resource: ResourceType.INQUIRY,
              actions: [ActionType.READ],
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newRole)
          .expect(201);

        expect(response.body.name).toBe(newRole.name);
        expect(response.body.description).toBe(newRole.description);
        expect(response.body.permissions).toEqual(newRole.permissions);
      });

      it('サポート担当者は役割を作成できないべき', async () => {
        // 要件: 5.3 - 権限不足時のアクセス拒否メッセージ表示
        const newRole = {
          name: 'unauthorized-role',
          description: '権限なし役割',
          permissions: [
            {
              resource: ResourceType.INQUIRY,
              actions: [ActionType.READ],
            },
          ],
        };

        await request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${supportToken}`)
          .send(newRole)
          .expect(403);
      });

      it('閲覧者は役割を作成できないべき', async () => {
        const newRole = {
          name: 'viewer-unauthorized-role',
          description: '閲覧者権限なし役割',
          permissions: [
            {
              resource: ResourceType.INQUIRY,
              actions: [ActionType.READ],
            },
          ],
        };

        await request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send(newRole)
          .expect(403);
      });
    });

    describe('GET /roles', () => {
      it('管理者は全ての役割を取得できるべき', async () => {
        const response = await request(app.getHttpServer())
          .get('/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });

      it('サポート担当者は役割を取得できないべき', async () => {
        await request(app.getHttpServer())
          .get('/roles')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(403);
      });
    });

    describe('PUT /roles/:id', () => {
      it('管理者は役割を更新できるべき', async () => {
        // まず役割を作成
        const createResponse = await request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'update-test-role',
            description: '更新テスト役割',
            permissions: [
              {
                resource: ResourceType.INQUIRY,
                actions: [ActionType.READ],
              },
            ],
          });

        const roleId = createResponse.body.id;

        // 役割を更新
        const updateData = {
          description: '更新された説明',
          permissions: [
            {
              resource: ResourceType.INQUIRY,
              actions: [ActionType.READ, ActionType.UPDATE],
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .put(`/roles/${roleId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.description).toBe(updateData.description);
        expect(response.body.permissions).toEqual(updateData.permissions);
      });
    });

    describe('DELETE /roles/:id', () => {
      it('管理者は役割を削除できるべき', async () => {
        // まず役割を作成
        const createResponse = await request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'delete-test-role',
            description: '削除テスト役割',
            permissions: [
              {
                resource: ResourceType.INQUIRY,
                actions: [ActionType.READ],
              },
            ],
          });

        const roleId = createResponse.body.id;

        // 役割を削除
        await request(app.getHttpServer())
          .delete(`/roles/${roleId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);

        // 削除確認
        await request(app.getHttpServer())
          .get(`/roles/${roleId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });
  });

  describe('Permission Check API', () => {
    describe('POST /roles/check-permission', () => {
      it('管理者は全ての権限チェックでtrueを返すべき', async () => {
        // 要件: 5.4 - 管理者権限を持つユーザーの全機能アクセス許可
        const response = await request(app.getHttpServer())
          .post('/roles/check-permission')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            resource: ResourceType.USER,
            action: ActionType.DELETE,
          })
          .expect(200);

        expect(response.body.hasPermission).toBe(true);
      });

      it('サポート担当者は許可された権限でtrueを返すべき', async () => {
        // 要件: 5.2 - ユーザーが機能にアクセス時の権限確認
        const response = await request(app.getHttpServer())
          .post('/roles/check-permission')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({
            resource: ResourceType.INQUIRY,
            action: ActionType.READ,
          })
          .expect(200);

        expect(response.body.hasPermission).toBe(true);
      });

      it('サポート担当者は許可されていない権限でfalseを返すべき', async () => {
        const response = await request(app.getHttpServer())
          .post('/roles/check-permission')
          .set('Authorization', `Bearer ${supportToken}`)
          .send({
            resource: ResourceType.USER,
            action: ActionType.DELETE,
          })
          .expect(200);

        expect(response.body.hasPermission).toBe(false);
      });

      it('閲覧者は読み取り権限でtrueを返すべき', async () => {
        const response = await request(app.getHttpServer())
          .post('/roles/check-permission')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({
            resource: ResourceType.INQUIRY,
            action: ActionType.READ,
          })
          .expect(200);

        expect(response.body.hasPermission).toBe(true);
      });

      it('閲覧者は書き込み権限でfalseを返すべき', async () => {
        const response = await request(app.getHttpServer())
          .post('/roles/check-permission')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({
            resource: ResourceType.INQUIRY,
            action: ActionType.CREATE,
          })
          .expect(200);

        expect(response.body.hasPermission).toBe(false);
      });
    });
  });

  describe('Role Assignment API', () => {
    describe('POST /roles/:roleId/assign/:userId', () => {
      it('管理者はユーザーに役割を割り当てできるべき', async () => {
        // 要件: 5.1 - ユーザーに役割が割り当てられる時の権限付与
        // テスト用ユーザーを作成
        const testUser = await authService.createUser({
          email: 'test-assign@example.com',
          password: 'test123',
          name: 'Test Assign User',
          roleId: (await roleService.getRoleByName(RoleType.VIEWER)).id,
        });

        const supportRole = await roleService.getRoleByName(RoleType.SUPPORT_STAFF);

        const response = await request(app.getHttpServer())
          .post(`/roles/${supportRole.id}/assign/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.message).toBe('役割が正常に割り当てられました');

        // 権限が変更されたことを確認
        const permissions = await permissionService.getUserPermissions(testUser.id);
        expect(permissions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              resource: ResourceType.INQUIRY,
              actions: expect.arrayContaining([ActionType.CREATE, ActionType.READ, ActionType.UPDATE]),
            }),
          ]),
        );
      });

      it('サポート担当者は役割を割り当てできないべき', async () => {
        const testUser = await authService.createUser({
          email: 'test-assign-2@example.com',
          password: 'test123',
          name: 'Test Assign User 2',
          roleId: (await roleService.getRoleByName(RoleType.VIEWER)).id,
        });

        const supportRole = await roleService.getRoleByName(RoleType.SUPPORT_STAFF);

        await request(app.getHttpServer())
          .post(`/roles/${supportRole.id}/assign/${testUser.id}`)
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(403);
      });
    });
  });

  describe('User Permissions API', () => {
    describe('GET /roles/user/:userId/permissions', () => {
      it('管理者は他のユーザーの権限を取得できるべき', async () => {
        const testUser = await authService.createUser({
          email: 'test-permissions@example.com',
          password: 'test123',
          name: 'Test Permissions User',
          roleId: (await roleService.getRoleByName(RoleType.SUPPORT_STAFF)).id,
        });

        const response = await request(app.getHttpServer())
          .get(`/roles/user/${testUser.id}/permissions`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.permissions).toBeDefined();
        expect(Array.isArray(response.body.permissions)).toBe(true);
      });

      it('サポート担当者は他のユーザーの権限を取得できないべき', async () => {
        const testUser = await authService.createUser({
          email: 'test-permissions-2@example.com',
          password: 'test123',
          name: 'Test Permissions User 2',
          roleId: (await roleService.getRoleByName(RoleType.VIEWER)).id,
        });

        await request(app.getHttpServer())
          .get(`/roles/user/${testUser.id}/permissions`)
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(403);
      });
    });
  });

  describe('Predefined Roles Initialization', () => {
    describe('POST /roles/initialize', () => {
      it('管理者は事前定義された役割を初期化できるべき', async () => {
        const response = await request(app.getHttpServer())
          .post('/roles/initialize')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.message).toBe('事前定義された役割が正常に作成されました');
      });

      it('サポート担当者は事前定義された役割を初期化できないべき', async () => {
        await request(app.getHttpServer())
          .post('/roles/initialize')
          .set('Authorization', `Bearer ${supportToken}`)
          .expect(403);
      });
    });
  });
});