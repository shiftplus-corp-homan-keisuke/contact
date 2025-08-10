/**
 * 権限チェックガード
 * 要件: 5.2 (権限チェック機能とデコレーターの作成)
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // パブリックエンドポイントの場合はスキップ
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 必要な権限を取得
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('認証が必要です');
    }

    // 各権限をチェック
    for (const permission of requiredPermissions) {
      const hasPermission = this.permissionService.checkPermissionWithContext(
        {
          userId: user.userId,
          roleId: user.roleId,
          permissions: user.permissions,
        },
        permission.resource,
        permission.action,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `リソース「${permission.resource}」に対する「${permission.action}」権限がありません`,
        );
      }
    }

    return true;
  }
}