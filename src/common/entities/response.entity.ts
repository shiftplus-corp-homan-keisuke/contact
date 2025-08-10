/**
 * 回答エンティティ
 * 要件: 2.1, 2.3, 2.4 (問い合わせ・回答管理機能)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Inquiry } from './inquiry.entity';
import { User } from './user.entity';
import { ResponseHistory } from './response-history.entity';
import { TemplateUsage } from './template-usage.entity';

@Entity('responses')
export class Response {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inquiry_id', type: 'uuid' })
  inquiryId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // リレーション
  @ManyToOne(() => Inquiry, inquiry => inquiry.responses)
  @JoinColumn({ name: 'inquiry_id' })
  inquiry: Inquiry;

  @ManyToOne(() => User, user => user.responses)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => ResponseHistory, history => history.response)
  history: ResponseHistory[];

  @OneToMany(() => TemplateUsage, usage => usage.response)
  templateUsages: TemplateUsage[];
}