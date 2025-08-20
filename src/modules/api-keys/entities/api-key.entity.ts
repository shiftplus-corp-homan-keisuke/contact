/**
 * APIキーエンティティ
 * 要件7.1: APIキー認証機能の実装
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { Application } from '../../inquiries/entities/application.entity';

@Entity('api_keys')
@Index(['keyHash'], { unique: true })
@Index(['appId'])
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'app_id' })
    appId: string;

    @ManyToOne(() => Application)
    @JoinColumn({ name: 'app_id' })
    application: Application;

    @Column({ length: 100 })
    name: string;

    @Column({ name: 'key_hash', length: 64, unique: true })
    keyHash: string;

    @Column({ name: 'key_prefix', length: 10 })
    keyPrefix: string;

    @Column('simple-array', { nullable: true })
    permissions: string[];

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'rate_limit_window', default: 60 })
    rateLimitWindow: number; // 秒

    @Column({ name: 'rate_limit_max', default: 100 })
    rateLimitMax: number;

    @Column({ name: 'usage_count', default: 0 })
    usageCount: number;

    @Column({ name: 'expires_at', nullable: true })
    expiresAt: Date;

    @Column({ name: 'last_used_at', nullable: true })
    lastUsedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}