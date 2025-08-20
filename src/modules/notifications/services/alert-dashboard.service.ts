import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SlaViolation } from '../entities/sla-violation.entity';
import { Escalation } from '../entities/escalation.entity';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { NotificationLog } from '../entities/notification-log.entity';

/**
 * アラートダッシュボードサービス
 * SLA違反とエスカレーションの統合ダッシュボード機能
 */
@Injectable()
export class AlertDashboardService {
    private readonly logger = new Logger(AlertDashboardService.name);

    constructor(
        @InjectRepository(SlaViolation)
        private readonly slaViolationRepository: Repository<SlaViolation>,
        @InjectRepository(Escalation)
        private readonly escalationRepository: Repository<Escalation>,
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(NotificationLog)
        private readonly notificationLogRepository: Repository<NotificationLog>,
    ) { }

    /**
     * ダッシュボード概要データを取得
     */
    async getDashboardOverview(appId?: string) {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 基本クエリビルダー
        const buildBaseQuery = (repository: Repository<any>, alias: string) => {
            const query = repository.createQueryBuilder(alias);
            if (appId) {
                query.leftJoin(`${alias}.inquiry`, 'inquiry')
                    .andWhere('inquiry.appId = :appId', { appId });
            }
            return query;
        };

        // アクティブなSLA違反
        const activeSlaViolations = await buildBaseQuery(this.slaViolationRepository, 'violation')
            .andWhere('violation.isResolved = :isResolved', { isResolved: false })
            .getCount();

        // 過去24時間の新しいSLA違反
        const recentSlaViolations = await buildBaseQuery(this.slaViolationRepository, 'violation')
            .andWhere('violation.detectedAt >= :since', { since: last24Hours })
            .getCount();

        // 重要度別SLA違反
        const slaViolationsBySeverity = await buildBaseQuery(this.slaViolationRepository, 'violation')
            .select('violation.severity', 'severity')
            .addSelect('COUNT(*)', 'count')
            .andWhere('violation.isResolved = :isResolved', { isResolved: false })
            .groupBy('violation.severity')
            .getRawMany();

        // 過去24時間のエスカレーション
        const recentEscalations = await buildBaseQuery(this.escalationRepository, 'escalation')
            .andWhere('escalation.escalatedAt >= :since', { since: last24Hours })
            .getCount();

        // 自動エスカレーション率
        const totalEscalations = await buildBaseQuery(this.escalationRepository, 'escalation')
            .andWhere('escalation.escalatedAt >= :since', { since: last7Days })
            .getCount();

        const autoEscalations = await buildBaseQuery(this.escalationRepository, 'escalation')
            .andWhere('escalation.escalatedAt >= :since', { since: last7Days })
            .andWhere('escalation.isAutomatic = :isAutomatic', { isAutomatic: true })
            .getCount();

        const autoEscalationRate = totalEscalations > 0 ? (autoEscalations / totalEscalations) * 100 : 0;

        // 対応待ち問い合わせ（高優先度）
        const highPriorityInquiries = await this.inquiryRepository.count({
            where: {
                ...(appId && { appId }),
                priority: In(['high', 'urgent']),
                status: In(['new', 'in_progress']),
            },
        });

        return {
            activeSlaViolations,
            recentSlaViolations,
            slaViolationsBySeverity: this.formatGroupedData(slaViolationsBySeverity),
            recentEscalations,
            autoEscalationRate: Math.round(autoEscalationRate * 100) / 100,
            highPriorityInquiries,
            lastUpdated: now,
        };
    }

    /**
     * SLA違反トレンドデータを取得
     */
    async getSlaViolationTrends(days: number = 30, appId?: string) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const queryBuilder = this.slaViolationRepository
            .createQueryBuilder('violation')
            .select('DATE(violation.detectedAt)', 'date')
            .addSelect('violation.violationType', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('violation.detectedAt >= :startDate', { startDate })
            .andWhere('violation.detectedAt <= :endDate', { endDate })
            .groupBy('DATE(violation.detectedAt)')
            .addGroupBy('violation.violationType')
            .orderBy('date', 'ASC');

        if (appId) {
            queryBuilder.leftJoin('violation.inquiry', 'inquiry')
                .andWhere('inquiry.appId = :appId', { appId });
        }

        const rawData = await queryBuilder.getRawMany();

        // データを日付別に整理
        const trendData = this.organizeTrendData(rawData, startDate, endDate);

        return trendData;
    }

    /**
     * エスカレーション分析データを取得
     */
    async getEscalationAnalysis(days: number = 30, appId?: string) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const queryBuilder = this.escalationRepository
            .createQueryBuilder('escalation')
            .leftJoinAndSelect('escalation.inquiry', 'inquiry')
            .leftJoinAndSelect('escalation.fromUser', 'fromUser')
            .leftJoinAndSelect('escalation.toUser', 'toUser')
            .where('escalation.escalatedAt >= :startDate', { startDate })
            .andWhere('escalation.escalatedAt <= :endDate', { endDate });

        if (appId) {
            queryBuilder.andWhere('inquiry.appId = :appId', { appId });
        }

        const escalations = await queryBuilder.getMany();

        // エスカレーション理由別分析
        const byReason = this.groupBy(escalations, 'escalationReason');

        // エスカレーションレベル別分析
        const byLevel = this.groupBy(escalations, 'escalationLevel');

