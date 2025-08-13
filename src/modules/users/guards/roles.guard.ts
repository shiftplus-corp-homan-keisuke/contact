/**
 * 役割ベースアクセス制御ガード
 * 要件: 5.2, 5.3, 5.4 (権限管理機能)
 * 
 * ユーザーモジュール固有のガード - ユーザーの役割管理に特化
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }

    // ユーザーの役割をチェック
    const userRole = user.role?.name || user.role;
    
    return requiredRoles.some((role) => userRole === role);
  }
}