/**
 * 権限チェックガードのテスト
 * 要件: 5.2 (権限チェック機能とデコレーターの作成)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../permissions.guard';
import { PermissionService, PermissionContext } from '../../../modules/users/services/permission.service';
import { PERMISSIONS_KEY, RequiredPermission } from '../../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { ResourceType, ActionType } from '../../types/role.types';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let permissionService: jest.Mocked<PermissionService>;

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          userId: 'user-1',
          roleId: 'role-1',
          permissions: [
            {
              resource: ResourceType.INQUIRY,
              actions: [ActionType.CREATE, ActionType.READ],
            },
          ],
        },
      }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  const mockExecutionContextWithoutUser = {
    switchToHttp: () => ({
      getRequest: () => ({}),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            checkPermission: jest.fn(),
            getPermissionContext: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector);
    permissionService = module.get(PermissionService);
  });

  describe('canActivate', () => {
    it('パブリックエンドポイントの場合、trueを返すべき', async () => {
      reflector.getAllAndOverride.mockReturnValueOnce(true); // IS_PUBLIC_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('権限要件がない場合、trueを返すべき', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(null); // PERMISSIONS_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('権限要件が空配列の場合、trueを返すべき', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce([]); // PERMISSIONS_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('認証されていないユーザーの場合、ForbiddenExceptionを投げるべき', async () => {
      const requiredPermissions: RequiredPermission[] = [
        { resource: ResourceType.INQUIRY, action: ActionType.READ },
      ];

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(requiredPermissions); // PERMISSIONS_KEY

      await expect(guard.canActivate(mockExecutionContextWithoutUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('必要な権限を持つユーザーの場合、trueを返すべき', async () => {
      // 要件: 5.2 - ユーザーが機能にアクセス時の権限確認
      const requiredPermissions: RequiredPermission[] = [
        { resource: ResourceType.INQUIRY, action: ActionType.READ },
      ];

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(requiredPermissions); // PERMISSIONS_KEY

      permissionService.checkPermission.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-1',
        ResourceType.INQUIRY,
        ActionType.READ,
      );
    });

    it('必要な権限を持たないユーザーの場合、ForbiddenExceptionを投げるべき', async () => {
      // 要件: 5.3 - 権限不足時のアクセス拒否メッセージ表示
      const requiredPermissions: RequiredPermission[] = [
        { resource: ResourceType.USER, action: ActionType.DELETE },
      ];

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(requiredPermissions); // PERMISSIONS_KEY

      permissionService.checkPermission.mockResolvedValue(false);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
    });

    it('複数の権限要件がある場合、全てをチェックするべき', async () => {
      const requiredPermissions: RequiredPermission[] = [
        { resource: ResourceType.INQUIRY, action: ActionType.READ },
        { resource: ResourceType.INQUIRY, action: ActionType.UPDATE },
      ];

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(requiredPermissions); // PERMISSIONS_KEY

      permissionService.checkPermission
        .mockResolvedValueOnce(true) // 最初の権限
        .mockResolvedValueOnce(true); // 2番目の権限

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(permissionService.checkPermission).toHaveBeenCalledTimes(2);
    });

    it('複数の権限要件のうち一つでも満たさない場合、ForbiddenExceptionを投げるべき', async () => {
      const requiredPermissions: RequiredPermission[] = [
        { resource: ResourceType.INQUIRY, action: ActionType.READ },
        { resource: ResourceType.USER, action: ActionType.DELETE },
      ];

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(requiredPermissions); // PERMISSIONS_KEY

      permissionService.checkPermission
        .mockResolvedValueOnce(true) // 最初の権限は満たす
        .mockResolvedValueOnce(false); // 2番目の権限は満たさない

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Reflectorの使用', () => {
    it('正しいキーでメタデータを取得するべき', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce([]); // PERMISSIONS_KEY

      await guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });
  });
});