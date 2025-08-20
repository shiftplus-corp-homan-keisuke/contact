import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../services/permissions.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserContext } from '../../auth/types/auth.types';

/**
 * 権限チェックガード
 * 要件5.2: ユーザーが機能にアクセス時の権限確認
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionsService: PermissionsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // @Permissions() デコレーターから必要な権限を取得
        const requiredPermissions = this.reflector.getAllAndOverride<
            Array<{ resource: string; action: string }>
        >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true; // 権限指定がない場合は許可
        }

        const request = context.switchToHttp().getRequest();
        const user: UserContext = request.user;

        if (!user) {
            throw new ForbiddenException('認証が必要です');
        }

        // 各権限をチェック
        for (const permission of requiredPermissions) {
            const hasPermission = await this.permissionsService.checkPermissionWithHierarchy(
                user.id,
                permission.resource,
                permission.action,
            );

            if (!hasPermission) {
                throw new ForbiddenException(
                    `この操作には ${permission.resource}:${permission.action} 権限が必要です`,
                );
            }
        }

        return true;
    }
}