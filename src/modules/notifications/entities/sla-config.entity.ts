import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Application } from '../../inquiries/entities/application.entity';

/**
 * SLA設定エンティティ
 * アプリケーションごとのSLA設定を管理
 */
@Entity('sla_configs')
export class SlaConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'app_id', type: 'uuid' })
    appId: string;

    @ManyToOne(() => Application)
    @JoinColumn({ name: 'app_id' })
    application: Application;

    @Column({ name: 'priority', type: 'varchar', length: 20 })
    priority: 'low' | 'medium' | 'high' | 'urgent';

    @Column({ name: 'response_time_hours', type: 'integer' })
    responseTimeHours: number;

    @Column({ name: 'resolution_time_hours', type: 'integer' })
    resolutionTimeHours: number;

    @Column({ name: 'escalation_time_hours', type: 'integer' })
    escalationTimeHours: number;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}