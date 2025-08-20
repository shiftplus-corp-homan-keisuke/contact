import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlaConfig } from '../entities/sla-config.entity';
import { SlaViolation } from '../entities/sla-violation.entity';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { NotificationsService } from './notifications.service';
import { EscalationService } from './escalation.service';

/**
 * SLA監視サービス
 * SLA違反の検知と自動処理を担当
 */
@Injectable()
export class SlaMonitoringService {
    private readonly logger = new Logger(SlaMonitoringService.name);

    constructor(
        @InjectRepository(SlaConfig)
        private readonly slaConfigRepository: Repository<SlaConfig>,
        @InjectRepository(SlaViolation)
        private readonly slaViolationRepository: Repository<SlaViolation>,
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        private readonly notificationsService: NotificationsService,
        private readonly escalationService: EscalationService,
    ) { }

    /**
     * 定期的なSLA監視（5分ごと）
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async monitorSlaViolations(): Promise<void> {
        this.logger.log('SLA監視を開始します');

        try {
            const violations = await this.checkSlaViolations();

            if (violations.length > 0) {
                this.logger.warn(`${violations.length}件のSLA違反を検出しました`);

                for (const violation of violations) {
                    await this.handleSlaViolation(violation);
                }
            }
        } catch (error) {
            this.logger.error('SLA監視中にエラーが発生しました', error);
        }
    }

    /**
     * SLA違反をチェック
     */
    async checkSlaViolations(): Promise<SlaViolation[]> {
        const now = new Date();
        const violations: SlaViolation[] = [];

        // アクティブなSLA設定を取得
        const slaConfigs = await this.slaConfigRepository.find({
            where: { isActive: true },
            relations: ['application'],
        });

        for (const config of slaConfigs) {
            // 対象の問い合わせを取得
            const inquiries = await this.inquiryRepository.find({
                where: {
                    appId: config.appId,
                    priority: config.priority,
                    status: In(['new', 'in_progress', 'pending']),
                },
                relations: ['responses'],
            });

            for (const inquiry of inquiries) {
                // 応答時間違反をチェック
                const responseViolation = await this.checkResponseTimeViolation(inquiry, config, now);
                if (responseViolation) {
                    violations.push(responseViolation);
                }

                // 解決時間違反をチェック
                const resolutionViolation = await this.checkResolutionTimeViolation(inquiry, config, now);
                if (resolutionViolation) {
                    violations.push(resolutionViolation);
                }

                // エスカレーション時間違反をチェック
                const escalationViolation = await this.checkEscalationTimeViolation(inquiry, config, now);
                if (escalationViolation) {
                    violations.push(escalationViolation);
                }
            }
        }

        return violations;
    }

    /**
     * 応答時間違反をチェック
     */
    private async checkResponseTimeViolation(
        inquiry: Inquiry,
        config: SlaConfig,
        now: Date,
    ): Promise<SlaViolation | null> {
        // 既に応答がある場合はスキップ
        if (inquiry.responses && inquiry.responses.length > 0) {
            return null;
        }

        // 既に違反が記録されている場合はスキップ
        const existingViolation = await this.slaViolationRepository.findOne({
            where: {
                inquiryId: inquiry.id,
                violationType: 'response_time',
                isResolved: false,
            },
        });

        if (existingViolation) {
            return null;
        }

        const expectedResponseTime = new Date(inquiry.createdAt.getTime() + config.responseTimeHours * 60 * 60 * 1000);

        if (now > expectedResponseTime) {
            const delayHours = (now.getTime() - expectedResponseTime.getTime()) / (1000 * 60 * 60);

            const violation = this.slaViolationRepository.create({
                inquiryId: inquiry.id,
                slaConfigId: config.id,
                violationType: 'response_time',
                expectedTime: expectedResponseTime,
                delayHours: Math.round(delayHours * 100) / 100,
                severity: this.calculateSeverity(delayHours, config.responseTimeHours),
            });

            return await this.slaViolationRepository.save(violation);
        }

        return null;
    }

    /**
     * 解決時間違反をチェック
     */
    private async checkResolutionTimeViolation(
        inquiry: Inquiry,
        config: SlaConfig,
        now: Date,
    ): Promise<SlaViolation | null> {
        // 既に解決済みの場合はスキップ
        if (inquiry.status === 'resolved' || inquiry.status === 'closed') {
            return null;
        }

        // 既に違反が記録されている場合はスキップ
        const existingViolation = await this.slaViolationRepository.findOne({
            where: {
                inquiryId: inquiry.id,
                violationType: 'resolution_time',
                isResolved: false,
            },
        });

        if (existingViolation) {
            return null;
        }

        const expectedResolutionTime = new Date(inquiry.createdAt.getTime() + config.resolutionTimeHours * 60 * 60 * 1000);

        if (now > expectedResolutionTime) {
            const delayHours = (now.getTime() - expectedResolutionTime.getTime()) / (1000 * 60 * 60);

            const violation = this.slaViolationRepository.create({
                inquiryId: inquiry.id,
                slaConfigId: config.id,
                violationType: 'resolution_time',
                expectedTime: expectedResolutionTime,
                delayHours: Math.round(delayHours * 100) / 100,
                severity: this.calculateSeverity(delayHours, config.resolutionTimeHours),
            });

            return await this.slaViolationRepository.save(violation);
        }

        return null;
    }

