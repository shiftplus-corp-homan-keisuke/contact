/**
 * テンプレート使用履歴エンティティ
 * 要件: 10.2, 10.3 (テンプレート効果測定機能、使用統計)
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Template } from './template.entity';
import { User } from './user.entity';
import { Inquiry } from './inquiry.entity';
import { Response } from './response.entity';

@Entity('template_usage')
@Index(['templateId', 'createdAt'])
@Index(['usedBy'])
@Index(['inquiryId'])
export class TemplateUsage extends BaseEntity {
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ name: 'used_by', type: 'uuid' })
  usedBy: string;

  @Column({ name: 'inquiry_id', type: 'uuid', nullable: true })
  inquiryId: string;

  @Column({ name: 'response_id', type: 'uuid', nullable: true })
  responseId: string;

  @Column({ name: 'usage_context', type: 'varchar', length: 50 })
  usageContext: string; // 'response', 'email', 'chat', etc.

  @Column({ name: 'variables_used', type: 'json', nullable: true })
  variablesUsed: Record<string, any>;

  @Column({ name: 'generated_content', type: 'text', nullable: true })
  generatedContent: string;

  @Column({ name: 'effectiveness_rating', type: 'integer', nullable: true })
  effectivenessRating: number; // 1-5の評価

  @Column({ name: 'feedback_comment', type: 'text', nullable: true })
  feedbackComment: string;

  // リレーション
  @ManyToOne(() => Template, template => template.usageHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @ManyToOne(() => User, user => user.templateUsages)
  @JoinColumn({ name: 'used_by' })
  user: User;

  @ManyToOne(() => Inquiry, inquiry => inquiry.templateUsages, { nullable: true })
  @JoinColumn({ name: 'inquiry_id' })
  inquiry: Inquiry;

  @ManyToOne(() => Response, response => response.templateUsages, { nullable: true })
  @JoinColumn({ name: 'response_id' })
  response: Response;
}