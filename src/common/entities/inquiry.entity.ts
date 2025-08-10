/**
 * 問い合わせエンティティ
 * 要件: 1.1, 1.3, 1.4, 2.2, 2.3 (問い合わせ登録・管理機能)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Application } from './application.entity';
import { User } from './user.entity';
import { Response } from './response.entity';
import { InquiryStatusHistory } from './inquiry-status-history.entity';
import { TemplateUsage } from './template-usage.entity';
import { File } from './file.entity';
import { InquiryStatus, InquiryPriority } from '../types/inquiry.types';

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, default: InquiryStatus.NEW })
  status: InquiryStatus;

  @Column({ type: 'varchar', length: 20, default: InquiryPriority.MEDIUM })
  priority: InquiryPriority;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 255, nullable: true })
  customerEmail: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName: string;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // リレーション
  @ManyToOne(() => Application, application => application.inquiries)
  @JoinColumn({ name: 'app_id' })
  application: Application;

  @ManyToOne(() => User, user => user.assignedInquiries, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedUser: User;

  @OneToMany(() => Response, response => response.inquiry)
  responses: Response[];

  @OneToMany(() => InquiryStatusHistory, history => history.inquiry)
  statusHistory: InquiryStatusHistory[];

  @OneToMany(() => TemplateUsage, usage => usage.inquiry)
  templateUsages: TemplateUsage[];

  @OneToMany(() => File, file => file.inquiry)
  files: File[];
}