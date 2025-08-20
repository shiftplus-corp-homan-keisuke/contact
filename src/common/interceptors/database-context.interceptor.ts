/**
 * データベースコンテキストインターセプター
 * リクエスト処理中に自動的にデータベースコンテキストを設定
 */

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { DatabaseContextService } from '../services/database-context.service';

@Injectable()
export class DatabaseContextInterceptor implements NestInterceptor {
    constructor(
        private readonly databaseContextService: DatabaseContextService,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();

        // リクエストからユーザー情報とIPアドレスを取得
        const user = request.user;
        const ipAddress = this.getClientIpAddress(request);
        const sessionId = request.sessionID || request.headers['x-session-id'];

        // データベースコンテキストを設定
        const contextPromise = this.databaseContextService.setContext({
            userId: user?.id,
            ipAddress,
            sessionId,
        });

        return next.handle().pipe(
            tap(async () => {
                // リクエスト処理前にコンテキストが設定されるまで待機
                await contextPromise;
            }),
            finalize(async () => {
                // リクエスト処理後にコンテキストをクリア
                try {
                    await this.databaseContextService.clearContext();
                } catch (error) {
                    // ログ出力（実際の実装ではロガーを使用）
                    console.error('Failed to clear database context:', error);
                }
            }),
        );
    }

    /**
     * クライアントのIPアドレスを取得
     */
    private getClientIpAddress(request: any): string {
        return (
            request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.headers['x-real-ip'] ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            request.ip ||
            'unknown'
        );
    }
}