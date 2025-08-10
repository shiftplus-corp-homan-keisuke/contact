/**
 * Redis設定モジュール
 * 要件: 7.4 (レート制限機能の実装)
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const client = createClient({
          socket: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
          password: configService.get<string>('REDIS_PASSWORD'),
          database: configService.get<number>('REDIS_DB', 0),
        });

        client.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        client.on('connect', () => {
          console.log('Redis Client Connected');
        });

        client.on('ready', () => {
          console.log('Redis Client Ready');
        });

        client.on('end', () => {
          console.log('Redis Client Disconnected');
        });

        try {
          await client.connect();
          console.log('Redis connection established successfully');
        } catch (error) {
          console.error('Failed to connect to Redis:', error);
          // Redis接続に失敗してもアプリケーションは起動する（フォールバック機能のため）
        }

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}