        // 時間別エスカレーション分析
        const hourlyDistribution = this.analyzeHourlyDistribution(escalations);

        // 最も多くエスカレーションを受けるユーザー
        const topEscalationTargets = this.analyzeTopEscalationTargets(escalations);

        return {
            total: escalations.length,
            byReason,
            byLevel,
            hourlyDistribution,
            topEscalationTargets,
            automaticRate: (escalations.filter(e => e.isAutomatic).length / escalations.length) * 100,
        };
    }

    /**
     * 通知効果分析を取得
     */
    async getNotificationEffectiveness(days: number = 30, appId?: string) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const queryBuilder = this.notificationLogRepository
            .createQueryBuilder('log')
            .where('log.sentAt >= :startDate', { startDate })
            .andWhere('log.sentAt <= :endDate', { endDate });

        if (appId) {
            queryBuilder.leftJoin('log.inquiry', 'inquiry')
                .andWhere('inquiry.appId = :appId', { appId });
        }

        const notifications = await queryBuilder.getMany();

        // 通知チャネル別統計
        const byChannel = this.groupBy(notifications, 'channel');

        // 配信状況統計
        const byStatus = this.groupBy(notifications, 'status');

        // 配信成功率
        const successRate = notifications.length > 0
            ? (notifications.filter(n => n.status === 'delivered' || n.status === 'sent').length / notifications.length) * 100
            : 0;

        return {
            total: notifications.length,
            byChannel,
            byStatus,
            successRate: Math.round(successRate * 100) / 100,
        };
    }

    /**
     * リアルタイムアラートを取得
     */
    async getRealTimeAlerts(appId?: string) {
        const now = new Date();
        const last30Minutes = new Date(now.getTime() - 30 * 60 * 1000);

        // 最近のSLA違反
        const recentViolationsQuery = this.slaViolationRepository
            .createQueryBuilder('violation')
            .leftJoinAndSelect('violation.inquiry', 'inquiry')
            .leftJoinAndSelect('violation.slaConfig', 'config')
            .where('violation.detectedAt >= :since', { since: last30Minutes })
            .orderBy('violation.detectedAt', 'DESC');

        if (appId) {
            recentViolationsQuery.andWhere('inquiry.appId = :appId', { appId });
        }

        const recentViolations = await recentViolationsQuery.getMany();

        // 最近のエスカレーション
        const recentEscalationsQuery = this.escalationRepository
            .createQueryBuilder('escalation')
            .leftJoinAndSelect('escalation.inquiry', 'inquiry')
            .leftJoinAndSelect('escalation.toUser', 'toUser')
            .where('escalation.escalatedAt >= :since', { since: last30Minutes })
            .orderBy('escalation.escalatedAt', 'DESC');

        if (appId) {
            recentEscalationsQuery.andWhere('inquiry.appId = :appId', { appId });
        }

        const recentEscalations = await recentEscalationsQuery.getMany();

        // 緊急対応が必要な問い合わせ
        const urgentInquiriesQuery = this.inquiryRepository
            .createQueryBuilder('inquiry')
            .where('inquiry.priority = :priority', { priority: 'urgent' })
            .andWhere('inquiry.status IN (:...statuses)', { statuses: ['new', 'in_progress'] })
            .orderBy('inquiry.createdAt', 'ASC');

        if (appId) {
            urgentInquiriesQuery.andWhere('inquiry.appId = :appId', { appId });
        }

        const urgentInquiries = await urgentInquiriesQuery.getMany();

        return {
            recentViolations,
            recentEscalations,
            urgentInquiries,
            timestamp: now,
        };
    }

    /**
     * グループ化されたデータをフォーマット
     */
    private formatGroupedData(rawData: any[]): Record<string, number> {
        return rawData.reduce((acc, item) => {
            acc[item.severity || item.type || item.key] = parseInt(item.count);
            return acc;
        }, {});
    }

    /**
     * 配列をキーでグループ化
     */
    private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
        return array.reduce((groups, item) => {
            const value = String(item[key]);
            groups[value] = (groups[value] || 0) + 1;
            return groups;
        }, {} as Record<string, number>);
    }

    /**
     * トレンドデータを整理
     */
    private organizeTrendData(rawData: any[], startDate: Date, endDate: Date) {
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const trendData = [];

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];

            const dayData = {
                date: dateStr,
                response_time: 0,
                resolution_time: 0,
                escalation_time: 0,
            };

            rawData.forEach(item => {
                if (item.date === dateStr) {
                    dayData[item.type] = parseInt(item.count);
                }
            });

            trendData.push(dayData);
        }

        return trendData;
    }

    /**
     * 時間別分布を分析
     */
    private analyzeHourlyDistribution(escalations: Escalation[]) {
        const hourlyData = Array(24).fill(0);

        escalations.forEach(escalation => {
            const hour = escalation.escalatedAt.getHours();
            hourlyData[hour]++;
        });

        return hourlyData.map((count, hour) => ({
            hour,
            count,
        }));
    }

    /**
     * トップエスカレーション対象を分析
     */
    private analyzeTopEscalationTargets(escalations: Escalation[]) {
        const targets = this.groupBy(escalations, 'escalatedTo');

        return Object.entries(targets)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([userId, count]) => ({
                userId,
                count,
            }));
    }
}