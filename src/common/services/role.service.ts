/**
 * 役割管理サービス
 * 要件: 5.1, 5.2, 5.3, 5.4 (権限管理機能)
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { CreateRoleRequest, UpdateRoleRequest, Permission } from '../types/role.types';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * 役割作成
   * 要件: 5.1 (役割ベースの権限管理)
   */
  async createRole(createRoleRequest: CreateRoleRequest): Promise<Role> {
    const { name, description, permissions } = createRoleRequest;

    // 名前の重複チェック
    const existingRole = await this.roleRepository.findOne({ where: { name } });
    if (existingRole) {
      throw new ConflictException('この役割名は既に使用されています');
    }

    // 権限の検証
    this.validatePermissions(permissions);

    const role = this.roleRepository.create({
      name,
      description,
      permissions,
    });

    return this.roleRepository.save(role);
  }

  /**
   * 役割更新
   */
  async updateRole(roleId: string, updateRoleRequest: UpdateRoleRequest): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('役割が見つかりません');
    }

    if (updateRoleRequest.name !== undefined) {
      // 名前の重複チェック（自分以外）
      if (updateRoleRequest.name !== role.name) {
        const existingRole = await this.roleRepository.findOne({
          where: { name: updateRoleRequest.name },
        });
        if (existingRole) {
          throw new ConflictException('この役割名は既に使用されています');
        }
      }
      role.name = updateRoleRequest.name;
    }

    if (updateRoleRequest.description !== undefined) {
      role.description = updateRoleRequest.description;
    }

    if (updateRoleRequest.permissions !== undefined) {
      this.validatePermissions(updateRoleRequest.permissions);
      role.permissions = updateRoleRequest.permissions;
    }

    return this.roleRepository.save(role);
  }

  /**
   * 役割取得
   */
  async getRoleById(roleId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('役割が見つかりません');
    }
    return role;
  }

  /**
   * 役割一覧取得
   */
  async getAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 役割削除
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException('役割が見つかりません');
    }

    // ユーザーが割り当てられている場合は削除不可
    if (role.users && role.users.length > 0) {
      throw new ConflictException('この役割にはユーザーが割り当てられているため削除できません');
    }

    await this.roleRepository.remove(role);
  }

  /**
   * 役割名で検索
   */
  async getRoleByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  /**
   * 権限の検証
   */
  private validatePermissions(permissions: Permission[]): void {
    if (!Array.isArray(permissions)) {
      throw new Error('権限は配列である必要があります');
    }

    for (const permission of permissions) {
      if (!permission.resource || typeof permission.resource !== 'string') {
        throw new Error('権限のリソースは文字列である必要があります');
      }

      if (!Array.isArray(permission.actions) || permission.actions.length === 0) {
        throw new Error('権限のアクションは空でない配列である必要があります');
      }

      for (const action of permission.actions) {
        if (typeof action !== 'string') {
          throw new Error('権限のアクションは文字列である必要があります');
        }
      }
    }
  }
}