/**
 * 履歴追跡インターセプター
 * 要件: 2.2, 2.4, 4.3 (履歴記録の自動化機能)
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { HistoryService } from '../services/history.service';
import { TRACK_HISTORY_KEY } from '../decorators/track-history.decorator';

@Injectable()
export class HistoryTrackingInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private historyService: HistoryService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isTrackingEnabled = this.reflector.getAllAndOverride<boolean>(
      TRACK_HISTORY_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!isTrackingEnabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.userId || 'system';

    // リクエスト開始時に現在のユーザーIDを設定
    return next.handle().pipe(
      tap(async () => {
        try {
          await this.historyService.setCurrentUserId(userId);
        } catch (error) {
          console.warn('Failed to set current user ID for history tracking:', error);
        }
      }),
      finalize(async () => {
        try {
          await this.historyService.clearCurrentUserId();
        } catch (error) {
          console.warn('Failed to clear current user ID after history tracking:', error);
        }
      })
    );
  }
}