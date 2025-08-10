/**
 * テンプレート変数エンティティ
 * 要件: 10.3 (マクロ・変数置換機能)
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Template } from './template.entity';

@Entity('template_variables')
@Index(['templateId'])
export class TemplateVariable extends BaseEntity {
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'text', 'number', 'date', 'boolean', 'select'

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue: string;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'json', nullable: true })
  options: any; // select型の場合の選択肢など

  @Column({ name: 'validation_rules', type: 'json', nullable: true })
  validationRules: any; // バリデーションルール

  // リレーション
  @ManyToOne(() => Template, template => template.variables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: Template;
}