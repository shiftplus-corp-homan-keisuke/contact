/**
 * 権限管理サービス
 * 要件: 5.1, 5.2, 5.3, 5.4 (RBAC権限管理機能)
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { Permission, ResourceType, ActionType, RoleType } from '../../../common/types/role.types';

export interface PermissionContext {
  userId: string;
  roleId: string;
  permissions: Permission[];
}

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 権限チェック
   * 要件: 5.2 - ユーザーが機能にアクセス時の権限確認
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const user = await this.userRepository.findUserWithDetails(userId);
      
      if (!user || !user.isActive) {
        return false;
      }

      // システム管理者は全権限を持つ
      if (user.role?.name === 'system_admin') {
        return true;
      }

      // 役割の権限を確認
      if (!user.role?.permissions) {
        return false;
      }

      const permissions = user.role.permissions as Permission[];
      const resourcePermission = permissions.find(p => p.resource === resource);
      
      if (!resourcePermission) {
        return false;
      }

      return resourcePermission.actions.includes(action);
    } catch (error) {
      console.error('権限チェックエラー:', error);
      return false;
    }
  }

  /**
   * 権限チェック（例外スロー版）
   */
  async requirePermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<void> {
    const hasPermission = await this.checkPermission(userId, resource, action);
    
    if (!hasPermission) {
      throw new ForbiddenException(
        `リソース '${resource}' に対する '${action}' 権限がありません`
      );
    }
  }

  /**
   * ユーザーの権限コンテキストを取得
   */
  async getPermissionContext(userId: string): Promise<PermissionContext | null> {
    const user = await this.userRepository.findUserWithDetails(userId);
    
    if (!user || !user.isActive || !user.role) {
      return null;
    }

    return {
      userId: user.id,
      roleId: user.role.id,
      permissions: user.role.permissions as Permission[] || []
    };
  }

  /**
   * 複数権限の一括チェック
   */
  async checkMultiplePermissions(
    userId: string,
    checks: Array<{ resource: string; action: string }>
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const check of checks) {
      const key = `${check.resource}:${check.action}`;
      results[key] = await this.checkPermission(userId, check.resource, check.action);
    }
    
    return results;
  }

  /**
   * 役割に権限を割り当て
   */
  async assignPermissionsToRole(
    roleId: string,
    permissions: Permission[]
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new Error('役割が見つかりません');
    }

    role.permissions = permissions;
    return this.roleRepository.save(role);
  }

  /**
   * ユーザーに役割を割り当て
   * 要件: 5.1 - ユーザーに役割が割り当てられる時の権限付与
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new Error('役割が見つかりません');
    }

    user.roleId = roleId;
    return this.userRepository.update(userId, { roleId });
  }

  /**
   * ユーザーの権限一覧を取得
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.userRepository.findUserWithDetails(userId);
    
    if (!user || !user.isActive || !user.role) {
      return [];
    }

    return user.role.permissions as Permission[] || [];
  }

  /**
   * 事前定義された役割を作成
   */
  async createPredefinedRoles(): Promise<void> {
    const predefinedRoles = [
      {
        name: RoleType.SYSTEM_ADMIN,
        description: 'システム管理者',
        permissions: this.getAllPermissions()
      },
      {
        name: RoleType.ADMIN,
        description: '管理者',
        permissions: this.getAdminPermissions()
      },
      {
        name: RoleType.SUPPORT_STAFF,
        description: 'サポート担当者',
        permissions: this.getSupportStaffPermissions()
      },
      {
        name: RoleType.VIEWER,
        description: '閲覧者',
        permissions: this.getViewerPermissions()
      }
    ];

    for (const roleData of predefinedRoles) {
      const existingRole = await this.roleRepository.findOne({ 
        where: { name: roleData.name } 
      });
      
      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
      }
    }
  }

  /**
   * 全権限を取得
   */
  private getAllPermissions(): Permission[] {
    return [
      { resource: ResourceType.USER, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE, ActionType.ASSIGN] },
      { resource: ResourceType.ROLE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.INQUIRY, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE, ActionType.ASSIGN] },
      { resource: ResourceType.RESPONSE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.FAQ, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE, ActionType.PUBLISH] },
      { resource: ResourceType.TEMPLATE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.FILE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.ANALYTICS, actions: [ActionType.READ] },
      { resource: ResourceType.SYSTEM, actions: [ActionType.READ, ActionType.UPDATE] }
    ];
  }

  /**
   * 管理者権限を取得
   */
  private getAdminPermissions(): Permission[] {
    return [
      { resource: ResourceType.USER, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.ASSIGN] },
      { resource: ResourceType.ROLE, actions: [ActionType.READ] },
      { resource: ResourceType.INQUIRY, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.ASSIGN] },
      { resource: ResourceType.RESPONSE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.FAQ, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE, ActionType.PUBLISH] },
      { resource: ResourceType.TEMPLATE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.FILE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.ANALYTICS, actions: [ActionType.READ] }
    ];
  }

  /**
   * サポート担当者権限を取得
   */
  private getSupportStaffPermissions(): Permission[] {
    return [
      { resource: ResourceType.INQUIRY, actions: [ActionType.READ, ActionType.UPDATE] },
      { resource: ResourceType.RESPONSE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE] },
      { resource: ResourceType.FAQ, actions: [ActionType.READ, ActionType.UPDATE] },
      { resource: ResourceType.TEMPLATE, actions: [ActionType.READ, ActionType.UPDATE] },
      { resource: ResourceType.FILE, actions: [ActionType.CREATE, ActionType.READ] }
    ];
  }

  /**
   * 閲覧者権限を取得
   */
  private getViewerPermissions(): Permission[] {
    return [
      { resource: ResourceType.INQUIRY, actions: [ActionType.READ] },
      { resource: ResourceType.RESPONSE, actions: [ActionType.READ] },
      { resource: ResourceType.FAQ, actions: [ActionType.READ] },
      { resource: ResourceType.TEMPLATE, actions: [ActionType.READ] }
    ];
  }
}