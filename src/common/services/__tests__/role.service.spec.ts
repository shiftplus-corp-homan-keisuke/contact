/**
 * 役割管理サービスのテスト
 * 要件: 5.1, 5.2, 5.3, 5.4 (権限管理機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoleService } from '../../../modules/users/services/role.service';
import { Role } from '../../../modules/users/entities/role.entity';
import { CreateRoleRequest, UpdateRoleRequest, ResourceType, ActionType } from '../../types/role.types';

describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: jest.Mocked<Repository<Role>>;

  const mockRole: Role = {
    id: 'role-1',
    name: 'test-role',
    description: 'テスト役割',
    permissions: [
      {
        resource: ResourceType.INQUIRY,
        actions: [ActionType.CREATE, ActionType.READ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepository = module.get(getRepositoryToken(Role));
  });

  describe('createRole', () => {
    const createRoleRequest: CreateRoleRequest = {
      name: 'new-role',
      description: '新しい役割',
      permissions: [
        {
          resource: ResourceType.INQUIRY,
          actions: [ActionType.READ],
        },
      ],
    };

    it('有効なデータで役割を作成するべき', async () => {
      // 要件: 5.1 - 役割ベースの権限管理
      roleRepository.findOne.mockResolvedValue(null); // 重複なし
      roleRepository.create.mockReturnValue(mockRole);
      roleRepository.save.mockResolvedValue(mockRole);

      const result = await service.createRole(createRoleRequest);

      expect(result).toEqual(mockRole);
      expect(roleRepository.create).toHaveBeenCalledWith(createRoleRequest);
      expect(roleRepository.save).toHaveBeenCalledWith(mockRole);
    });

    it('重複する名前の場合、ConflictExceptionを投げるべき', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole); // 重複あり

      await expect(service.createRole(createRoleRequest)).rejects.toThrow(ConflictException);
      expect(roleRepository.save).not.toHaveBeenCalled();
    });

    it('無効な権限データの場合、エラーを投げるべき', async () => {
      const invalidRequest = {
        ...createRoleRequest,
        permissions: [
          {
            resource: '', // 無効なリソース
            actions: [],
          },
        ],
      };

      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.createRole(invalidRequest)).rejects.toThrow();
    });
  });

  describe('updateRole', () => {
    const updateRoleRequest: UpdateRoleRequest = {
      name: 'updated-role',
      description: '更新された役割',
      permissions: [
        {
          resource: ResourceType.FAQ,
          actions: [ActionType.READ, ActionType.UPDATE],
        },
      ],
    };

    it('有効なデータで役割を更新するべき', async () => {
      const updatedRole = { ...mockRole, ...updateRoleRequest };
      
      roleRepository.findOne.mockResolvedValueOnce(mockRole); // 更新対象の役割
      roleRepository.findOne.mockResolvedValueOnce(null); // 名前重複チェック
      roleRepository.save.mockResolvedValue(updatedRole);

      const result = await service.updateRole('role-1', updateRoleRequest);

      expect(result.name).toBe(updateRoleRequest.name);
      expect(result.description).toBe(updateRoleRequest.description);
      expect(result.permissions).toEqual(updateRoleRequest.permissions);
    });

    it('存在しない役割の場合、NotFoundExceptionを投げるべき', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.updateRole('nonexistent', updateRoleRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('重複する名前に更新しようとした場合、ConflictExceptionを投げるべき', async () => {
      const anotherRole = { ...mockRole, id: 'role-2', name: 'another-role' };
      
      roleRepository.findOne.mockResolvedValueOnce(mockRole); // 更新対象の役割
      roleRepository.findOne.mockResolvedValueOnce(anotherRole); // 名前重複チェック

      await expect(service.updateRole('role-1', { name: 'another-role' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getRoleById', () => {
    it('存在する役割を返すべき', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.getRoleById('role-1');

      expect(result).toEqual(mockRole);
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });

    it('存在しない役割の場合、NotFoundExceptionを投げるべき', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.getRoleById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllRoles', () => {
    it('全ての役割を返すべき', async () => {
      const roles = [mockRole, { ...mockRole, id: 'role-2', name: 'role-2' }];
      roleRepository.find.mockResolvedValue(roles);

      const result = await service.getAllRoles();

      expect(result).toEqual(roles);
      expect(roleRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('deleteRole', () => {
    it('ユーザーが割り当てられていない役割を削除するべき', async () => {
      const roleWithoutUsers = { ...mockRole, users: [] };
      roleRepository.findOne.mockResolvedValue(roleWithoutUsers);

      await service.deleteRole('role-1');

      expect(roleRepository.remove).toHaveBeenCalledWith(roleWithoutUsers);
    });

    it('存在しない役割の場合、NotFoundExceptionを投げるべき', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteRole('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('ユーザーが割り当てられている役割の場合、ConflictExceptionを投げるべき', async () => {
      const roleWithUsers = { 
        ...mockRole, 
        users: [{ id: 'user-1' }] as any[] 
      };
      roleRepository.findOne.mockResolvedValue(roleWithUsers);

      await expect(service.deleteRole('role-1')).rejects.toThrow(ConflictException);
      expect(roleRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getRoleByName', () => {
    it('名前で役割を検索するべき', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.getRoleByName('test-role');

      expect(result).toEqual(mockRole);
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { name: 'test-role' } });
    });

    it('存在しない名前の場合、nullを返すべき', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      const result = await service.getRoleByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('権限検証', () => {
    it('有効な権限データを受け入れるべき', async () => {
      const validRequest: CreateRoleRequest = {
        name: 'valid-role',
        permissions: [
          {
            resource: ResourceType.INQUIRY,
            actions: [ActionType.CREATE, ActionType.READ],
          },
        ],
      };

      roleRepository.findOne.mockResolvedValue(null);
      roleRepository.create.mockReturnValue(mockRole);
      roleRepository.save.mockResolvedValue(mockRole);

      await expect(service.createRole(validRequest)).resolves.not.toThrow();
    });

    it('無効な権限データを拒否するべき', async () => {
      const invalidRequests = [
        {
          name: 'invalid-1',
          permissions: 'not-array' as any, // 配列でない
        },
        {
          name: 'invalid-2',
          permissions: [
            {
              resource: '', // 空のリソース
              actions: [ActionType.READ],
            },
          ],
        },
        {
          name: 'invalid-3',
          permissions: [
            {
              resource: ResourceType.INQUIRY,
              actions: [], // 空のアクション配列
            },
          ],
        },
        {
          name: 'invalid-4',
          permissions: [
            {
              resource: ResourceType.INQUIRY,
              actions: [123] as any, // 文字列でないアクション
            },
          ],
        },
      ];

      roleRepository.findOne.mockResolvedValue(null);

      for (const invalidRequest of invalidRequests) {
        await expect(service.createRole(invalidRequest)).rejects.toThrow();
      }
    });
  });
});