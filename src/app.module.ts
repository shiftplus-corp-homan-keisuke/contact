import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { databaseConfig } from './config/database.config';
import { loggerConfig } from './config/logger.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { SearchModule } from './modules/search/search.module';
import { FAQsModule } from './modules/faqs/faqs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FilesModule } from './modules/files/files.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

@Module({
    imports: [
        // 設定モジュール
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        // データベースモジュール
        TypeOrmModule.forRootAsync({
            useFactory: databaseConfig,
        }),

        // ロガーモジュール
        WinstonModule.forRootAsync({
            useFactory: loggerConfig,
        }),

        // レート制限モジュール
        ThrottlerModule.forRoot([
            {
                ttl: 60000, // 1分
                limit: 100, // 100リクエスト/分
            },
        ]),

        // イベントエミッターモジュール
        EventEmitterModule.forRoot(),

        // 機能モジュール
        AuthModule,
        UsersModule,
        ApiKeysModule,
        InquiriesModule,
        ResponsesModule,
        SearchModule,
        FAQsModule,
        NotificationsModule,
        AnalyticsModule,

        // 今後追加予定のモジュール
        // TemplatesModule,

        // ファイル管理モジュール
        FilesModule,
    ],
    controllers: [],
    providers: [
        // グローバルJWT認証ガード
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        // グローバルAPIエラーフィルター
        {
            provide: APP_FILTER,
            useClass: ApiExceptionFilter,
        },
    ],
})
export class AppModule { }