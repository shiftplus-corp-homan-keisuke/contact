/**
 * レート制限追跡エンティティ
 * 要件: 7.4 (API利用制限の管理)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiKey } from './api-key.entity';

@Entity('rate_limit_tracking')
export class RateLimitTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'api_key_id', type: 'uuid' })
  apiKeyId: string;

  @Column({ name: 'request_count', type: 'integer', default: 0 })
  requestCount: number;

  @Column({ name: 'window_start', type: 'timestamp' })
  windowStart: Date;

  @Column({ name: 'window_end', type: 'timestamp' })
  windowEnd: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // リレーション
  @ManyToOne(() => ApiKey, apiKey => apiKey.rateLimitTracking)
  @JoinColumn({ name: 'api_key_id' })
  apiKey: ApiKey;
}