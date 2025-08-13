/**
 * 問い合わせ状態履歴エンティティ
 * 要件: 2.2, 2.3 (問い合わせ状態変更履歴の記録)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Inquiry } from './inquiry.entity';
import { User } from '../../modules/users/entities/user.entity';
import { InquiryStatus } from '../types/inquiry.types';

@Entity('inquiry_status_history')
export class InquiryStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inquiry_id', type: 'uuid' })
  inquiryId: string;

  @Column({ name: 'old_status', type: 'varchar', length: 50, nullable: true })
  oldStatus: InquiryStatus;

  @Column({ name: 'new_status', type: 'varchar', length: 50 })
  newStatus: InquiryStatus;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  // リレーション
  @ManyToOne(() => Inquiry, inquiry => inquiry.statusHistory)
  @JoinColumn({ name: 'inquiry_id' })
  inquiry: Inquiry;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;
}