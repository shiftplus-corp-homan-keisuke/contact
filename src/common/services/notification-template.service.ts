/**
 * 通知テンプレート管理サービス
 * 要件: 1.5 (登録完了通知), 2.2, 2.3 (状態変更通知)
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { 
  NotificationTemplate, 
  NotificationChannel, 
  NotificationEventType 
} from '../types/notification.types';

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);
  private readonly templates = new Map<string, NotificationTemplate>();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * デフォルトテンプレート初期化
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // 問い合わせ作成通知テンプレート
      {
        name: '問い合わせ作成通知（メール）',
        type: 'email',
        eventType: 'inquiry_created',
        subject: '新しい問い合わせが登録されました - {{appName}}',
        content: `
          <h2>新しい問い合わせが登録されました</h2>
          <p><strong>アプリケーション:</strong> {{appName}}</p>
          <p><strong>タイトル:</strong> {{inquiryTitle}}</p>
          <p><strong>問い合わせID:</strong> {{inquiryId}}</p>
          <p><strong>優先度:</strong> {{priority}}</p>
          <p><strong>カテゴリ:</strong> {{category}}</p>
          <p><strong>顧客情報:</strong> {{customerName}} ({{customerEmail}})</p>
          <p><strong>登録日時:</strong> {{createdAt}}</p>
          <p>管理画面で詳細を確認してください。</p>
        `,
        variables: ['appName', 'inquiryTitle', 'inquiryId', 'priority', 'category', 'customerName', 'customerEmail', 'createdAt'],
        isActive: true,
      },
      {
        name: '問い合わせ作成通知（Slack）',
        type: 'slack',
        eventType: 'inquiry_created',
        subject: '新しい問い合わせ: {{inquiryTitle}}',
        content: `
          :inbox_tray: *新しい問い合わせが登録されました*
          
          *アプリケーション:* {{appName}}
          *タイトル:* {{inquiryTitle}}
          *問い合わせID:* {{inquiryId}}
          *優先度:* {{priority}}
          *カテゴリ:* {{category}}
          *顧客:* {{customerName}} ({{customerEmail}})
          *登録日時:* {{createdAt}}
        `,
        variables: ['appName', 'inquiryTitle', 'inquiryId', 'priority', 'category', 'customerName', 'customerEmail', 'createdAt'],
        isActive: true,
      },
      // 状態変更通知テンプレート
      {
        name: '状態変更通知（メール）',
        type: 'email',
        eventType: 'status_changed',
        subject: '問い合わせの状態が変更されました - {{inquiryTitle}}',
        content: `
          <h2>問い合わせの状態が変更されました</h2>
          <p><strong>タイトル:</strong> {{inquiryTitle}}</p>
          <p><strong>問い合わせID:</strong> {{inquiryId}}</p>
          <p><strong>変更前:</strong> {{oldStatus}}</p>
          <p><strong>変更後:</strong> {{newStatus}}</p>
          <p><strong>変更者:</strong> {{changedBy}}</p>
          <p><strong>変更日時:</strong> {{changedAt}}</p>
          {{#if comment}}
          <p><strong>コメント:</strong></p>
          <div style="border-left: 3px solid #007bff; padding-left: 15px; margin: 10px 0;">
            {{comment}}
          </div>
          {{/if}}
          <p>管理画面で詳細を確認してください。</p>
        `,
        variables: ['inquiryTitle', 'inquiryId', 'oldStatus', 'newStatus', 'changedBy', 'changedAt', 'comment'],
        isActive: true,
      },
      {
        name: '状態変更通知（Slack）',
        type: 'slack',
        eventType: 'status_changed',
        subject: '状態変更: {{inquiryTitle}}',
        content: `
          :arrows_counterclockwise: *問い合わせの状態が変更されました*
          
          *タイトル:* {{inquiryTitle}}
          *問い合わせID:* {{inquiryId}}
          *変更前:* {{oldStatus}}
          *変更後:* {{newStatus}}
          *変更者:* {{changedBy}}
          *変更日時:* {{changedAt}}
          {{#if comment}}
          *コメント:* {{comment}}
          {{/if}}
        `,
        variables: ['inquiryTitle', 'inquiryId', 'oldStatus', 'newStatus', 'changedBy', 'changedAt', 'comment'],
        isActive: true,
      },
      // 回答追加通知テンプレート
      {
        name: '回答追加通知（メール）',
        type: 'email',
        eventType: 'response_added',
        subject: '問い合わせに回答が追加されました - {{inquiryTitle}}',
        content: `
          <h2>問い合わせに回答が追加されました</h2>
          <p><strong>タイトル:</strong> {{inquiryTitle}}</p>
          <p><strong>問い合わせID:</strong> {{inquiryId}}</p>
          <p><strong>回答者:</strong> {{respondedBy}}</p>
          <p><strong>回答日時:</strong> {{respondedAt}}</p>
          <p><strong>回答内容:</strong></p>
          <div style="border-left: 3px solid #28a745; padding-left: 15px; margin: 10px 0; background-color: #f8f9fa; padding: 15px;">
            {{responseContent}}
          </div>
          <p>管理画面で詳細を確認してください。</p>
        `,
        variables: ['inquiryTitle', 'inquiryId', 'respondedBy', 'respondedAt', 'responseContent'],
        isActive: true,
      },
      {
        name: '回答追加通知（Slack）',
        type: 'slack',
        eventType: 'response_added',
        subject: '回答追加: {{inquiryTitle}}',
        content: `
          :speech_balloon: *問い合わせに回答が追加されました*
          
          *タイトル:* {{inquiryTitle}}
          *問い合わせID:* {{inquiryId}}
          *回答者:* {{respondedBy}}
          *回答日時:* {{respondedAt}}
          
          *回答内容:*
          > {{responseContent}}
        `,
        variables: ['inquiryTitle', 'inquiryId', 'respondedBy', 'respondedAt', 'responseContent'],
        isActive: true,
      },
      // SLA違反通知テンプレート
      {
        name: 'SLA違反通知（メール）',
        type: 'email',
        eventType: 'sla_violation',
        subject: 'SLA違反が発生しました - {{inquiryTitle}}',
        content: `
          <h2 style="color: #dc3545;">SLA違反が発生しました</h2>
          <p><strong>タイトル:</strong> {{inquiryTitle}}</p>
          <p><strong>問い合わせID:</strong> {{inquiryId}}</p>
          <p><strong>違反タイプ:</strong> {{violationType}}</p>
          <p><strong>期待時間:</strong> {{expectedTime}}分</p>
          <p><strong>実際の時間:</strong> {{actualTime}}分</p>
          <p><strong>超過時間:</strong> {{violationTime}}分</p>
          <p><strong>重要度:</strong> {{severity}}</p>
          <p><strong>担当者:</strong> {{assignedTo}}</p>
          <p style="color: #dc3545; font-weight: bold;">至急対応が必要です。</p>
        `,
        variables: ['inquiryTitle', 'inquiryId', 'violationType', 'expectedTime', 'actualTime', 'violationTime', 'severity', 'assignedTo'],
        isActive: true,
      },
      {
        name: 'SLA違反通知（Slack）',
        type: 'slack',
        eventType: 'sla_violation',
        subject: 'SLA違反: {{inquiryTitle}}',
        content: `
          :warning: *SLA違反が発生しました*
          
          *タイトル:* {{inquiryTitle}}
          *問い合わせID:* {{inquiryId}}
          *違反タイプ:* {{violationType}}
          *期待時間:* {{expectedTime}}分
          *実際の時間:* {{actualTime}}分
          *超過時間:* {{violationTime}}分
          *重要度:* {{severity}}
          *担当者:* {{assignedTo}}
          
          :exclamation: *至急対応が必要です*
        `,
        variables: ['inquiryTitle', 'inquiryId', 'violationType', 'expectedTime', 'actualTime', 'violationTime', 'severity', 'assignedTo'],
        isActive: true,
      },
      // エスカレーション通知テンプレート
      {
        name: 'エスカレーション通知（メール）',
        type: 'email',
        eventType: 'escalation',
        subject: '問い合わせがエスカレーションされました - {{inquiryTitle}}',
        content: `
          <h2 style="color: #ffc107;">問い合わせがエスカレーションされました</h2>
          <p><strong>タイトル:</strong> {{inquiryTitle}}</p>
          <p><strong>問い合わせID:</strong> {{inquiryId}}</p>
          <p><strong>エスカレーション理由:</strong> {{escalationReason}}</p>
          <p><strong>元の担当者:</strong> {{originalAssignee}}</p>
          <p><strong>新しい担当者:</strong> {{newAssignee}}</p>
          <p><strong>優先度:</strong> {{priority}}</p>
          <p><strong>エスカレーション日時:</strong> {{escalatedAt}}</p>
          <p>優先的な対応をお願いします。</p>
        `,
        variables: ['inquiryTitle', 'inquiryId', 'escalationReason', 'originalAssignee', 'newAssignee', 'priority', 'escalatedAt'],
        isActive: true,
      },
    ];

    defaultTemplates.forEach((template, index) => {
      const id = `template-${index + 1}`;
      this.templates.set(id, {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    this.logger.log(`${defaultTemplates.length}個のデフォルトテンプレートを初期化しました`);
  }

  /**
   * テンプレート取得
   */
  getTemplate(id: string): NotificationTemplate {
    const template = this.templates.get(id);
    if (!template) {
      throw new NotFoundException(`テンプレートが見つかりません: ${id}`);
    }
    return template;
  }

  /**
   * イベントタイプとチャネルでテンプレート取得
   */
  getTemplateByEventAndChannel(eventType: NotificationEventType, channel: NotificationChannel): NotificationTemplate | null {
    for (const template of this.templates.values()) {
      if (template.eventType === eventType && template.type === channel && template.isActive) {
        return template;
      }
    }
    return null;
  }

  /**
   * 全テンプレート取得
   */
  getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * アクティブなテンプレート取得
   */
  getActiveTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.isActive);
  }

  /**
   * イベントタイプ別テンプレート取得
   */
  getTemplatesByEventType(eventType: NotificationEventType): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(
      template => template.eventType === eventType && template.isActive
    );
  }

  /**
   * チャネル別テンプレート取得
   */
  getTemplatesByChannel(channel: NotificationChannel): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(
      template => template.type === channel && template.isActive
    );
  }

  /**
   * テンプレート変数置換
   */
  renderTemplate(template: NotificationTemplate, variables: Record<string, any>): { subject: string; content: string } {
    let subject = template.subject;
    let content = template.content;

    // 変数置換
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const stringValue = value !== null && value !== undefined ? String(value) : '';
      
      subject = subject.replace(new RegExp(placeholder, 'g'), stringValue);
      content = content.replace(new RegExp(placeholder, 'g'), stringValue);
    });

    // 条件分岐処理（簡単なHandlebars風）
    content = this.processConditionals(content, variables);

    return { subject, content };
  }

  /**
   * 条件分岐処理
   */
  private processConditionals(content: string, variables: Record<string, any>): string {
    // {{#if variable}} ... {{/if}} の処理
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return content.replace(ifRegex, (match, variable, innerContent) => {
      const value = variables[variable];
      return value ? innerContent.trim() : '';
    });
  }

  /**
   * テンプレート作成
   */
  createTemplate(templateData: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): NotificationTemplate {
    const id = `template-${Date.now()}`;
    const template: NotificationTemplate = {
      ...templateData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);
    this.logger.log(`テンプレートを作成しました: ${template.name}`);
    
    return template;
  }

  /**
   * テンプレート更新
   */
  updateTemplate(id: string, updates: Partial<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>>): NotificationTemplate {
    const template = this.getTemplate(id);
    
    const updatedTemplate: NotificationTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(id, updatedTemplate);
    this.logger.log(`テンプレートを更新しました: ${updatedTemplate.name}`);
    
    return updatedTemplate;
  }

  /**
   * テンプレート削除
   */
  deleteTemplate(id: string): void {
    const template = this.getTemplate(id);
    this.templates.delete(id);
    this.logger.log(`テンプレートを削除しました: ${template.name}`);
  }

  /**
   * テンプレート有効/無効切り替え
   */
  toggleTemplate(id: string): NotificationTemplate {
    const template = this.getTemplate(id);
    return this.updateTemplate(id, { isActive: !template.isActive });
  }
}