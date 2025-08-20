import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { BaseResponseDto, ErrorDto, ValidationErrorDto } from '../dto';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants';
import { ValidationUtils } from '../utils';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status: number;
        let errorResponse: ErrorDto;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            errorResponse = this.handleHttpException(exception, request.url);
        } else if (exception instanceof QueryFailedError) {
            status = HttpStatus.BAD_REQUEST;
            errorResponse = this.handleDatabaseError(exception, request.url);
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            errorResponse = this.handleUnknownError(exception, request.url);
        }

        // エラーログを出力
        this.logger.error(
            `${request.method} ${request.url} - ${status} - ${errorResponse.message}`,
            exception instanceof Error ? exception.stack : String(exception),
        );

        // レスポンスを返却
        const responseBody = BaseResponseDto.error(errorResponse);
        response.status(status).json(responseBody);
    }

    private handleHttpException(exception: HttpException, path: string): ErrorDto {
        const response = exception.getResponse();

        if (typeof response === 'object' && 'message' in response) {
            const exceptionResponse = response as any;

            // バリデーションエラーの場合
            if (Array.isArray(exceptionResponse.message)) {
                const validationErrors = exceptionResponse.message.map((msg: any) => {
                    if (typeof msg === 'string') {
                        return new ValidationErrorDto('unknown', msg);
                    }
                    return new ValidationErrorDto(msg.field || 'unknown', msg.message || msg);
                });

                return new ErrorDto(
                    ERROR_CODES.VALIDATION_ERROR,
                    ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR],
                    validationErrors,
                    path,
                );
            }

            // その他のHTTPエラー
            return new ErrorDto(
                this.getErrorCodeFromStatus(exception.getStatus()),
                exceptionResponse.message || exception.message,
                undefined,
                path,
            );
        }

        return new ErrorDto(
            this.getErrorCodeFromStatus(exception.getStatus()),
            exception.message,
            undefined,
            path,
        );
    }

    private handleDatabaseError(exception: QueryFailedError, path: string): ErrorDto {
        const message = exception.message;

        // 重複キーエラー
        if (message.includes('duplicate key') || message.includes('UNIQUE constraint')) {
            return new ErrorDto(
                ERROR_CODES.RESOURCE_ALREADY_EXISTS,
                ERROR_MESSAGES[ERROR_CODES.RESOURCE_ALREADY_EXISTS],
                undefined,
                path,
            );
        }

        // 外部キー制約エラー
        if (message.includes('foreign key constraint') || message.includes('FOREIGN KEY constraint')) {
            return new ErrorDto(
                ERROR_CODES.RESOURCE_CONFLICT,
                ERROR_MESSAGES[ERROR_CODES.RESOURCE_CONFLICT],
                undefined,
                path,
            );
        }

        // その他のデータベースエラー
        return new ErrorDto(
            ERROR_CODES.DATABASE_ERROR,
            ERROR_MESSAGES[ERROR_CODES.DATABASE_ERROR],
            undefined,
            path,
        );
    }

    private handleUnknownError(exception: unknown, path: string): ErrorDto {
        const message = exception instanceof Error ? exception.message : 'Unknown error occurred';

        return new ErrorDto(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
            undefined,
            path,
        );
    }

    private getErrorCodeFromStatus(status: number): string {
        switch (status) {
            case HttpStatus.UNAUTHORIZED:
                return ERROR_CODES.UNAUTHORIZED;
            case HttpStatus.FORBIDDEN:
                return ERROR_CODES.FORBIDDEN;
            case HttpStatus.NOT_FOUND:
                return ERROR_CODES.RESOURCE_NOT_FOUND;
            case HttpStatus.CONFLICT:
                return ERROR_CODES.RESOURCE_CONFLICT;
            case HttpStatus.BAD_REQUEST:
                return ERROR_CODES.VALIDATION_ERROR;
            case HttpStatus.TOO_MANY_REQUESTS:
                return ERROR_CODES.RATE_LIMIT_EXCEEDED;
            case HttpStatus.SERVICE_UNAVAILABLE:
                return ERROR_CODES.SERVICE_UNAVAILABLE;
            default:
                return ERROR_CODES.INTERNAL_SERVER_ERROR;
        }
    }
}