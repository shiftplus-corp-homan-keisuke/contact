import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { format } from 'winston';

export const loggerConfig = (): WinstonModuleOptions => {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logFilePath = process.env.LOG_FILE_PATH || 'logs/app.log';

    const logFormat = format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.json(),
        format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
            let log = `${timestamp} [${level.toUpperCase()}]`;

            if (context) {
                log += ` [${context}]`;
            }

            log += ` ${message}`;

            if (Object.keys(meta).length > 0) {
                log += ` ${JSON.stringify(meta)}`;
            }

            if (stack) {
                log += `\n${stack}`;
            }

            return log;
        }),
    );

    const transports: winston.transport[] = [
        // コンソール出力
        new winston.transports.Console({
            level: logLevel,
            format: format.combine(
                format.colorize(),
                format.simple(),
                format.printf(({ timestamp, level, message, context }) => {
                    let log = `${timestamp} [${level}]`;
                    if (context) {
                        log += ` [${context}]`;
                    }
                    log += ` ${message}`;
                    return log;
                }),
            ),
        }),
    ];

    // 本番環境ではファイル出力も追加
    if (process.env.NODE_ENV === 'production') {
        transports.push(
            // 全レベルのログファイル
            new winston.transports.File({
                filename: logFilePath,
                level: logLevel,
                format: logFormat,
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
            // エラーレベル専用ログファイル
            new winston.transports.File({
                filename: logFilePath.replace('.log', '-error.log'),
                level: 'error',
                format: logFormat,
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
        );
    }

    return {
        level: logLevel,
        format: logFormat,
        transports,
        // 未処理の例外とPromise拒否をキャッチ
        exceptionHandlers: [
            new winston.transports.File({
                filename: 'logs/exceptions.log',
                format: logFormat,
            }),
        ],
        rejectionHandlers: [
            new winston.transports.File({
                filename: 'logs/rejections.log',
                format: logFormat,
            }),
        ],
    };
};