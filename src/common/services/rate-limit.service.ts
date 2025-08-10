/**
 * レート制限サービス
 * 要件: 7.4 (API利用制限の管理)
 */

import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { createClient, RedisClientType } from 'redis';
import { RateLimitTracking } from '../entities/rate-limit-tracking.entity';
import { ApiKey } from '../entities/api-key.entity';
import { RateLimitStatus } from './api-key.service';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  limit: number;
}

@Injectable()
export class RateLimitService {
  constructor(
    @InjectRepository(RateLimitTracking)
    private readonly rateLimitTrackingRepository: Repository<RateLimitTracking>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @Inject('REDIS_CLIENT')
    private readonly redisClient: RedisClientType,
  ) {}

  /**
   * レート制限チェック
   * 要件: 7.4 - API利用制限を超過した場合のレート制限エラー返却
   */
  async checkRateLimit(apiKeyId: string, rateLimitPerHour: number): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (60 * 60 * 1000)); // 1時間前
    const windowEnd = now;

    // Redisを使用した高速レート制限チェック
    const redisKey = `rate_limit:${apiKeyId}:${this.getHourWindow(now)}`;
    
    try {
      // Redisでカウンターを取得・更新
      const currentCount = await this.redisClient.incr(redisKey);
      
      // 初回の場合は有効期限を設定（1時間）
      if (currentCount === 1) {
        await this.redisClient.expire(redisKey, 3600);
      }

      const remaining = Math.max(0, rateLimitPerHour - currentCount);
      const resetTime = new Date(Math.ceil(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000));

      // データベースにも記録（統計用）
      await this.updateDatabaseTracking(apiKeyId, windowStart, windowEnd, currentCount);

      return {
        allowed: currentCount <= rateLimitPerHour,
        remaining,
        resetTime,
        limit: rateLimitPerHour,
      };
    } catch (redisError) {
      // Redisが利用できない場合はデータベースフォールバック
      console.warn('Redis unavailable, falling back to database rate limiting:', redisError);
      return this.checkRateLimitDatabase(apiKeyId, rateLimitPerHour, windowStart, windowEnd);
    }
  }

  /**
   * データベースベースのレート制限チェック（フォールバック）
   */
  private async checkRateLimitDatabase(
    apiKeyId: string,
    rateLimitPerHour: number,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<RateLimitResult> {
    // 現在の時間窓での既存の追跡レコードを取得
    const existingTracking = await this.rateLimitTrackingRepository.findOne({
      where: {
        apiKeyId,
        windowStart: MoreThan(windowStart),
      },
      order: { createdAt: 'DESC' },
    });

    let currentCount = 1;
    
    if (existingTracking && existingTracking.windowEnd > new Date()) {
      // 既存のウィンドウ内の場合、カウントを増加
      currentCount = existingTracking.requestCount + 1;
      existingTracking.requestCount = currentCount;
      await this.rateLimitTrackingRepository.save(existingTracking);
    } else {
      // 新しいウィンドウの場合、新しい追跡レコードを作成
      const newTracking = this.rateLimitTrackingRepository.create({
        apiKeyId,
        requestCount: currentCount,
        windowStart,
        windowEnd,
      });
      await this.rateLimitTrackingRepository.save(newTracking);
    }

    const remaining = Math.max(0, rateLimitPerHour - currentCount);
    const resetTime = new Date(Math.ceil(windowEnd.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000));

    return {
      allowed: currentCount <= rateLimitPerHour,
      remaining,
      resetTime,
      limit: rateLimitPerHour,
    };
  }

  /**
   * データベース追跡情報の更新
   */
  private async updateDatabaseTracking(
    apiKeyId: string,
    windowStart: Date,
    windowEnd: Date,
    currentCount: number,
  ): Promise<void> {
    const hourWindow = this.getHourWindow(new Date());
    
    // 既存の追跡レコードを確認
    const existingTracking = await this.rateLimitTrackingRepository.findOne({
      where: {
        apiKeyId,
        windowStart: MoreThan(new Date(Date.now() - 60 * 60 * 1000)),
      },
    });

    if (existingTracking) {
      // 既存レコードを更新
      existingTracking.requestCount = currentCount;
      await this.rateLimitTrackingRepository.save(existingTracking);
    } else {
      // 新しいレコードを作成
      const newTracking = this.rateLimitTrackingRepository.create({
        apiKeyId,
        requestCount: currentCount,
        windowStart,
        windowEnd,
      });
      await this.rateLimitTrackingRepository.save(newTracking);
    }
  }

  /**
   * 時間窓の取得（時間単位）
   */
  private getHourWindow(date: Date): string {
    const hour = Math.floor(date.getTime() / (60 * 60 * 1000));
    return hour.toString();
  }

  /**
   * レート制限統計の取得
   */
  async getRateLimitStats(apiKeyId: string, days: number = 7): Promise<{
    totalRequests: number;
    averageRequestsPerHour: number;
    peakHour: { hour: string; requests: number };
    dailyBreakdown: Array<{ date: string; requests: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trackingRecords = await this.rateLimitTrackingRepository.find({
      where: {
        apiKeyId,
        createdAt: MoreThan(startDate),
      },
      order: { createdAt: 'ASC' },
    });

    const totalRequests = trackingRecords.reduce((sum, record) => sum + record.requestCount, 0);
    const averageRequestsPerHour = totalRequests / (days * 24);

    // ピーク時間の計算
    const hourlyStats = new Map<string, number>();
    trackingRecords.forEach(record => {
      const hour = record.windowStart.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + record.requestCount);
    });

    const peakHour = Array.from(hourlyStats.entries())
      .reduce((max, [hour, requests]) => 
        requests > max.requests ? { hour, requests } : max,
        { hour: '', requests: 0 }
      );

    // 日別統計
    const dailyStats = new Map<string, number>();
    trackingRecords.forEach(record => {
      const date = record.windowStart.toISOString().substring(0, 10); // YYYY-MM-DD
      dailyStats.set(date, (dailyStats.get(date) || 0) + record.requestCount);
    });

    const dailyBreakdown = Array.from(dailyStats.entries())
      .map(([date, requests]) => ({ date, requests }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRequests,
      averageRequestsPerHour,
      peakHour,
      dailyBreakdown,
    };
  }

  /**
   * 古い追跡レコードのクリーンアップ
   */
  async cleanupOldTrackingRecords(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.rateLimitTrackingRepository.delete({
      createdAt: MoreThan(cutoffDate),
    });

    return result.affected || 0;
  }

  /**
   * APIキーのレート制限リセット（管理者用）
   */
  async resetRateLimit(apiKeyId: string): Promise<void> {
    const now = new Date();
    const redisKey = `rate_limit:${apiKeyId}:${this.getHourWindow(now)}`;
    
    try {
      await this.redisClient.del(redisKey);
    } catch (error) {
      console.warn('Failed to reset Redis rate limit:', error);
    }

    // データベースの追跡レコードも削除
    await this.rateLimitTrackingRepository.delete({
      apiKeyId,
      windowStart: MoreThan(new Date(now.getTime() - 60 * 60 * 1000)),
    });
  }
}