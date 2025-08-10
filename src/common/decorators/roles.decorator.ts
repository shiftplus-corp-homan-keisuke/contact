/**
 * 役割デコレーター
 * 要件: 5.2, 5.3, 5.4 (権限管理機能)
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);