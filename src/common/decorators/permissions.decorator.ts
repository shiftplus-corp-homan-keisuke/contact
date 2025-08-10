/**
 * 権限チェック用デコレーター
 * 要件: 5.2 (権限チェック機能とデコレーターの作成)
 */

import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  resource: string;
  action: string;
}

/**
 * 必要な権限を指定するデコレーター
 * @param permissions 必要な権限の配列
 */
export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * 単一の権限を指定するデコレーター
 * @param resource リソース名
 * @param action アクション名
 */
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSIONS_KEY, [{ resource, action }]);