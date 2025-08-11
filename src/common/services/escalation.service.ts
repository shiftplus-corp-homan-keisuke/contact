import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SlaViolation } from '../entities/sla-violation.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { User } from '../entities/user.entity';
import { RealtimeNotificationService } from './realtime-notification.service';
import { SlackNotificationService } from './slack-notification.service';
import { TeamsNotificationService } from './teams-notification.service';
import { EscalationRuleDto } from '../dto/sla.dto';

/**
 * エスカレーションサービス
 * SLA違反時の自動エスカレーション機能を提供
 */
@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    @InjectRepository(SlaViolation)
    private readonly slaViolationRepository: Repository<SlaViolation>,
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly realtimeNotificationService: RealtimeNotificationService,
    private readonly slackNotificationService: SlackNotificationService,
    private readonly teamsNotificationService: TeamsNotificationService,
  ) {}

  /**
   * 自動エスカレーションの実行
   */
  async performAutoEscalation(violationId: string): Promise<void> {
    const violation = await this.slaViolationRepository.findOne({
      where: { id: violationId },
      relations: ['inquiry', 'slaConfig', 'slaConfig.application'],
    });

    if (!violation) {
      throw new NotFoundException('SLA違反が見つかりません');
    }

    if (violation.isEscalated) {
      this.logger.warn(`SLA違反 ${violationId} は既にエスカレーション済みです`);
      return;
    }

    // エスカレーション先を決定
    const escalationTarget = await this.determineEscalationTarget(violation);
    
    if (!escalationTarget) {
      this.logger.error(`SLA違反 ${violationId} のエスカレーション先が見つかりません`);
      return;
    }

    // エスカレーションを実行
    await this.executeEscalation(violation, escalationTarget, 'auto_escalation');
  }

  /**
   * 手動エスカレーションの実行
   */
  async performManualEscalation(
    violationId: string,
    escalationRule: EscalationRuleDto,
    escalatedByUserId: string,
  ): Promise<void> {
    const violation = await this.slaViolationRepository.findOne({
      where: { id: violationId },
      relations: ['inquiry', 'slaConfig', 'slaConfig.application'],
    });

    if (!violation) {
      throw new NotFoundException('SLA違反が見つかりません');
    }

    const escalationTarget = await this.userRepository.findOne({
      where: { id: escalationRule.escalateToUserId },
    });

    if (!escalationTarget) {
      throw new NotFoundException('エスカレーション先ユーザーが見つかりません');
    }

    // エスカレーションを実行
    await this.executeEscalation(
      violation, 
      escalationTarget, 
      escalationRule.reason,
      escalationRule.notes,
      escalatedByUserId,
    );
  }

  /**
   * エスカレーション先の決定
   */
  private async determineEscalationTarget(violation: SlaViolation): Promise<User | null> {
    const inquiry = violation.inquiry;
    
    // 1. 問い合わせの担当者の上司を探す
    if (inquiry.assignedUser) {
      const assignedUser = await this.userRepository.findOne({
        where: { id: inquiry.assignedUser.id },
        relations: ['role'],
      });

      // 上司の概念がないため、より高い権限のユーザーを探す
      if (assignedUser) {
        const higherRoleUsers = await this.userRepository.find({
          where: {
            role: { name: 'admin' } as any,
            isActive: true,
          },
        });
        return higherRoleUsers.length > 0 ? higherRoleUsers[0] : null;
      }
    }

    // 2. アプリケーション管理者を探す
    const appAdmins = await this.userRepository.find({
      where: {
        role: { name: 'admin' } as any,
        isActive: true,
      },
    });

    if (appAdmins.length > 0) {
      // 最も経験豊富な管理者を選択（作成日が古い順）
      return appAdmins.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    }

    // 3. システム管理者を探す
    const systemAdmins = await this.userRepository.find({
      where: {
        role: { name: 'system_admin' } as any,
        isActive: true,
      },
    });

    return systemAdmins.length > 0 ? systemAdmins[0] : null;
  }

  /**
   * エスカレーションの実行
   */
  private async executeEscalation(
    violation: SlaViolation,
    escalationTarget: User,
    reason: string,
    notes?: string,
    escalatedByUserId?: string,
  ): Promise<void> {
    // SLA違反レコードを更新
    violation.isEscalated = true;
    violation.escalatedToUserId = escalationTarget.id;
    violation.escalatedAt = new Date();
    violation.resolutionNotes = notes || `自動エスカレーション: ${reason}`;

    await this.slaViolationRepository.save(violation);

    // 問い合わせの担当者を変更
    const inquiry = await this.inquiryRepository.findOne({
      where: { id: violation.inquiryId },
    });

    if (inquiry) {
      inquiry.assignedUser = escalationTarget;
      inquiry.priority = this.escalatePriority(inquiry.priority) as any;
      await this.inquiryRepository.save(inquiry);
    }

    // 通知を送信
    await this.sendEscalationNotifications(violation, escalationTarget, reason, notes);

    this.logger.log(
      `エスカレーションが完了しました: 違反ID=${violation.id}, エスカレーション先=${escalationTarget.email}`,
    );
  }

  /**
   * 優先度のエスカレーション
   */
  private escalatePriority(currentPriority: string): string {
    const priorityLevels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = priorityLevels.indexOf(currentPriority);
    
    if (currentIndex < priorityLevels.length - 1) {
      return priorityLevels[currentIndex + 1];
    }
    
    return currentPriority; // 既に最高優先度の場合はそのまま
  }

  /**
   * エスカレーション通知の送信
   */
  private async sendEscalationNotifications(
    violation: SlaViolation,
    escalationTarget: User,
    reason: string,
    notes?: string,
  ): Promise<void> {
    const inquiry = violation.inquiry;
    const application = violation.slaConfig?.application;

    const notificationData = {
      type: 'escalation',
      violationId: violation.id,
      inquiryId: inquiry.id,
      violationType: violation.violationType,
      severity: violation.severity,
      delayHours: violation.delayHours,
      applicationName: application?.name || 'Unknown',
      reason,
      notes,
    };

    // 通知機能は実装不足のため一時的にコメントアウト
    this.logger.log(`エスカレーション通知をスキップ: ${escalationTarget.id}`);
    
    // TODO: 以下の通知機能を実装する必要があります
    // - realtimeNotificationService.sendToUser
    // - slackNotificationService.sendDirectMessage
    // - teamsNotificationService.sendDirectMessage
    // - realtimeNotificationService.sendToRoles
    // - User エンティティに slackUserId, teamsUserId プロパティを追加
  }

  /**
   * Slackエスカレーションメッセージの構築
   */
  private buildSlackEscalationMessage(
    violation: SlaViolation,
    inquiry: Inquiry,
    application: any,
    reason: string,
    notes?: string,
  ): any {
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 エスカレーション通知',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*問い合わせID:*\n${inquiry.id}`,
            },
            {
              type: 'mrkdwn',
              text: `*アプリケーション:*\n${application?.name || 'Unknown'}`,
            },
            {
              type: 'mrkdwn',
              text: `*違反タイプ:*\n${violation.violationType}`,
            },
            {
              type: 'mrkdwn',
              text: `*重要度:*\n${violation.severity}`,
            },
            {
              type: 'mrkdwn',
              text: `*遅延時間:*\n${violation.delayHours.toFixed(2)}時間`,
            },
            {
              type: 'mrkdwn',
              text: `*エスカレーション理由:*\n${reason}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*問い合わせ内容:*\n${inquiry.content.substring(0, 200)}${inquiry.content.length > 200 ? '...' : ''}`,
          },
        },
        ...(notes ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*追加メモ:*\n${notes}`,
          },
        }] : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '問い合わせを確認',
              },
              url: `${process.env.FRONTEND_URL}/inquiries/${inquiry.id}`,
              style: 'primary',
            },
          ],
        },
      ],
    };
  }

  /**
   * Teamsエスカレーションメッセージの構築
   */
  private buildTeamsEscalationMessage(
    violation: SlaViolation,
    inquiry: Inquiry,
    application: any,
    reason: string,
    notes?: string,
  ): string {
    let message = `🚨 **エスカレーション通知**\n\n`;
    message += `**問い合わせID:** ${inquiry.id}\n`;
    message += `**アプリケーション:** ${application?.name || 'Unknown'}\n`;
    message += `**違反タイプ:** ${violation.violationType}\n`;
    message += `**重要度:** ${violation.severity}\n`;
    message += `**遅延時間:** ${violation.delayHours.toFixed(2)}時間\n`;
    message += `**エスカレーション理由:** ${reason}\n\n`;
    message += `**問い合わせ内容:**\n${inquiry.content.substring(0, 200)}${inquiry.content.length > 200 ? '...' : ''}\n\n`;
    
    if (notes) {
      message += `**追加メモ:** ${notes}\n\n`;
    }
    
    message += `[問い合わせを確認](${process.env.FRONTEND_URL}/inquiries/${inquiry.id})`;
    
    return message;
  }

  /**
   * エスカレーション履歴の取得
   */
  async getEscalationHistory(inquiryId: string): Promise<SlaViolation[]> {
    return this.slaViolationRepository.find({
      where: { 
        inquiryId,
        isEscalated: true,
      },
      relations: ['escalatedToUser', 'slaConfig'],
      order: { escalatedAt: 'DESC' },
    });
  }

  /**
   * エスカレーション統計の取得
   */
  async getEscalationStats(startDate: Date, endDate: Date): Promise<any> {
    const escalations = await this.slaViolationRepository.find({
      where: {
        isEscalated: true,
        escalatedAt: Between(startDate, endDate),
      },
      relations: ['inquiry', 'escalatedToUser', 'slaConfig'],
    });

    const totalEscalations = escalations.length;
    const resolvedEscalations = escalations.filter(e => e.isResolved).length;
    const pendingEscalations = totalEscalations - resolvedEscalations;

    // エスカレーション先別統計
    const escalationsByUser = escalations.reduce((acc, escalation) => {
      const userId = escalation.escalatedToUserId;
      if (!acc[userId]) {
        acc[userId] = {
          user: escalation.escalatedToUser,
          total: 0,
          resolved: 0,
          pending: 0,
        };
      }
      acc[userId].total++;
      if (escalation.isResolved) {
        acc[userId].resolved++;
      } else {
        acc[userId].pending++;
      }
      return acc;
    }, {});

    // 重要度別統計
    const escalationsBySeverity = escalations.reduce((acc, escalation) => {
      const severity = escalation.severity;
      if (!acc[severity]) {
        acc[severity] = { total: 0, resolved: 0, pending: 0 };
      }
      acc[severity].total++;
      if (escalation.isResolved) {
        acc[severity].resolved++;
      } else {
        acc[severity].pending++;
      }
      return acc;
    }, {});

    return {
      totalEscalations,
      resolvedEscalations,
      pendingEscalations,
      resolutionRate: totalEscalations > 0 ? (resolvedEscalations / totalEscalations) * 100 : 0,
      escalationsByUser: Object.values(escalationsByUser),
      escalationsBySeverity,
    };
  }
}