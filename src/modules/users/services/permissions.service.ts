import { Injectable, Logger } from '@nestjs/common';
import { RolesService } from './roles.service';
import { UsersService } from './users.service';

@Injectable()
export class PermissionsService {
    private readonly logger = new Logger(PermissionsService.name);

    constructor(
        private readonly rolesService: RolesService,
        private readonly usersService: UsersService,
    ) { }

    /**
     * ユーザーの権限チェック
     * 要件5.2: ユーザーが機能にアクセス時の権限確認
     */
    async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
        try {
            const user = await this.usersService.findById(userId);
            if (!user || !user.isActive) {
                return false;
            }

            const role = await this.rolesService.findById(user.roleId);
            if (!role || !role.isActive) {
                return false;
            }

            // 管理者は全ての権限を持つ
            if (role.permissions.includes('system:admin')) {
                return true;
            }

            // 具体的な権限をチェック
            const requiredPermission = `${resource}:${action}`;
            return role.permissions.includes(requiredPermission);
        } catch (error) {
            this.logger.error(`権限チェックエラー: ${userId}, ${resource}:${action}`, error.stack);
            return false;
        }
    }

    /**
     * ユーザーの全権限取得
     */
    async getUserPermissions(userId: string): Promise<string[]> {
        try {
            const user = await this.usersService.findById(userId);
            if (!user || !user.isActive) {
                return [];
            }

            const role = await this.rolesService.findById(user.roleId);
            if (!role || !role.isActive) {
                return [];
            }

            return role.permissions;
        } catch (error) {
            this.logger.error(`権限取得エラー: ${userId}`, error.stack);
            return [];
        }
    }

    /**
     * 複数権限の一括チェック
     */
    async checkMultiplePermissions(
        userId: string,
        permissions: Array<{ resource: string; action: string }>,
    ): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};

        for (const permission of permissions) {
            const key = `${permission.resource}:${permission.action}`;
            results[key] = await this.checkPermission(userId, permission.resource, permission.action);
        }

        return results;
    }

    /**
     * リソースに対する利用可能なアクションを取得
     */
    async getAvailableActions(userId: string, resource: string): Promise<string[]> {
        const userPermissions = await this.getUserPermissions(userId);
        const availableActions: string[] = [];

        for (const permission of userPermissions) {
            if (permission.startsWith(`${resource}:`)) {
                const action = permission.split(':')[1];
                availableActions.push(action);
            }
        }

        return availableActions;
    }

    /**
     * 権限の階層チェック
     * 例: 'inquiry:update' 権限があれば 'inquiry:read' も自動的に許可
     */
    async checkPermissionWithHierarchy(
        userId: string,
        resource: string,
        action: string,
    ): Promise<boolean> {
        // 基本権限チェック
        const hasDirectPermission = await this.checkPermission(userId, resource, action);
        if (hasDirectPermission) {
            return true;
        }

        // 階層権限チェック
        const hierarchyMap: Record<string, string[]> = {
            'read': [],
            'create': ['read'],
            'update': ['read'],
            'delete': ['read', 'update'],
            'admin': ['read', 'create', 'update', 'delete'],
        };

        const higherActions = Object.keys(hierarchyMap).filter(higherAction =>
            hierarchyMap[higherAction].includes(action)
        );

        for (const higherAction of higherActions) {
            const hasHigherPermission = await this.checkPermission(userId, resource, higherAction);
            if (hasHigherPermission) {
                return true;
            }
        }

        return false;
    }

    /**
     * 利用可能な権限一覧を取得
     */
    getAvailablePermissions(): Record<string, string[]> {
        return {
            system: ['admin'],
            user: ['create', 'read', 'update', 'delete'],
            role: ['create', 'read', 'update', 'delete'],
            inquiry: ['create', 'read', 'update', 'delete'],
            response: ['create', 'read', 'update', 'delete'],
            faq: ['create', 'read', 'update', 'delete'],
            template: ['create', 'read', 'update', 'delete', 'use'],
            file: ['upload', 'download', 'delete'],
            analytics: ['read'],
            'api-key': ['create', 'read', 'update', 'delete'],
        };
    }

    /**
     * 権限の説明を取得
     */
    getPermissionDescriptions(): Record<string, string> {
        return {
            'system:admin': 'システム管理者権限',
            'user:create': 'ユーザー作成',
            'user:read': 'ユーザー閲覧',
            'user:update': 'ユーザー更新',
            'user:delete': 'ユーザー削除',
            'role:create': '役割作成',
            'role:read': '役割閲覧',
            'role:update': '役割更新',
            'role:delete': '役割削除',
            'inquiry:create': '問い合わせ作成',
            'inquiry:read': '問い合わせ閲覧',
            'inquiry:update': '問い合わせ更新',
            'inquiry:delete': '問い合わせ削除',
            'response:create': '回答作成',
            'response:read': '回答閲覧',
            'response:update': '回答更新',
            'response:delete': '回答削除',
            'faq:create': 'FAQ作成',
            'faq:read': 'FAQ閲覧',
            'faq:update': 'FAQ更新',
            'faq:delete': 'FAQ削除',
            'template:create': 'テンプレート作成',
            'template:read': 'テンプレート閲覧',
            'template:update': 'テンプレート更新',
            'template:delete': 'テンプレート削除',
            'template:use': 'テンプレート使用',
            'file:upload': 'ファイルアップロード',
            'file:download': 'ファイルダウンロード',
            'file:delete': 'ファイル削除',
            'analytics:read': '分析データ閲覧',
            'api-key:create': 'APIキー作成',
            'api-key:read': 'APIキー閲覧',
            'api-key:update': 'APIキー更新',
            'api-key:delete': 'APIキー削除',
        };
    }
}