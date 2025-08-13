/**
 * 問い合わせエンティティ
 * 要件: 1.1, 1.3, 1.4 (問い合わせ登録・管理機能)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Application } from './application.entity';
import { Response } from './response.entity';
import { InquiryStatusHistory } from './inquiry-status-history.entity';
import { File } from './file.entity';

export enum InquiryStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum InquiryPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

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

  @ManyToOne(() => User, user => user.assignedInquiries)
  @JoinColumn({ name: 'assigned_to' })
  assignedUser: User;

  @OneToMany(() => Response, response => response.inquiry)
  responses: Response[];

  @OneToMany(() => InquiryStatusHistory, history => history.inquiry)
  statusHistory: InquiryStatusHistory[];

  @OneToMany(() => File, file => file.inquiry)
  files: File[];

  // テンプレート使用履歴（オプション）
  templateUsages?: any[];
}