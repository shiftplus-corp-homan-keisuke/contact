import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Inquiry } from './inquiry.entity';
import { NotificationRule } from './notification-rule.entity';

/**
 * 通知ログエンティティ
 * 送信された通知の履歴を記録する
 */
@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  type: string; // 'email' | 'slack' | 'teams' | 'websocket' | 'webhook'

  @Column('text', { array: true })
  recipients: string[];

  @Column({ length: 500 })
  subject: string;

  @Column('text')
  content: string;

  @Column({ length: 20 })
  priority: string; // 'low' | 'medium' | 'high' | 'urgent'

  @Column({ length: 50 })
  status: string; // 'pending' | 'sent' | 'failed' | 'delivered'

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('uuid', { nullable: true })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { nullable: true })
  inquiryId: string;

  @ManyToOne(() => Inquiry)
  @JoinColumn({ name: 'inquiry_id' })
  inquiry: Inquiry;

  @Column('uuid', { nullable: true })
  ruleId: string;

  @ManyToOne(() => NotificationRule)
  @JoinColumn({ name: 'rule_id' })
  rule: NotificationRule;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;
}