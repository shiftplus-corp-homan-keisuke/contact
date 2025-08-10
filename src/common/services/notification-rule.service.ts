/**
 * 通知ルール管理サービス
 * 要件: 1.5 (登録完了通知), 2.2, 2.3 (状態変更通知)
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { 
  NotificationRule, 
  NotificationCondition, 
  NotificationAction,
  NotificationEventType,
  NotificationChannel,
  NotificationPriority 
} from '../types/notification.types';

@Injectable()
export class NotificationRuleService {
  private readonly logger = new Logger(NotificationRuleService.name);
  private readonly rules = new Map<string, NotificationRule>();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * デフォルトルール初期化
   */
  private initializeDefaultRules(): void {
    const defaultRules: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // 問い合わせ作成時の通知ルール
      {
        name: '問い合わせ作成通知',
        trigger: 'inquiry_created',
        conditions: [],
        actions: [
          {
            type: 'email',
            recipients: ['admin@example.com', 'support@example.com'],
            template: 'inquiry_created_email',
            priority: 'medium',
          },
          {
            type: 'slack',
            recipients: ['#support'],
            template: 'inquiry_created_slack',
            priority: 'medium',
          },
        ],
        isActive: true,
      },
      // 高優先度問い合わせの即座通知
      {
        name: '高優先度問い合わせ即座通知',
        trigger: 'inquiry_created',
        conditions: [
          {
            field: 'priority',
            operator: 'equals',
            value: 'high',
          },
        ],
        actions: [
          {
            type: 'email',
            recipients: ['manager@example.com'],
            template: 'high_priority_inquiry_email',
            priority: 'high',
          },
          {
            type: 'slack',
            recipients: ['#urgent-support'],
            template: 'high_priority_inquiry_slack',
            priority: 'high',
          },
        ],
        isActive: true,
      },
      // 緊急問い合わせの即座通知
      {
        name: '緊急問い合わせ即座通知',
        trigger: 'inquiry_created',
        conditions: [
          {
            field: 'priority',
            operator: 'equals',
            value: 'urgent',
          },
        ],
        actions: [
          {
            type: 'email',
            recipients: ['manager@example.com', 'director@example.com'],
            template: 'urgent_inquiry_email',
            priority: 'urgent',
          },
          {
            type: 'slack',
            recipients: ['#urgent-support', '#management'],
            template: 'urgent_inquiry_slack',
            priority: 'urgent',
          },
          {
            type: 'teams',
            recipients: ['urgent-team'],
            template: 'urgent_inquiry_teams',
            priority: 'urgent',
          },
        ],
        isActive: true,
      },
      // 状態変更通知ルール
      {
        name: '状態変更通知',
        trigger: 'status_changed',
        conditions: [],
        actions: [
          {
            type: 'email',
            recipients: ['support@example.com'],
            template: 'status_changed_email',
            priority: 'medium',
          },
        ],
        isActive: true,
      },
      // 解決済み状態への変更通知
      {
        name: '解決済み状態変更通知',
        trigger: 'status_changed',
        conditions: [
          {
            field: 'newStatus',
            operator: 'equals',
            value: 'resolved',
          },
        ],
        actions: [
          {
            type: 'email',
            recipients: ['manager@example.com'],
            template: 'resolved_status_email',
            priority: 'low',
          },
          {
            type: 'slack',
            recipients: ['#support-metrics'],
            template: 'resolved_status_slack',
            priority: 'low',
          },
        ],
        isActive: true,
      },
      // 回答追加通知ルール
      {
        name: '回答追加通知',
        trigger: 'response_added',
        conditions: [],
        actions: [
          {
            type: 'email',
            recipients: ['support@example.com'],
            template: 'response_added_email',
            priority: 'medium',
          },
        ],
        isActive: true,
      },
      // SLA違反通知ルール
      {
        name: 'SLA違反通知',
        trigger: 'sla_violation',
        conditions: [],
        actions: [
          {
            type: 'email',
            recipients: ['manager@example.com', 'support@example.com'],
            template: 'sla_violation_email',
            priority: 'high',
          },
          {
            type: 'slack',
            recipients: ['#sla-alerts'],
            template: 'sla_violation_slack',
            priority: 'high',
          },
        ],
        isActive: true,
      },
      // 重大なSLA違反の即座通知
      {
        name: '重大SLA違反即座通知',
        trigger: 'sla_violation',
        conditions: [
          {
            field: 'severity',
            operator: 'equals',
            value: 'critical',
          },
        ],
        actions: [
          {
            type: 'email',
            recipients: ['director@example.com', 'manager@example.com'],
            template: 'critical_sla_violation_email',
            priority: 'urgent',
          },
          {
            type: 'slack',
            recipients: ['#critical-alerts', '#management'],
            template: 'critical_sla_violation_slack',
            priority: 'urgent',
          },
          {
            type: 'teams',
            recipients: ['management-team'],
            template: 'critical_sla_violation_teams',
            priority: 'urgent',
          },
        ],
        isActive: true,
      },
      // エスカレーション通知ルール
      {
        name: 'エスカレーション通知',
        trigger: 'escalation',
        conditions: [],
        actions: [
          {
            type: 'email',
            recipients: ['manager@example.com'],
            template: 'escalation_email',
            priority: 'high',
          },
          {
            type: 'slack',
            recipients: ['#escalations'],
            template: 'escalation_slack',
            priority: 'high',
          },
        ],
        isActive: true,
      },
    ];

    defaultRules.forEach((rule, index) => {
      const id = `rule-${index + 1}`;
      this.rules.set(id, {
        ...rule,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    this.logger.log(`${defaultRules.length}個のデフォルト通知ルールを初期化しました`);
  }

  /**
   * ルール取得
   */
  getRule(id: string): NotificationRule {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new NotFoundException(`通知ルールが見つかりません: ${id}`);
    }
    return rule;
  }

  /**
   * 全ルール取得
   */
  getAllRules(): NotificationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * アクティブなルール取得
   */
  getActiveRules(): NotificationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.isActive);
  }

  /**
   * イベントタイプ別ルール取得
   */
  getRulesByEventType(eventType: NotificationEventType): NotificationRule[] {
    return Array.from(this.rules.values()).filter(
      rule => rule.trigger === eventType && rule.isActive
    );
  }

  /**
   * 条件評価
   */
  evaluateConditions(conditions: NotificationCondition[], data: Record<string, any>): boolean {
    if (conditions.length === 0) {
      return true; // 条件がない場合は常にtrue
    }

    return conditions.every(condition => this.evaluateCondition(condition, data));
  }

  /**
   * 単一条件評価
   */
  private evaluateCondition(condition: NotificationCondition, data: Record<string, any>): boolean {
    const fieldValue = data[condition.field];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(conditionValue));
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      default:
        this.logger.warn(`未知の条件演算子: ${condition.operator}`);
        return false;
    }
  }

  /**
   * 適用可能なルール取得
   */
  getApplicableRules(eventType: NotificationEventType, data: Record<string, any>): NotificationRule[] {
    const rules = this.getRulesByEventType(eventType);
    
    return rules.filter(rule => this.evaluateConditions(rule.conditions, data));
  }

  /**
   * ルール作成
   */
  createRule(ruleData: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>): NotificationRule {
    const id = `rule-${Date.now()}`;
    const rule: NotificationRule = {
      ...ruleData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(id, rule);
    this.logger.log(`通知ルールを作成しました: ${rule.name}`);
    
    return rule;
  }

  /**
   * ルール更新
   */
  updateRule(id: string, updates: Partial<Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>>): NotificationRule {
    const rule = this.getRule(id);
    
    const updatedRule: NotificationRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    this.rules.set(id, updatedRule);
    this.logger.log(`通知ルールを更新しました: ${updatedRule.name}`);
    
    return updatedRule;
  }

  /**
   * ルール削除
   */
  deleteRule(id: string): void {
    const rule = this.getRule(id);
    this.rules.delete(id);
    this.logger.log(`通知ルールを削除しました: ${rule.name}`);
  }

  /**
   * ルール有効/無効切り替え
   */
  toggleRule(id: string): NotificationRule {
    const rule = this.getRule(id);
    return this.updateRule(id, { isActive: !rule.isActive });
  }

  /**
   * ルールテスト
   */
  testRule(id: string, testData: Record<string, any>): {
    applicable: boolean;
    conditionResults: Array<{
      condition: NotificationCondition;
      result: boolean;
    }>;
    actions: NotificationAction[];
  } {
    const rule = this.getRule(id);
    
    const conditionResults = rule.conditions.map(condition => ({
      condition,
      result: this.evaluateCondition(condition, testData),
    }));

    const applicable = this.evaluateConditions(rule.conditions, testData);

    return {
      applicable,
      conditionResults,
      actions: applicable ? rule.actions : [],
    };
  }

  /**
   * ルール統計取得
   */
  getRuleStatistics(): {
    total: number;
    active: number;
    inactive: number;
    byEventType: Record<NotificationEventType, number>;
    byChannel: Record<NotificationChannel, number>;
  } {
    const rules = this.getAllRules();
    const active = rules.filter(rule => rule.isActive);
    const inactive = rules.filter(rule => !rule.isActive);

    const byEventType: Record<string, number> = {};
    const byChannel: Record<string, number> = {};

    rules.forEach(rule => {
      // イベントタイプ別集計
      byEventType[rule.trigger] = (byEventType[rule.trigger] || 0) + 1;

      // チャネル別集計
      rule.actions.forEach(action => {
        byChannel[action.type] = (byChannel[action.type] || 0) + 1;
      });
    });

    return {
      total: rules.length,
      active: active.length,
      inactive: inactive.length,
      byEventType: byEventType as Record<NotificationEventType, number>,
      byChannel: byChannel as Record<NotificationChannel, number>,
    };
  }
}