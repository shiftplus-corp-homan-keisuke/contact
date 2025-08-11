import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlaConfig } from '../entities/sla-config.entity';
import { SlaViolation } from '../entities/sla-violation.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { RealtimeNotificationService } from './realtime-notification.service';
import { SlaMetricsDto } from '../dto/sla.dto';

/**
 * SLA監視サービス
 * SLA違反の検知と監視を行う
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
    private readonly realtimeNotificationService: RealtimeNotificationService,
  ) {}

  /**
   * 定期的なSLA監視（5分ごと）
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorSlaCompliance(): Promise<void> {
    this.logger.log('SLA監視を開始します');

    try {
      // アクティブなSLA設定を取得
      const slaConfigs = await this.slaConfigRepository.find({
        where: { isActive: true },
        relations: ['application'],
      });

      for (const slaConfig of slaConfigs) {
        await this.checkSlaViolationsForConfig(slaConfig);
      }

      this.logger.log('SLA監視が完了しました');
    } catch (error) {
      this.logger.error('SLA監視中にエラーが発生しました', error);
    }
  }

  /**
   * 特定のSLA設定に対する違反チェック
   */
  private async checkSlaViolationsForConfig(slaConfig: SlaConfig): Promise<void> {
    const now = new Date();

    // 対象の問い合わせを取得（未解決かつ該当アプリケーション）
    const inquiries = await this.inquiryRepository.find({
      where: {
        appId: slaConfig.applicationId,
        status: 'open' as any, // 未解決の問い合わせのみ
      },
      relations: ['responses'],
    });

    for (const inquiry of inquiries) {
      await this.checkInquirySlaCompliance(inquiry, slaConfig, now);
    }
  }

  /**
   * 個別問い合わせのSLA遵守チェック
   */
  private async checkInquirySlaCompliance(
    inquiry: Inquiry,
    slaConfig: SlaConfig,
    currentTime: Date,
  ): Promise<void> {
    // 初回応答時間チェック
    if (!inquiry.responses || inquiry.responses.length === 0) {
      await this.checkResponseTimeViolation(inquiry, slaConfig, currentTime);
    }

    // 解決時間チェック
    if (inquiry.status !== 'resolved' && inquiry.status !== 'closed') {
      await this.checkResolutionTimeViolation(inquiry, slaConfig, currentTime);
    }

    // エスカレーション時間チェック
    await this.checkEscalationTimeViolation(inquiry, slaConfig, currentTime);
  }

  /**
   * 応答時間違反チェック
   */
  private async checkResponseTimeViolation(
    inquiry: Inquiry,
    slaConfig: SlaConfig,
    currentTime: Date,
  ): Promise<void> {
    const expectedResponseTime = this.calculateExpectedTime(
      inquiry.createdAt,
      slaConfig.responseTimeHours,
      slaConfig,
    );

    if (currentTime > expectedResponseTime) {
      const existingViolation = await this.slaViolationRepository.findOne({
        where: {
          inquiryId: inquiry.id,
          violationType: 'response_time',
        },
      });

      if (!existingViolation) {
        await this.createSlaViolation(
          inquiry,
          slaConfig,
          'response_time',
          expectedResponseTime,
          currentTime,
        );
      }
    }
  }

  /**
   * 解決時間違反チェック
   */
  private async checkResolutionTimeViolation(
    inquiry: Inquiry,
    slaConfig: SlaConfig,
    currentTime: Date,
  ): Promise<void> {
    const expectedResolutionTime = this.calculateExpectedTime(
      inquiry.createdAt,
      slaConfig.resolutionTimeHours,
      slaConfig,
    );

    if (currentTime > expectedResolutionTime) {
      const existingViolation = await this.slaViolationRepository.findOne({
        where: {
          inquiryId: inquiry.id,
          violationType: 'resolution_time',
        },
      });

      if (!existingViolation) {
        await this.createSlaViolation(
          inquiry,
          slaConfig,
          'resolution_time',
          expectedResolutionTime,
          currentTime,
        );
      }
    }
  }

  /**
   * エスカレーション時間違反チェック
   */
  private async checkEscalationTimeViolation(
    inquiry: Inquiry,
    slaConfig: SlaConfig,
    currentTime: Date,
  ): Promise<void> {
    const expectedEscalationTime = this.calculateExpectedTime(
      inquiry.createdAt,
      slaConfig.escalationTimeHours,
      slaConfig,
    );

    if (currentTime > expectedEscalationTime) {
      const existingViolation = await this.slaViolationRepository.findOne({
        where: {
          inquiryId: inquiry.id,
          violationType: 'escalation_time',
        },
      });

      if (!existingViolation) {
        await this.createSlaViolation(
          inquiry,
          slaConfig,
          'escalation_time',
          expectedEscalationTime,
          currentTime,
        );
      }
    }
  }

  /**
   * SLA違反レコードの作成
   */
  private async createSlaViolation(
    inquiry: Inquiry,
    slaConfig: SlaConfig,
    violationType: string,
    expectedTime: Date,
    currentTime: Date,
  ): Promise<SlaViolation> {
    const delayHours = (currentTime.getTime() - expectedTime.getTime()) / (1000 * 60 * 60);
    const severity = this.calculateSeverity(delayHours, violationType);

    const violation = this.slaViolationRepository.create({
      inquiryId: inquiry.id,
      slaConfigId: slaConfig.id,
      violationType,
      expectedTime,
      violationTime: currentTime,
      delayHours,
      severity,
    });

    const savedViolation = await this.slaViolationRepository.save(violation);

    // リアルタイム通知を送信
    await this.sendSlaViolationNotification(savedViolation, inquiry, slaConfig);

    this.logger.warn(
      `SLA違反が検出されました: 問い合わせID=${inquiry.id}, タイプ=${violationType}, 遅延=${delayHours.toFixed(2)}時間`,
    );

    return savedViolation;
  }

  /**
   * 期待時間の計算（営業時間考慮）
   */
  private calculateExpectedTime(
    startTime: Date,
    hours: number,
    slaConfig: SlaConfig,
  ): Date {
    if (!slaConfig.businessHoursOnly) {
      // 営業時間を考慮しない場合
      return new Date(startTime.getTime() + hours * 60 * 60 * 1000);
    }

    // 営業時間を考慮した計算
    const businessDays = slaConfig.businessDays.split(',').map(d => parseInt(d));
    const businessStartHour = slaConfig.businessStartHour;
    const businessEndHour = slaConfig.businessEndHour;
    const businessHoursPerDay = businessEndHour - businessStartHour;

    let remainingHours = hours;
    let currentTime = new Date(startTime);

    while (remainingHours > 0) {
      const dayOfWeek = currentTime.getDay() === 0 ? 7 : currentTime.getDay(); // 日曜日を7に変換
      const currentHour = currentTime.getHours();

      if (businessDays.includes(dayOfWeek) && 
          currentHour >= businessStartHour && 
          currentHour < businessEndHour) {
        // 営業時間内
        const hoursUntilEndOfDay = businessEndHour - currentHour;
        const hoursToAdd = Math.min(remainingHours, hoursUntilEndOfDay);
        
        currentTime = new Date(currentTime.getTime() + hoursToAdd * 60 * 60 * 1000);
        remainingHours -= hoursToAdd;
      } else {
        // 営業時間外 - 次の営業時間まで進める
        currentTime = this.getNextBusinessHour(currentTime, slaConfig);
      }
    }

    return currentTime;
  }

  /**
   * 次の営業時間を取得
   */
  private getNextBusinessHour(currentTime: Date, slaConfig: SlaConfig): Date {
    const businessDays = slaConfig.businessDays.split(',').map(d => parseInt(d));
    const businessStartHour = slaConfig.businessStartHour;
    const businessEndHour = slaConfig.businessEndHour;

    let nextTime = new Date(currentTime);
    const currentHour = nextTime.getHours();
    const dayOfWeek = nextTime.getDay() === 0 ? 7 : nextTime.getDay();

    if (businessDays.includes(dayOfWeek) && currentHour < businessStartHour) {
      // 同日の営業開始時間に設定
      nextTime.setHours(businessStartHour, 0, 0, 0);
    } else {
      // 次の営業日の営業開始時間に設定
      do {
        nextTime.setDate(nextTime.getDate() + 1);
        const newDayOfWeek = nextTime.getDay() === 0 ? 7 : nextTime.getDay();
        if (businessDays.includes(newDayOfWeek)) {
          nextTime.setHours(businessStartHour, 0, 0, 0);
          break;
        }
      } while (true);
    }

    return nextTime;
  }

  /**
   * 重要度の計算
   */
  private calculateSeverity(delayHours: number, violationType: string): string {
    if (delayHours <= 2) return 'minor';
    if (delayHours <= 8) return 'major';
    return 'critical';
  }

  /**
   * SLA違反通知の送信
   */
  private async sendSlaViolationNotification(
    violation: SlaViolation,
    inquiry: Inquiry,
    slaConfig: SlaConfig,
  ): Promise<void> {
    const notificationData = {
      type: 'sla_violation',
      violationId: violation.id,
      inquiryId: inquiry.id,
      violationType: violation.violationType,
      severity: violation.severity,
      delayHours: violation.delayHours,
      applicationName: slaConfig.application?.name || 'Unknown',
    };

    // 管理者とサポート担当者に通知
    await this.realtimeNotificationService.sendToRoles(
      ['admin', 'support'],
      {
        type: 'sla_violation',
        title: 'SLA違反が発生しました',
        message: `問い合わせ ${inquiry.id} でSLA違反が発生しました（${violation.violationType}）`,
        data: notificationData,
        timestamp: new Date(),
      },
    );
  }

  /**
   * SLAメトリクスの取得
   */
  async getSlaMetrics(
    applicationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SlaMetricsDto> {
    // 期間内の問い合わせを取得
    const inquiries = await this.inquiryRepository.find({
      where: {
        appId: applicationId,
        createdAt: Between(startDate, endDate),
      },
      relations: ['responses'],
    });

    // SLA違反を取得
    const violations = await this.slaViolationRepository.find({
      where: {
        violationTime: Between(startDate, endDate),
      },
      relations: ['inquiry', 'slaConfig'],
    });

    const totalInquiries = inquiries.length;
    const slaViolations = violations.length;
    const slaCompliant = totalInquiries - slaViolations;
    const complianceRate = totalInquiries > 0 ? (slaCompliant / totalInquiries) * 100 : 100;

    // 平均応答時間と解決時間を計算
    const averageResponseTime = this.calculateAverageResponseTime(inquiries);
    const averageResolutionTime = this.calculateAverageResolutionTime(inquiries);

    // 優先度別統計
    const priorityStats = this.calculatePriorityStats(inquiries, violations);

    return {
      applicationId,
      startDate,
      endDate,
      totalInquiries,
      slaCompliant,
      slaViolations,
      complianceRate,
      averageResponseTime,
      averageResolutionTime,
      priorityStats,
    };
  }

  /**
   * 平均応答時間の計算
   */
  private calculateAverageResponseTime(inquiries: Inquiry[]): number {
    const responseTimes = inquiries
      .filter(inquiry => inquiry.responses && inquiry.responses.length > 0)
      .map(inquiry => {
        const firstResponse = inquiry.responses[0];
        return (firstResponse.createdAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
      });

    return responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
  }

  /**
   * 平均解決時間の計算
   */
  private calculateAverageResolutionTime(inquiries: Inquiry[]): number {
    const resolutionTimes = inquiries
      .filter(inquiry => inquiry.status === 'resolved' || inquiry.status === 'closed')
      .map(inquiry => {
        return (inquiry.updatedAt.getTime() - inquiry.createdAt.getTime()) / (1000 * 60 * 60);
      });

    return resolutionTimes.length > 0 
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length 
      : 0;
  }

  /**
   * 優先度別統計の計算
   */
  private calculatePriorityStats(inquiries: Inquiry[], violations: SlaViolation[]): any {
    const stats: any = {};
    const priorities = ['low', 'medium', 'high', 'critical'];

    priorities.forEach(priority => {
      const priorityInquiries = inquiries.filter(inquiry => inquiry.priority === priority);
      const priorityViolations = violations.filter(violation => 
        violation.slaConfig?.priorityLevel === priority
      );

      const total = priorityInquiries.length;
      const violationCount = priorityViolations.length;
      const compliant = total - violationCount;
      const complianceRate = total > 0 ? (compliant / total) * 100 : 100;

      stats[priority] = {
        total,
        compliant,
        violations: violationCount,
        complianceRate,
      };
    });

    return stats;
  }
}