/**
 * 履歴追跡デコレーター
 * 要件: 2.2, 2.4, 4.3 (履歴記録の自動化機能)
 */

import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TRACK_HISTORY_KEY = 'track_history';

/**
 * メソッドに履歴追跡を有効にするデコレーター
 */
export const TrackHistory = () => SetMetadata(TRACK_HISTORY_KEY, true);

/**
 * 現在のユーザーIDを取得するパラメーターデコレーター
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id || request.userId || 'system';
  },
);