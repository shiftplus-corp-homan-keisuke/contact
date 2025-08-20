/**
 * レート制限追跡エンティティ
 * 要件7.4: レート制限機能の実装
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
} from 'typeorm';

@Entity('rate_limit_tracking')
@Index(['keyHash', 'timestamp'])
@Index(['timestamp']) // 古いレコード削除用
export class RateLimitTracking {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'key_hash', length: 64 })
    keyHash: string;

    @Column({ name: 'timestamp' })
    timestamp: Date;
}