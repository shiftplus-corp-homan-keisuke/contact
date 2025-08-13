/**
 * セキュリティ監視サービス
 * 要件: 4.4 (認証試行ログとセキュリティ監視機能)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AuthAttempt } from '../../modules/auth/entities/auth-attempt.entity';

export interface SecurityAlert {
  type: 'BRUTE_FORCE' | 'SUSPICIOUS_IP' | 'MULTIPLE_FAILURES' | 'ACCOUNT_LOCKOUT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: any;
  timestamp: Date;
}

export interface AuthAttemptLog {
  email: string;
  success: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  apiKeyId?: string;
}

@Injectable()
export class SecurityMonitoringService {
  constructor(
    @InjectRepository(AuthAttempt)
    private readonly authAttemptRepository: Repository<AuthAttempt>,
  ) {}

  /**
   * 認証試行ログの記録
   * 要件: 4.4 - 無効な認証情報でのアクセス試行ログ記録
   */
  async logAuthAttempt(attemptLog: AuthAttemptLog): Promise<void> {
    const authAttempt = this.authAttemptRepository.create({
      email: attemptLog.email,
      success: attemptLog.success,
      failureReason: attemptLog.failureReason,
      ipAddress: attemptLog.ipAddress,
      userAgent: attemptLog.userAgent,
    });

    await this.authAttemptRepository.save(authAttempt);

    // 失敗した認証試行の場合、セキュリティアラートをチェック
    if (!attemptLog.success) {
      await this.checkSecurityAlerts(attemptLog);
    }
  }

  /**
   * 疑わしい活動の検知
   * 要件: 4.4 - セキュリティ監視機能
   */
  async detectSuspiciousActivity(userId?: string, email?: string): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ブルートフォース攻撃の検知
    if (email) {
      const recentFailures = await this.authAttemptRepository.count({
        where: {
          email,
          success: false,
          attemptedAt: MoreThan(oneHourAgo),
        },
      });

      if (recentFailures >= 5) {
        alerts.push({
          type: 'BRUTE_FORCE',
          severity: recentFailures >= 10 ? 'CRITICAL' : 'HIGH',
          message: `${email}に対する連続ログイン失敗を検知しました`,
          details: { email, failureCount: recentFailures, timeWindow: '1時間' },
          timestamp: now,
        });
      }
    }

    // 疑わしいIPアドレスの検知
    const suspiciousIPs = await this.detectSuspiciousIPs(oneDayAgo);
    for (const ipInfo of suspiciousIPs) {
      alerts.push({
        type: 'SUSPICIOUS_IP',
        severity: 'MEDIUM',
        message: `疑わしいIPアドレスからの大量アクセスを検知しました`,
        details: ipInfo,
        timestamp: now,
      });
    }

    return alerts;
  }

  /**
   * 認証試行統計の取得
   */
  async getAuthAttemptStats(days: number = 7): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    successRate: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
    hourlyBreakdown: Array<{ hour: number; attempts: number; failures: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attempts = await this.authAttemptRepository.find({
      where: { attemptedAt: MoreThan(startDate) },
      order: { attemptedAt: 'ASC' },
    });

    const totalAttempts = attempts.length;
    const successfulAttempts = attempts.filter(a => a.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

    // 失敗理由の集計
    const failureReasons = new Map<string, number>();
    attempts.filter(a => !a.success && a.failureReason).forEach(attempt => {
      const reason = attempt.failureReason!;
      failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
    });

    const topFailureReasons = Array.from(failureReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 時間別統計
    const hourlyStats = new Map<number, { attempts: number; failures: number }>();
    attempts.forEach(attempt => {
      const hour = attempt.attemptedAt.getHours();
      const stats = hourlyStats.get(hour) || { attempts: 0, failures: 0 };
      stats.attempts++;
      if (!attempt.success) {
        stats.failures++;
      }
      hourlyStats.set(hour, stats);
    });

    const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      attempts: hourlyStats.get(hour)?.attempts || 0,
      failures: hourlyStats.get(hour)?.failures || 0,
    }));

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate,
      topFailureReasons,
      hourlyBreakdown,
    };
  }

  /**
   * IPアドレス別の認証試行統計
   */
  async getIPAddressStats(days: number = 7): Promise<Array<{
    ipAddress: string;
    totalAttempts: number;
    failedAttempts: number;
    successRate: number;
    lastAttempt: Date;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attempts = await this.authAttemptRepository.find({
      where: { attemptedAt: MoreThan(startDate) },
    });

    const ipStats = new Map<string, {
      total: number;
      failed: number;
      lastAttempt: Date;
    }>();

    attempts.forEach(attempt => {
      if (!attempt.ipAddress) return;
      
      const stats = ipStats.get(attempt.ipAddress) || {
        total: 0,
        failed: 0,
        lastAttempt: attempt.attemptedAt,
      };
      
      stats.total++;
      if (!attempt.success) {
        stats.failed++;
      }
      if (attempt.attemptedAt > stats.lastAttempt) {
        stats.lastAttempt = attempt.attemptedAt;
      }
      
      ipStats.set(attempt.ipAddress, stats);
    });

    return Array.from(ipStats.entries()).map(([ipAddress, stats]) => {
      const successRate = stats.total > 0 ? ((stats.total - stats.failed) / stats.total) * 100 : 0;
      
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (stats.failed >= 10 || successRate < 50) {
        riskLevel = 'HIGH';
      } else if (stats.failed >= 5 || successRate < 80) {
        riskLevel = 'MEDIUM';
      }

      return {
        ipAddress,
        totalAttempts: stats.total,
        failedAttempts: stats.failed,
        successRate,
        lastAttempt: stats.lastAttempt,
        riskLevel,
      };
    }).sort((a, b) => b.totalAttempts - a.totalAttempts);
  }

  /**
   * セキュリティアラートのチェック
   */
  private async checkSecurityAlerts(attemptLog: AuthAttemptLog): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 同一メールアドレスからの連続失敗をチェック
    const recentFailures = await this.authAttemptRepository.count({
      where: {
        email: attemptLog.email,
        success: false,
        attemptedAt: MoreThan(oneHourAgo),
      },
    });

    // 閾値を超えた場合はログに記録（実際の実装では通知システムと連携）
    if (recentFailures >= 5) {
      console.warn(`Security Alert: Brute force attempt detected for ${attemptLog.email}`, {
        failureCount: recentFailures,
        ipAddress: attemptLog.ipAddress,
        userAgent: attemptLog.userAgent,
      });
    }

    // 同一IPアドレスからの大量アクセスをチェック
    if (attemptLog.ipAddress) {
      const ipFailures = await this.authAttemptRepository.count({
        where: {
          ipAddress: attemptLog.ipAddress,
          success: false,
          attemptedAt: MoreThan(oneHourAgo),
        },
      });

      if (ipFailures >= 10) {
        console.warn(`Security Alert: Suspicious IP activity detected`, {
          ipAddress: attemptLog.ipAddress,
          failureCount: ipFailures,
        });
      }
    }
  }

  /**
   * 疑わしいIPアドレスの検知
   */
  private async detectSuspiciousIPs(since: Date): Promise<Array<{
    ipAddress: string;
    attemptCount: number;
    failureRate: number;
  }>> {
    const attempts = await this.authAttemptRepository.find({
      where: { attemptedAt: MoreThan(since) },
    });

    const ipStats = new Map<string, { total: number; failed: number }>();
    
    attempts.forEach(attempt => {
      if (!attempt.ipAddress) return;
      
      const stats = ipStats.get(attempt.ipAddress) || { total: 0, failed: 0 };
      stats.total++;
      if (!attempt.success) {
        stats.failed++;
      }
      ipStats.set(attempt.ipAddress, stats);
    });

    return Array.from(ipStats.entries())
      .filter(([_, stats]) => stats.total >= 20 || stats.failed >= 10)
      .map(([ipAddress, stats]) => ({
        ipAddress,
        attemptCount: stats.total,
        failureRate: (stats.failed / stats.total) * 100,
      }))
      .filter(ip => ip.failureRate >= 50);
  }

  /**
   * 古い認証試行ログのクリーンアップ
   */
  async cleanupOldAuthAttempts(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.authAttemptRepository.delete({
      attemptedAt: MoreThan(cutoffDate),
    });

    return result.affected || 0;
  }
}