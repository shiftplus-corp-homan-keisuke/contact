import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || '';
        const requestId = headers['x-request-id'] || this.generateRequestId();

        const startTime = Date.now();

        // リクエスト開始ログ
        this.logger.log(
            `[${requestId}] ${method} ${url} - ${ip} - ${userAgent}`,
        );

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime;
                    const { statusCode } = response;

                    // レスポンス成功ログ
                    this.logger.log(
                        `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms`,
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const statusCode = error.status || 500;

                    // レスポンスエラーログ
                    this.logger.error(
                        `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
                        error.stack,
                    );
                },
            }),
        );
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}