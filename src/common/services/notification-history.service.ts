/**
 * 通知履歴管理サービス
 * 要件: 1.5 (登録完了通知), 2.2, 2.3 (状態変更通知)
 */

import { Injectable, Logger } from '@nestjs/common';
import { 
  NotificationHistory, 
  NotificationStatistics,
  NotificationChannel,
  NotificationEventType 
} from '../types/notification.types';

@Injectable()
export class NotificationHistoryService {
  private readonly logger = new Logger(NotificationHistoryService.name);
  private readonly history = new Map<string, NotificationHistory>();

  /**
   * 通知履歴記録
   */
  recordNotification(
    type: NotificationChannel,
    eventType: NotificationEventType,
    recipients: string[],
    subject: string,
    content: string,
    metadata: Record<string, any> = {}
  ): NotificationHistory {
    const id = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const historyRecord: NotificationHistory = {
      id,
      type,
      eventType,
      recipients,
      subject,
      content,
      status: 'pending',
      createdAt: new Date(),
      metadata,
    };

    this.history.set(id, historyRecord);
    this.logger.log(`通知履歴を記録しました: ${id}`);
    
    return historyRecord;
  }

  /**
   * 通知送信成功記録
   */
  recordSuccess(id: string): void {
    const record = this.history.get(id);
    if (record) {
      record.status = 'sent';
      record.sentAt = new Date();
      this.history.set(id, record);
      this.logger.log(`通知送信成功を記録しました: ${id}`);
    }
  }

  /**
   * 通知送信失敗記録
   */
  recordFailure(id: string, errorMessage: string): void {
    const record = this.history.get(id);
    if (record) {
      record.status = 'failed';
      record.errorMessage = errorMessage;
      this.history.set(id, record);
      this.logger.log(`通知送信失敗を記録しました: ${id} - ${errorMessage}`);
    }
  }

  /**
   * 履歴取得
   */
  getHistory(id: string): NotificationHistory | undefined {
    return this.history.get(id);
  }

