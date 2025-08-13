import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';

/**
 * 通知ルールエンティティ
 * 通知の条件とアクションを定義する
 */
@Entity('notification_rules')
export class NotificationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100 })
  trigger: string; // 'inquiry_created' | 'status_changed' | 'sla_violation' | 'escalation'

  @Column('jsonb')
  conditions: Record<string, any>;

  @Column('jsonb')
  actions: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column('uuid', { nullable: true })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}