import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Inquiry } from './inquiry.entity';
import { SlaConfig } from './sla-config.entity';
import { User } from '../../modules/users/entities/user.entity';

/**
 * SLA違反ログエンティティ
 * SLA違反の記録と追跡を管理
 */
@Entity('sla_violations')
export class SlaViolation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inquiry_id' })
  inquiryId: string;

  @ManyToOne(() => Inquiry)
  @JoinColumn({ name: 'inquiry_id' })
  inquiry: Inquiry;

  @Column({ name: 'sla_config_id' })
  slaConfigId: string;

  @ManyToOne(() => SlaConfig)
  @JoinColumn({ name: 'sla_config_id' })
  slaConfig: SlaConfig;

  @Column({ name: 'violation_type', type: 'varchar', length: 50 })
  violationType: string; // 'response_time', 'resolution_time', 'escalation_time'

  @Column({ name: 'expected_time', type: 'timestamp' })
  expectedTime: Date; // 期待される対応時間

  @Column({ name: 'actual_time', type: 'timestamp', nullable: true })
  actualTime: Date; // 実際の対応時間

  @Column({ name: 'violation_time', type: 'timestamp' })
  violationTime: Date; // 違反発生時間

  @Column({ name: 'delay_hours', type: 'decimal', precision: 10, scale: 2 })
  delayHours: number; // 遅延時間（時間）

  @Column({ name: 'severity', type: 'varchar', length: 20 })
  severity: string; // 'minor', 'major', 'critical'

  @Column({ name: 'is_escalated', type: 'boolean', default: false })
  isEscalated: boolean; // エスカレーション済みか

  @Column({ name: 'escalated_to_user_id', nullable: true })
  escalatedToUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'escalated_to_user_id' })
  escalatedToUser: User;

  @Column({ name: 'escalated_at', type: 'timestamp', nullable: true })
  escalatedAt: Date;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ name: 'is_resolved', type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}