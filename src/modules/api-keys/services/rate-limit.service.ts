/**
 * レート制限サービス
 * 要件7.4: レート制限機能の実装
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RateLimitTracking } from '../entities/rate-limit-tracking.entity';
import { RateLimitStatus, RateLimitResult } from '../types/api-key.types';

@Injectable()
export class RateLimitService {
    private readonly logger = new Logger(RateLimitService.name);

    constructor(
        @InjectRepository(RateLimitTracking)
        private readonly rateLimitRepository: Repository<RateLimitTracking>,
    ) { }

    /**
     * レート制限をチェック
     * 要件7.4: レート制限機能の実装
     */
    async checkRateLimit(apiKey: string): Promise<RateLimitStatus> {
        try {
            const keyHash = this.hashKey(apiKey);
            const now = new Date();
            const windowStart = new Date(now.getTime() - 60000); // 1分間のウィンドウ

            // 現在のウィンドウ内のリクエスト数を取得
            const currentCount = await this.rateLimitRepository.count({
                where: {
                    keyHash,
                    timestamp: {
                        $gte: windowStart,
                    } as any,
                },
            });

            // デフォルトの制限値（実際の実装ではAPIキーごとに設定）
            const limit = 100;
            const resetTime = new Date(Math.ceil(now.getTime() / 60000) * 60000);

            return {
                isExceeded: currentCount >= limit,
                current: currentCount,
                limit,
                resetTime,
                remaining: Math.max(0, limit - currentCount),
            };

        } catch (error) {
            this.logger.error(`レート制限チェックエラー: ${error.message}`, error.stack);
            // エラーの場合は制限なしとして扱う
            return {
                isExceeded: false,
                current: 0,
                limit: 100,
                resetTime: new Date(),
                remaining: 100,
            };
        }
    }

    /**
     * レート制限をチェックして使用回数を増加
     * 要件7.4: レート制限機能の実装
     */
    async checkAndIncrementRateLimit(
        key: string,
        windowMs: number,
        maxRequests: number
    ): Promise<RateLimitResult> {
        try {
            const keyHash = this.hashKey(key);
            const now = Date.now();
            const windowStart = now - windowMs;

            // 古いレコードを削除
            await this.rateLimitRepository
                .createQueryBuilder()
                .delete()
                .where('key_hash = :keyHash AND timestamp < :windowStart', {
                    keyHash,
                    windowStart: new Date(windowStart),
                })
                .execute();

            // 現在のウィンドウ内のリクエスト数を取得
            const currentCount = await this.rateLimitRepository.count({
                where: {
                    keyHash,
                    timestamp: {
                        $gte: new Date(windowStart),
                    } as any,
                },
            });

            const resetTime = Math.ceil(now / windowMs) * windowMs;

            if (currentCount >= maxRequests) {
                return {
                    isExceeded: true,
                    current: currentCount,
                    resetTime,
                };
            }

            // 新しいリクエストを記録
            await this.rateLimitRepository.save({
                keyHash,
                timestamp: new Date(now),
            });

            return {
                isExceeded: false,
                current: currentCount + 1,
                resetTime,
            };

        } catch (error) {
            this.logger.error(`レート制限処理エラー: ${error.message}`, error.stack);
            // エラーの場合は制限なしとして扱う
            return {
                isExceeded: false,
                current: 0,
                resetTime: Date.now() + windowMs,
            };
        }
    }

    /**
     * キーをハッシュ化
     */
    private hashKey(key: string): string {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(key).digest('hex');
    }
}