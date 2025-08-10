import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // WebSocketアダプターの設定
  app.useWebSocketAdapter(new IoAdapter(app));

  // ロガーの設定
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // グローバルパイプの設定（バリデーション）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // グローバル例外フィルターとインターセプターはCommonModuleで設定済み

  // CORS設定
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Swagger設定
  const config = new DocumentBuilder()
    .setTitle('問い合わせ管理システム API')
    .setDescription('複数アプリケーション対応問い合わせ管理システムのAPI仕様')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`アプリケーションがポート ${port} で起動しました`);
  console.log(`Swagger UI: http://localhost:${port}/api`);
}

bootstrap();