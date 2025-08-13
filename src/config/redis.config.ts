/**
 * Redis設定
 * キャッシュとセッション管理用
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { RedisModuleOptions, RedisModuleOptionsFactory } from '@nestjs-modules/ioredis';

@Injectable()
export class RedisConfig {
  constructor(private configService: ConfigService) {}

  createRedisModuleOptions(): any {
    return {
      type: 'single',
      url: this.getRedisUrl(),
      options: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // 接続プール設定
        family: 4,
        // エラーハンドリング
        retryDelayOnClusterDown: 300,
      },
    };
  }

  /**
   * Redis接続URLを生成
   */
  private getRedisUrl(): string {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = this.configService.get<number>('REDIS_DB', 0);

    if (password) {
      return `redis://:${password}@${host}:${port}/${db}`;
    } else {
      return `redis://${host}:${port}/${db}`;
    }
  }

  /**
   * キャッシュ用Redis設定
   */
  getCacheConfig() {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_CACHE_DB', 1), // キャッシュ専用DB
      keyPrefix: 'cache:',
      ttl: this.configService.get<number>('CACHE_TTL', 3600), // 1時間
    };
  }

  /**
   * セッション用Redis設定
   */
  getSessionConfig() {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_SESSION_DB', 2), // セッション専用DB
      keyPrefix: 'session:',
      ttl: this.configService.get<number>('SESSION_TTL', 86400), // 24時間
    };
  }

  /**
   * レート制限用Redis設定
   */
  getRateLimitConfig() {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_RATE_LIMIT_DB', 3), // レート制限専用DB
      keyPrefix: 'rate_limit:',
    };
  }
}