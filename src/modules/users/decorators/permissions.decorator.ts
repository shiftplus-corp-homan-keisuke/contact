import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * 権限チェックデコレーター
 * 要件5.2: 権限チェック機能とデコレーターの作成
 * 
 * @param permissions - 必要な権限のリスト
 * 
 * @example
 * ```typescript
 * @Permissions({ resource: 'inquiry', action: 'read' })
 * @Get()
 * async getInquiries() {
 *   // 問い合わせ閲覧権限が必要
 * }
 * 
 * @Permissions(
 *   { resource: 'inquiry', action: 'update' },
 *   { resource: 'response', action: 'create' }
 * )
 * @Put(':id')
 * async updateInquiry() {
 *   // 問い合わせ更新権限と回答作成権限の両方が必要
 * }
 * ```
 */
export const Permissions = (...permissions: Array<{ resource: string; action: string }>) =>
    SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * 単一権限チェック用のヘルパー関数
 */
export const Permission = (resource: string, action: string) =>
    Permissions({ resource, action });

/**
 * よく使用される権限の定義済みデコレーター
 */
export const RequireInquiryRead = () => Permission('inquiry', 'read');
export const RequireInquiryWrite = () => Permission('inquiry', 'update');
export const RequireInquiryCreate = () => Permission('inquiry', 'create');
export const RequireInquiryDelete = () => Permission('inquiry', 'delete');

export const RequireResponseRead = () => Permission('response', 'read');
export const RequireResponseWrite = () => Permission('response', 'update');
export const RequireResponseCreate = () => Permission('response', 'create');
export const RequireResponseDelete = () => Permission('response', 'delete');

export const RequireFaqRead = () => Permission('faq', 'read');
export const RequireFaqWrite = () => Permission('faq', 'update');
export const RequireFaqCreate = () => Permission('faq', 'create');
export const RequireFaqDelete = () => Permission('faq', 'delete');

export const RequireUserManagement = () => Permissions(
    { resource: 'user', action: 'read' },
    { resource: 'user', action: 'update' }
);

export const RequireSystemAdmin = () => Permission('system', 'admin');