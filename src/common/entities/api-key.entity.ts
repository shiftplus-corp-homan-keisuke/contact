/**
 * APIキーエンティティ
 * 要件: 7.1, 7.4 (API認証とレート制限)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Application } from './application.entity';
import { RateLimitTracking } from './rate-limit-tracking.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'app_id', type: 'uuid' })
  appId: string;

  @Column({ name: 'key_hash', type: 'varchar', length: 255, unique: true })
  keyHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'jsonb', default: '[]' })
  permissions: string[];

  @Column({ name: 'rate_limit_per_hour', type: 'integer', default: 1000 })
  rateLimitPerHour: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  // リレーション
  @ManyToOne(() => Application, application => application.apiKeys)
  @JoinColumn({ name: 'app_id' })
  application: Application;

  @OneToMany(() => RateLimitTracking, tracking => tracking.apiKey)
  rateLimitTracking: RateLimitTracking[];
}