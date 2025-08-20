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
    /**
     * レート制限違反を検出
     */
    async detectRateLimitViolations(): Promise<any[]> {
        try {
            // 過去1時間のレート制限違反を検出
            const oneHourAgo = new Date(Date.now() - 3600000);

            const violations = await this.rateLimitRepository
                .createQueryBuilder('tracking')
                .select('tracking.keyHash')
                .addSelect('COUNT(*)', 'requestCount')
                .where('tracking.timestamp > :oneHourAgo', { oneHourAgo })
                .groupBy('tracking.keyHash')
                .having('COUNT(*) > :threshold', { threshold: 1000 }) // 1時間に1000リクエスト以上
                .getRawMany();

            return violations.map(violation => ({
                keyHash: violation.keyHash,
                requestCount: parseInt(violation.requestCount),
                detectedAt: new Date(),
                severity: 'high',
            }));

        } catch (error) {
            this.logger.error(`レート制限違反検出エラー: ${error.message}`, error.stack);
            return [];
        }
    }

    /**
     * 疑わしいパターンを検出
     */
    async detectSuspiciousPatterns(): Promise<any[]> {
        try {
            // 短時間での大量リクエストを検出
            const fiveMinutesAgo = new Date(Date.now() - 300000);

            const suspiciousPatterns = await this.rateLimitRepository
                .createQueryBuilder('tracking')
                .select('tracking.keyHash')
                .addSelect('COUNT(*)', 'requestCount')
                .where('tracking.timestamp > :fiveMinutesAgo', { fiveMinutesAgo })
                .groupBy('tracking.keyHash')
                .having('COUNT(*) > :threshold', { threshold: 100 }) // 5分間に100リクエスト以上
                .getRawMany();

            return suspiciousPatterns.map(pattern => ({
                keyHash: pattern.keyHash,
                requestCount: parseInt(pattern.requestCount),
                timeWindow: '5 minutes',
                detectedAt: new Date(),
                type: 'burst_requests',
            }));

        } catch (error) {
            this.logger.error(`疑わしいパターン検出エラー: ${error.message}`, error.stack);
            return [];
        }
    }

    /**
     * 使用レポートを生成
     */
    async generateUsageReport(days: number = 7): Promise<any> {
        try {
            const startDate = new Date(Date.now() - days * 24 * 3600000);

            const usageData = await this.rateLimitRepository
                .createQueryBuilder('tracking')
                .select('tracking.keyHash')
                .addSelect('DATE(tracking.timestamp)', 'date')
                .addSelect('COUNT(*)', 'requestCount')
                .where('tracking.timestamp > :startDate', { startDate })
                .groupBy('tracking.keyHash, DATE(tracking.timestamp)')
                .orderBy('DATE(tracking.timestamp)', 'DESC')
                .getRawMany();

            // データを整理
            const report = {
                period: {
                    startDate,
                    endDate: new Date(),
                    days,
                },
                summary: {
                    totalRequests: usageData.reduce((sum, item) => sum + parseInt(item.requestCount), 0),
                    uniqueKeys: new Set(usageData.map(item => item.keyHash)).size,
                    averageRequestsPerDay: 0,
                },
                dailyUsage: usageData,
            };

            report.summary.averageRequestsPerDay = Math.round(report.summary.totalRequests / days);

            return report;

        } catch (error) {
            this.logger.error(`使用レポート生成エラー: ${error.message}`, error.stack);
            return {
                period: { startDate: new Date(), endDate: new Date(), days },
                summary: { totalRequests: 0, uniqueKeys: 0, averageRequestsPerDay: 0 },
                dailyUsage: [],
            };
        }
    }
}