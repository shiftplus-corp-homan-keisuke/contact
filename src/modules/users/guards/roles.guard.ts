import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '../services/roles.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserContext } from '../../auth/types/auth.types';

/**
 * 役割チェックガード
 * 要件5.1: 役割に応じた権限付与
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private rolesService: RolesService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // @Roles() デコレーターから必要な役割を取得
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true; // 役割指定がない場合は許可
        }

        const request = context.switchToHttp().getRequest();
        const user: UserContext = request.user;

        if (!user) {
            throw new ForbiddenException('認証が必要です');
        }

        // ユーザーの役割を取得
        const userRole = await this.rolesService.findById(user.roleId);
        if (!userRole) {
            throw new ForbiddenException('有効な役割が設定されていません');
        }

        // 管理者は全てのアクセスを許可
        if (userRole.permissions.includes('system:admin')) {
            return true;
        }

        // 必要な役割をチェック
        const hasRequiredRole = requiredRoles.includes(userRole.name);
        if (!hasRequiredRole) {
            throw new ForbiddenException(
                `この操作には次のいずれかの役割が必要です: ${requiredRoles.join(', ')}`,
            );
        }

        return true;
    }
}