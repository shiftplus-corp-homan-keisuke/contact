import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity';

/**
 * SLA設定エンティティ
 * アプリケーション別のSLA設定を管理
 */
@Entity('sla_configs')
export class SlaConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'priority_level', type: 'varchar', length: 20 })
  priorityLevel: string; // 'low', 'medium', 'high', 'critical'

  @Column({ name: 'response_time_hours', type: 'integer' })
  responseTimeHours: number; // 初回応答時間（時間）

  @Column({ name: 'resolution_time_hours', type: 'integer' })
  resolutionTimeHours: number; // 解決時間（時間）

  @Column({ name: 'escalation_time_hours', type: 'integer' })
  escalationTimeHours: number; // エスカレーション時間（時間）

  @Column({ name: 'business_hours_only', type: 'boolean', default: false })
  businessHoursOnly: boolean; // 営業時間のみカウントするか

  @Column({ name: 'business_start_hour', type: 'integer', default: 9 })
  businessStartHour: number; // 営業開始時間

  @Column({ name: 'business_end_hour', type: 'integer', default: 18 })
  businessEndHour: number; // 営業終了時間

  @Column({ name: 'business_days', type: 'text', default: '1,2,3,4,5' })
  businessDays: string; // 営業日（1=月曜日, 7=日曜日）

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}