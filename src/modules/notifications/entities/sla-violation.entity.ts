import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { SlaConfig } from './sla-config.entity';
import { User } from '../../users/entities/user.entity';

/**
 * SLA違反エンティティ
 * SLA違反の記録と追跡を管理
 */
@Entity('sla_violations')
export class SlaViolation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'inquiry_id', type: 'uuid' })
    inquiryId: string;

    @ManyToOne(() => Inquiry)
    @JoinColumn({ name: 'inquiry_id' })
    inquiry: Inquiry;

    @Column({ name: 'sla_config_id', type: 'uuid' })
    slaConfigId: string;

    @ManyToOne(() => SlaConfig)
    @JoinColumn({ name: 'sla_config_id' })
    slaConfig: SlaConfig;

    @Column({ name: 'violation_type', type: 'varchar', length: 50 })
    violationType: 'response_time' | 'resolution_time' | 'escalation_time';

    @Column({ name: 'expected_time', type: 'timestamp' })
    expectedTime: Date;

    @Column({ name: 'actual_time', type: 'timestamp', nullable: true })
    actualTime: Date;

    @Column({ name: 'delay_hours', type: 'decimal', precision: 10, scale: 2 })
    delayHours: number;

    @Column({ name: 'severity', type: 'varchar', length: 20 })
    severity: 'minor' | 'major' | 'critical';

    @Column({ name: 'is_resolved', type: 'boolean', default: false })
    isResolved: boolean;

    @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
    resolvedBy: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'resolved_by' })
    resolver: User;

    @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
    resolvedAt: Date;

    @Column({ name: 'resolution_comment', type: 'text', nullable: true })
    resolutionComment: string;

    @CreateDateColumn({ name: 'detected_at' })
    detectedAt: Date;
}