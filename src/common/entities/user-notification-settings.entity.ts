import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * ユーザー通知設定エンティティ
 * ユーザーごとの通知設定を管理する
 */
@Entity('user_notification_settings')
export class UserNotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ default: true })
  emailEnabled: boolean;

  @Column({ default: false })
  slackEnabled: boolean;

  @Column({ default: false })
  teamsEnabled: boolean;

  @Column({ default: true })
  websocketEnabled: boolean;

  @Column({ length: 255, nullable: true })
  slackUserId: string;

  @Column({ length: 255, nullable: true })
  teamsUserId: string;

  @Column('jsonb', { default: {} })
  preferences: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}