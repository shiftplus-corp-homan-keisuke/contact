/**
 * ユーザー履歴エンティティ
 * 要件: 4.3 (ユーザー情報更新時の変更履歴記録)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_history')
export class UserHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'field_name', type: 'varchar', length: 100 })
  fieldName: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string;

  @Column({ name: 'new_value', type: 'text' })
  newValue: string;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  // リレーション
  @ManyToOne(() => User, user => user.history)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, user => user.changedHistory)
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;
}