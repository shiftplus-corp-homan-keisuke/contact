import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { TransformInterceptor, LoggingInterceptor } from './common/interceptors';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const logger = new Logger('Bootstrap');

    // Winstonロガーを使用
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

    // WebSocketアダプターの設定
    app.useWebSocketAdapter(new IoAdapter(app));

    // グローバルパイプの設定
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // グローバルフィルターの設定
    app.useGlobalFilters(new GlobalExceptionFilter());

    // グローバルインターセプターの設定
    app.useGlobalInterceptors(
        new TransformInterceptor(),
        new LoggingInterceptor(),
    );

    // CORS設定
    app.enableCors({
        origin: process.env.NODE_ENV === 'production'
            ? configService.get<string[]>('ALLOWED_ORIGINS', [])
            : true,
        credentials: true,
    });

    // Swagger設定
    if (process.env.NODE_ENV !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('問い合わせ管理システム API')
            .setDescription('複数の自社製アプリケーションに対する問い合わせを統合管理するシステムのAPI仕様')
            .setVersion('1.0')
            .addBearerAuth()
            .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
    }

    // ヘルスチェックエンドポイント
    app.use('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });

    const port = configService.get<number>('PORT', 3000);
    await app.listen(port);

    logger.log(`アプリケーションがポート ${port} で起動しました`);
    logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
    logger.log(`ヘルスチェック: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
    console.error('アプリケーションの起動に失敗しました:', error);
    process.exit(1);
});