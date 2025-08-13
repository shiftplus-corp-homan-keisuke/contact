import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConfig } from './config/database.config';
import { LoggerConfig } from './config/logger.config';
import { AppConfigService } from './config/app.config';
import { CommonModule } from './common/common.module';

// 機能モジュール
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { SearchModule } from './modules/search/search.module';
import { FAQsModule } from './modules/faqs/faqs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { FilesModule } from './modules/files/files.module';

// 真の共通機能（全モジュール共通）
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
    
    // コアモジュール（依存関係の順序に注意）
    CommonModule,
    
    // 認証・ユーザー管理モジュール
    AuthModule,
    UsersModule,
    
    // 検索・ベクトル機能モジュール
    SearchModule,
    
    // コア機能モジュール
    InquiriesModule,
    ResponsesModule,
    
    // 支援機能モジュール
    FAQsModule,
    NotificationsModule,
    TemplatesModule,
    FilesModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppConfigService, // アプリケーション設定サービス
    // 真の共通機能をグローバルに適用
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter, // 全モジュール共通の例外処理
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // 全モジュール共通のログ記録
    },
  ],
})
export class AppModule {}