/**
 * テンプレートエンティティ
 * 要件: 10.1 (テンプレート管理機能)
 */

import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Application } from './application.entity';
import { TemplateUsage } from './template-usage.entity';
import { TemplateVariable } from './template-variable.entity';

@Entity('templates')
@Index(['appId', 'category'])
@Index(['createdBy'])
@Index(['isShared', 'isActive'])
export class Template extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'app_id', type: 'uuid', nullable: true })
  appId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'is_shared', type: 'boolean', default: false })
  isShared: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount: number;

  @Column({ name: 'effectiveness_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  effectivenessScore: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  // リレーション
  @ManyToOne(() => User, user => user.templates)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Application, app => app.templates, { nullable: true })
  @JoinColumn({ name: 'app_id' })
  application: Application;

  @OneToMany(() => TemplateUsage, usage => usage.template)
  usageHistory: TemplateUsage[];

  @OneToMany(() => TemplateVariable, variable => variable.template)
  variables: TemplateVariable[];
}