    /**
     * エスカレーション時間違反をチェック
     */
    private async checkEscalationTimeViolation(
        inquiry: Inquiry,
        config: SlaConfig,
        now: Date,
    ): Promise<SlaViolation | null> {
        // 既にエスカレーションされている場合はスキップ
        const existingEscalation = await this.escalationService.getLatestEscalation(inquiry.id);
        if (existingEscalation) {
            return null;
        }

        // 既に違反が記録されている場合はスキップ
        const existingViolation = await this.slaViolationRepository.findOne({
            where: {
                inquiryId: inquiry.id,
                violationType: 'escalation_time',
                isResolved: false,
            },
        });

        if (existingViolation) {
            return null;
        }

        const expectedEscalationTime = new Date(inquiry.createdAt.getTime() + config.escalationTimeHours * 60 * 60 * 1000);

        if (now > expectedEscalationTime) {
            const delayHours = (now.getTime() - expectedEscalationTime.getTime()) / (1000 * 60 * 60);

            const violation = this.slaViolationRepository.create({
                inquiryId: inquiry.id,
                slaConfigId: config.id,
                violationType: 'escalation_time',
                expectedTime: expectedEscalationTime,
                delayHours: Math.round(delayHours * 100) / 100,
                severity: this.calculateSeverity(delayHours, config.escalationTimeHours),
            });

            return await this.slaViolationRepository.save(violation);
        }

        return null;
    }

    /**
     * SLA違反を処理
     */
    private async handleSlaViolation(violation: SlaViolation): Promise<void> {
        try {
            // 通知を送信
            await this.notificationsService.sendSlaViolationNotification(violation);

            // 自動エスカレーションが必要な場合
            if (violation.violationType === 'escalation_time' || violation.severity === 'critical') {
                await this.escalationService.autoEscalateInquiry(
                    violation.inquiryId,
                    `SLA違反による自動エスカレーション: ${violation.violationType}`,
                );
            }

            this.logger.log(`SLA違反を処理しました: ${violation.id}`);
        } catch (error) {
            this.logger.error(`SLA違反の処理中にエラーが発生しました: ${violation.id}`, error);
        }
    }

    /**
     * 遅延時間に基づいて重要度を計算
     */
    private calculateSeverity(delayHours: number, expectedHours: number): 'minor' | 'major' | 'critical' {
        const delayRatio = delayHours / expectedHours;

        if (delayRatio >= 2.0) {
            return 'critical';
        } else if (delayRatio >= 0.5) {
            return 'major';
        } else {
            return 'minor';
        }
    }

    /**
     * SLA設定を作成
     */
    async createSlaConfig(configData: Partial<SlaConfig>): Promise<SlaConfig> {
        const config = this.slaConfigRepository.create(configData);
        return await this.slaConfigRepository.save(config);
    }

    /**
     * SLA設定を更新
     */
    async updateSlaConfig(id: string, updates: Partial<SlaConfig>): Promise<SlaConfig> {
        await this.slaConfigRepository.update(id, updates);
        return await this.slaConfigRepository.findOne({ where: { id } });
    }

    /**
     * アプリケーション別SLA設定を取得
     */
    async getSlaConfigsByApp(appId: string): Promise<SlaConfig[]> {
        return await this.slaConfigRepository.find({
            where: { appId, isActive: true },
            relations: ['application'],
        });
    }

    /**
     * SLA違反統計を取得
     */
    async getSlaViolationStats(appId?: string, startDate?: Date, endDate?: Date) {
        const queryBuilder = this.slaViolationRepository
            .createQueryBuilder('violation')
            .leftJoinAndSelect('violation.inquiry', 'inquiry')
            .leftJoinAndSelect('violation.slaConfig', 'config');

        if (appId) {
            queryBuilder.andWhere('inquiry.appId = :appId', { appId });
        }

        if (startDate) {
            queryBuilder.andWhere('violation.detectedAt >= :startDate', { startDate });
        }

        if (endDate) {
            queryBuilder.andWhere('violation.detectedAt <= :endDate', { endDate });
        }

        const violations = await queryBuilder.getMany();

        return {
            total: violations.length,
            byType: this.groupBy(violations, 'violationType'),
            bySeverity: this.groupBy(violations, 'severity'),
            resolved: violations.filter(v => v.isResolved).length,
            unresolved: violations.filter(v => !v.isResolved).length,
            averageDelayHours: violations.reduce((sum, v) => sum + Number(v.delayHours), 0) / violations.length || 0,
        };
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
     * SLA違反を解決
     */
    async resolveSlaViolation(
        violationId: string,
        resolvedBy: string,
        comment?: string,
    ): Promise<SlaViolation> {
        await this.slaViolationRepository.update(violationId, {
            isResolved: true,
            resolvedBy,
            resolvedAt: new Date(),
            resolutionComment: comment,
        });

        return await this.slaViolationRepository.findOne({
            where: { id: violationId },
            relations: ['inquiry', 'slaConfig', 'resolver'],
        });
    }
}