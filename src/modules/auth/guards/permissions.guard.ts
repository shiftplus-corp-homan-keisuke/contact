import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            return false;
        }

        // 管理者は全ての権限を持つ
        if (user.role?.name === 'admin') {
            return true;
        }

        // ユーザーの権限をチェック
        const userPermissions = user.role?.permissions || [];

        return requiredPermissions.some((permission) =>
            userPermissions.includes(permission)
        );
    }
}