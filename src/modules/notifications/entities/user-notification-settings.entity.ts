import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationChannel, NotificationTrigger } from './notification-rule.entity';

@Entity('user_notification_settings')
@Unique(['userId', 'trigger', 'channel'])
export class UserNotificationSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', length: 50 })
    trigger: NotificationTrigger;

    @Column({ type: 'varchar', length: 50 })
    channel: NotificationChannel;

    @Column({ name: 'is_enabled', default: true })
    isEnabled: boolean;

    @Column({ name: 'email_address', type: 'varchar', length: 255, nullable: true })
    emailAddress?: string;

    @Column({ name: 'slack_webhook_url', type: 'varchar', length: 500, nullable: true })
    slackWebhookUrl?: string;

    @Column({ name: 'teams_webhook_url', type: 'varchar', length: 500, nullable: true })
    teamsWebhookUrl?: string;

    @Column({ name: 'webhook_url', type: 'varchar', length: 500, nullable: true })
    webhookUrl?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}