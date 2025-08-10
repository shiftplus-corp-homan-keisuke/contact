/**
 * アプリケーションエンティティ
 * 要件: 1.1, 1.2, 1.3 (問い合わせ登録機能)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Inquiry } from './inquiry.entity';
import { FAQ } from './faq.entity';
import { ApiKey } from './api-key.entity';
import { Template } from './template.entity';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // リレーション
  @OneToMany(() => Inquiry, inquiry => inquiry.application)
  inquiries: Inquiry[];

  @OneToMany(() => FAQ, faq => faq.application)
  faqs: FAQ[];

  @OneToMany(() => ApiKey, apiKey => apiKey.application)
  apiKeys: ApiKey[];

  @OneToMany(() => Template, template => template.application)
  templates: Template[];
}