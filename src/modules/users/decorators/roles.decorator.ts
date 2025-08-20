import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * 役割チェックデコレーター
 * 要件5.1: 役割に応じた権限付与
 * 
 * @param roles - 必要な役割のリスト
 * 
 * @example
 * ```typescript
 * @Roles('管理者')
 * @Delete(':id')
 * async deleteUser() {
 *   // 管理者役割が必要
 * }
 * 
 * @Roles('管理者', 'サポート担当者')
 * @Get()
 * async getInquiries() {
 *   // 管理者またはサポート担当者役割が必要
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * よく使用される役割の定義済みデコレーター
 */
export const RequireAdmin = () => Roles('管理者');
export const RequireSupport = () => Roles('管理者', 'サポート担当者');
export const RequireViewer = () => Roles('管理者', 'サポート担当者', '閲覧者');
export const RequireApiUser = () => Roles('API利用者');