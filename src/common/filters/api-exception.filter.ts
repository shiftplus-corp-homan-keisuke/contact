/**
 * API用グローバル例外フィルター
 * 要件7.3: 詳細なエラーレスポンス形式の実装
 */

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ConflictException,
    InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import {
    ApiErrorResponseDto,
    ValidationErrorDetailDto,
    API_ERROR_CODES,
    ApiErrorCode
} from '../dto/api-response.dto';

/**
 * すべての例外をキャッチしてAPI形式のエラーレスポンスに変換
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ApiExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status: HttpStatus;
        let errorCode: ApiErrorCode;
        let message: string;
        let details: any[] | undefined;

        // 例外の種類に応じてレスポンスを構築
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (exception instanceof BadRequestException) {
                errorCode = API_ERROR_CODES.VALIDATION_ERROR;
                message = 'リクエストデータに不備があります';

                // バリデーションエラーの詳細を抽出
                if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
                    const responseMessage = (exceptionResponse as any).message;
                    if (Array.isArray(responseMessage)) {
                        details = responseMessage.map(msg => {
                            // class-validatorのエラーメッセージを解析
                            const parts = msg.split(' ');
                            const field = parts[0];
                            return new ValidationErrorDetailDto(field, msg);
                        });
                    } else if (typeof responseMessage === 'string') {
                        message = responseMessage;
                    }
                }
            } else if (exception instanceof UnauthorizedException) {
                errorCode = API_ERROR_CODES.UNAUTHORIZED;
                message = '認証が必要です';
            } else if (exception instanceof ForbiddenException) {
                errorCode = API_ERROR_CODES.FORBIDDEN;
                message = 'このリソースにアクセスする権限がありません';
            } else if (exception instanceof NotFoundException) {
                errorCode = API_ERROR_CODES.NOT_FOUND;
                message = '指定されたリソースが見つかりません';
            } else if (exception instanceof ConflictException) {
                errorCode = API_ERROR_CODES.CONFLICT;
                message = 'リソースの競合が発生しました';
            } else {
                errorCode = API_ERROR_CODES.INTERNAL_SERVER_ERROR;
                message = exception.message || 'サーバー内部エラーが発生しました';
            }
        } else if (exception instanceof QueryFailedError) {
            // データベースエラー
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            errorCode = API_ERROR_CODES.DATABASE_ERROR;
            message = 'データベースエラーが発生しました';

            // 開発環境でのみ詳細なエラー情報を含める
            if (process.env.NODE_ENV === 'development') {
                details = [{
                    query: exception.query,
                    parameters: exception.parameters,
                    driverError: exception.driverError?.message,
                }];
            }
        } else if (exception instanceof Error) {
            // その他のエラー
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            errorCode = API_ERROR_CODES.INTERNAL_SERVER_ERROR;
            message = exception.message || '予期しないエラーが発生しました';
        } else {
            // 不明なエラー
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            errorCode = API_ERROR_CODES.INTERNAL_SERVER_ERROR;
            message = '予期しないエラーが発生しました';
        }

        // エラーログを出力
        const errorLog = {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            statusCode: status,
            errorCode,
            message,
            userAgent: request.get('User-Agent'),
            ip: request.ip,
            userId: (request as any).user?.id,
            stack: exception instanceof Error ? exception.stack : undefined,
        };

        if (status >= 500) {
            this.logger.error('Internal Server Error', errorLog);
        } else if (status >= 400) {
            this.logger.warn('Client Error', errorLog);
        }

        // APIエラーレスポンスを構築
        const errorResponse = new ApiErrorResponseDto(
            errorCode,
            message,
            details,
            request.url
        );

        response.status(status).json(errorResponse);
    }
}

/**
 * レート制限エラー用の専用例外クラス
 */
export class RateLimitExceededException extends HttpException {
    constructor(resetTime?: Date) {
        const message = resetTime
            ? `レート制限を超過しました。${resetTime.toISOString()}以降に再試行してください。`
            : 'レート制限を超過しました。しばらく時間をおいて再試行してください。';

        super({
            code: API_ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message,
            resetTime: resetTime?.toISOString(),
        }, HttpStatus.TOO_MANY_REQUESTS);
    }
}

/**
 * ベクトル化エラー用の専用例外クラス
 */
export class VectorizationException extends HttpException {
    constructor(message: string = 'ベクトル化処理でエラーが発生しました') {
        super({
            code: API_ERROR_CODES.VECTORIZATION_ERROR,
            message,
        }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

/**
 * 外部サービスエラー用の専用例外クラス
 */
export class ExternalServiceException extends HttpException {
    constructor(service: string, message: string = '外部サービスでエラーが発生しました') {
        super({
            code: API_ERROR_CODES.EXTERNAL_SERVICE_ERROR,
            message: `${service}: ${message}`,
            service,
        }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}