  /**
   * 全履歴取得
   */
  getAllHistory(): NotificationHistory[] {
    return Array.from(this.history.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * ページネーション付き履歴取得
   */
  getHistoryPaginated(page: number = 1, limit: number = 50): {
    items: NotificationHistory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const allHistory = this.getAllHistory();
    const total = allHistory.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = allHistory.slice(startIndex, endIndex);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * チャネル別履歴取得
   */
  getHistoryByChannel(channel: NotificationChannel): NotificationHistory[] {
    return Array.from(this.history.values())
      .filter(record => record.type === channel)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * イベントタイプ別履歴取得
   */
  getHistoryByEventType(eventType: NotificationEventType): NotificationHistory[] {
    return Array.from(this.history.values())
      .filter(record => record.eventType === eventType)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * ステータス別履歴取得
   */
  getHistoryByStatus(status: 'sent' | 'failed' | 'pending'): NotificationHistory[] {
    return Array.from(this.history.values())
      .filter(record => record.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 期間別履歴取得
   */
  getHistoryByDateRange(startDate: Date, endDate: Date): NotificationHistory[] {
    return Array.from(this.history.values())
      .filter(record => 
        record.createdAt >= startDate && record.createdAt <= endDate
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 受信者別履歴取得
   */
  getHistoryByRecipient(recipient: string): NotificationHistory[] {
    return Array.from(this.history.values())
      .filter(record => record.recipients.includes(recipient))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 通知統計取得
   */
  getStatistics(startDate?: Date, endDate?: Date): NotificationStatistics {
    let records = Array.from(this.history.values());

    // 期間フィルタリング
    if (startDate && endDate) {
      records = records.filter(record => 
        record.createdAt >= startDate && record.createdAt <= endDate
      );
    }

    const totalSent = records.filter(record => record.status === 'sent').length;
    const totalFailed = records.filter(record => record.status === 'failed').length;
    const total = records.length;
    const successRate = total > 0 ? (totalSent / total) * 100 : 0;

    // チャネル別統計
    const byChannel: Record<NotificationChannel, { sent: number; failed: number; successRate: number }> = {
      email: { sent: 0, failed: 0, successRate: 0 },
      slack: { sent: 0, failed: 0, successRate: 0 },
      teams: { sent: 0, failed: 0, successRate: 0 },
      webhook: { sent: 0, failed: 0, successRate: 0 },
    };

    // イベントタイプ別統計
    const byEventType: Record<NotificationEventType, { sent: number; failed: number; successRate: number }> = {
      inquiry_created: { sent: 0, failed: 0, successRate: 0 },
      status_changed: { sent: 0, failed: 0, successRate: 0 },
      response_added: { sent: 0, failed: 0, successRate: 0 },
      sla_violation: { sent: 0, failed: 0, successRate: 0 },
      escalation: { sent: 0, failed: 0, successRate: 0 },
    };

    records.forEach(record => {
      // チャネル別集計
      if (byChannel[record.type]) {
        if (record.status === 'sent') {
          byChannel[record.type].sent++;
        } else if (record.status === 'failed') {
          byChannel[record.type].failed++;
        }
      }

      // イベントタイプ別集計
      if (byEventType[record.eventType]) {
        if (record.status === 'sent') {
          byEventType[record.eventType].sent++;
        } else if (record.status === 'failed') {
          byEventType[record.eventType].failed++;
        }
      }
    });

    // 成功率計算
    Object.keys(byChannel).forEach(channel => {
      const channelData = byChannel[channel as NotificationChannel];
      const channelTotal = channelData.sent + channelData.failed;
      channelData.successRate = channelTotal > 0 ? (channelData.sent / channelTotal) * 100 : 0;
    });

    Object.keys(byEventType).forEach(eventType => {
      const eventData = byEventType[eventType as NotificationEventType];
      const eventTotal = eventData.sent + eventData.failed;
      eventData.successRate = eventTotal > 0 ? (eventData.sent / eventTotal) * 100 : 0;
    });

    // 最近のアクティビティ（最新10件）
    const recentActivity = records
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      totalSent,
      totalFailed,
      successRate,
      byChannel,
      byEventType,
      recentActivity,
    };
  }

  /**
   * 失敗した通知の再送信候補取得
   */
  getFailedNotificationsForRetry(maxAge: number = 24): NotificationHistory[] {
    const cutoffTime = new Date(Date.now() - maxAge * 60 * 60 * 1000); // maxAge時間前
    
    return Array.from(this.history.values())
      .filter(record => 
        record.status === 'failed' && 
        record.createdAt >= cutoffTime
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 古い履歴のクリーンアップ
   */
  cleanupOldHistory(maxAge: number = 30): number {
    const cutoffTime = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000); // maxAge日前
    let deletedCount = 0;

    for (const [id, record] of this.history.entries()) {
      if (record.createdAt < cutoffTime) {
        this.history.delete(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`${deletedCount}件の古い通知履歴をクリーンアップしました`);
    }

    return deletedCount;
  }

  /**
   * 履歴検索
   */
  searchHistory(query: string): NotificationHistory[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.history.values())
      .filter(record => 
        record.subject.toLowerCase().includes(lowerQuery) ||
        record.content.toLowerCase().includes(lowerQuery) ||
        record.recipients.some(recipient => recipient.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 履歴エクスポート
   */
  exportHistory(format: 'json' | 'csv' = 'json'): string {
    const records = this.getAllHistory();

    if (format === 'csv') {
      const headers = ['ID', 'Type', 'Event Type', 'Recipients', 'Subject', 'Status', 'Created At', 'Sent At', 'Error Message'];
      const csvRows = [headers.join(',')];

      records.forEach(record => {
        const row = [
          record.id,
          record.type,
          record.eventType,
          record.recipients.join(';'),
          `"${record.subject.replace(/"/g, '""')}"`,
          record.status,
          record.createdAt.toISOString(),
          record.sentAt?.toISOString() || '',
          record.errorMessage ? `"${record.errorMessage.replace(/"/g, '""')}"` : '',
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    }

    return JSON.stringify(records, null, 2);
  }
}