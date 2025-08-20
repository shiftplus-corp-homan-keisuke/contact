import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type NotificationTrigger =
    | 'inquiry_created'
    | 'status_changed'
    | 'response_added'
    | 'sla_violation'
    | 'escalation';

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'webhook' | 'realtime';

export interface NotificationCondition {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
}

export interface NotificationAction {
    type: NotificationChannel;
    recipients: string[];
    template?: string;
    webhookUrl?: string;
    delay?: number; // 遅延実行（分）
}

@Entity('notification_rules')
export class NotificationRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 50 })
    trigger: NotificationTrigger;

    @Column({ type: 'jsonb' })
    conditions: NotificationCondition[];

    @Column({ type: 'jsonb' })
    actions: NotificationAction[];

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'created_by', type: 'uuid' })
    createdBy: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}