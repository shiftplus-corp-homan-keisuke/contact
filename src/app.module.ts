import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConfig } from './config/database.config';
import { LoggerConfig } from './config/logger.config';
import { CommonModule } from './common/common.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    // 環境変数設定
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // データベース設定
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    
    // ロガー設定
    WinstonModule.forRootAsync({
      useClass: LoggerConfig,
    }),
    
    // 共通モジュール
    CommonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // グローバル例外フィルター
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // グローバルログインターセプター
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}