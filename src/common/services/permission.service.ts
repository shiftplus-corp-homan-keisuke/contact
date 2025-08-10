/**
 * 権限管理サービス
 * 要件: 5.1, 5.2, 5.3, 5.4 (RBAC権限管理機能)
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { Permission, ResourceType, ActionType, RoleType } from '../types/role.types';

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 権限チェック
   * 要件: 5.2 - ユーザーが機能にアクセス時の権限確認
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, isActive: true },
        relations: ['role'],
      });

      if (!user || !user.role) {
        return false;
      }

      // 管理者は全ての権限を持つ
      if (user.role.name === RoleType.ADMIN) {
        return true;
      }

      // 権限チェック
      return this.hasPermission(user.role.permissions, resource, action);
    } catch (error) {
      return false;
    }
  }

  /**
   * 権限チェック（コンテキスト使用）
   */
  checkPermissionWithContext(
    context: PermissionContext,
    resource: string,
    action: string,
  ): boolean {
    // 管理者権限の確認（役割名で判定）
    if (this.isAdmin(context)) {
      return true;
    }

    return this.hasPermission(context.permissions, resource, action);
  }

  /**
   * 権限チェック（例外発生版）
   * 要件: 5.3 - 権限不足時のアクセス拒否メッセージ表示
   */
  async requirePermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<void> {
    const hasPermission = await this.checkPermission(userId, resource, action);
    if (!hasPermission) {
      throw new ForbiddenException(
        `リソース「${resource}」に対する「${action}」権限がありません`,
      );
    }
  }

  /**
   * 権限チェック（コンテキスト使用・例外発生版）
   */
  requirePermissionWithContext(
    context: PermissionContext,
    resource: string,
    action: string,
  ): void {
    const hasPermission = this.checkPermissionWithContext(context, resource, action);
    if (!hasPermission) {
      throw new ForbiddenException(
        `リソース「${resource}」に対する「${action}」権限がありません`,
      );
    }
  }

  /**
   * 役割に権限を割り当て
   * 要件: 5.1 - ユーザーに役割が割り当てられる時の権限付与
   */
  async assignPermissionsToRole(
    roleId: string,
    permissions: Permission[],
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
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new Error('役割が見つかりません');
    }

    user.roleId = roleId;
    return this.userRepository.save(user);
  }

  /**
   * ユーザーの権限一覧取得
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['role'],
    });

    if (!user || !user.role) {
      return [];
    }

    return user.role.permissions;
  }

  /**
   * 事前定義された役割の作成
   */
  async createPredefinedRoles(): Promise<void> {
    const roles = [
      {
        name: RoleType.ADMIN,
        description: '管理者 - 全ての機能にアクセス可能',
        permissions: this.getAdminPermissions(),
      },
      {
        name: RoleType.SUPPORT_STAFF,
        description: 'サポート担当者 - 問い合わせ対応とFAQ編集',
        permissions: this.getSupportStaffPermissions(),
      },
      {
        name: RoleType.VIEWER,
        description: '閲覧者 - 問い合わせ閲覧のみ',
        permissions: this.getViewerPermissions(),
      },
      {
        name: RoleType.API_USER,
        description: 'API利用者 - API経由での問い合わせ登録のみ',
        permissions: this.getApiUserPermissions(),
      },
    ];

    for (const roleData of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
      }
    }
  }

  /**
   * 権限の存在確認
   */
  private hasPermission(
    permissions: Permission[],
    resource: string,
    action: string,
  ): boolean {
    return permissions.some(permission =>
      permission.resource === resource &&
      permission.actions.includes(action)
    );
  }

  /**
   * 管理者権限の確認
   */
  private isAdmin(context: PermissionContext): boolean {
    // 管理者は全てのリソースに対して全てのアクションを実行可能
    return context.permissions.some(permission =>
      permission.resource === '*' && permission.actions.includes('*')
    );
  }

  /**
   * 管理者権限の定義
   * 要件: 5.4 - 管理者権限を持つユーザーの全機能アクセス許可
   */
  private getAdminPermissions(): Permission[] {
    return [
      {
        resource: '*',
        actions: ['*'],
      },
    ];
  }

  /**
   * サポート担当者権限の定義
   */
  private getSupportStaffPermissions(): Permission[] {
    return [
      {
        resource: ResourceType.INQUIRY,
        actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.ASSIGN],
      },
      {
        resource: ResourceType.RESPONSE,
        actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE],
      },
      {
        resource: ResourceType.FAQ,
        actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.PUBLISH],
      },
      {
        resource: ResourceType.TEMPLATE,
        actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE],
      },
      {
        resource: ResourceType.FILE,
        actions: [ActionType.CREATE, ActionType.READ],
      },
    ];
  }

  /**
   * 閲覧者権限の定義
   */
  private getViewerPermissions(): Permission[] {
    return [
      {
        resource: ResourceType.INQUIRY,
        actions: [ActionType.READ],
      },
      {
        resource: ResourceType.RESPONSE,
        actions: [ActionType.READ],
      },
      {
        resource: ResourceType.FAQ,
        actions: [ActionType.READ],
      },
      {
        resource: ResourceType.ANALYTICS,
        actions: [ActionType.READ],
      },
    ];
  }

  /**
   * API利用者権限の定義
   */
  private getApiUserPermissions(): Permission[] {
    return [
      {
        resource: ResourceType.INQUIRY,
        actions: [ActionType.CREATE],
      },
      {
        resource: ResourceType.FAQ,
        actions: [ActionType.READ],
      },
    ];
  }
}