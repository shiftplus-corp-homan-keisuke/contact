import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationChannel } from './notification-rule.entity';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

@Entity('notification_logs')
export class NotificationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'rule_id', type: 'uuid', nullable: true })
    ruleId?: string;

    @Column({ type: 'varchar', length: 50 })
    channel: NotificationChannel;

    @Column({ type: 'varchar', length: 255 })
    recipient: string;

    @Column({ length: 500 })
    subject: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: NotificationStatus;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage?: string;

    @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
    sentAt?: Date;

    @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
    deliveredAt?: Date;

    @Column({ name: 'triggered_by', type: 'uuid', nullable: true })
    triggeredBy?: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'triggered_by' })
    trigger: User;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}