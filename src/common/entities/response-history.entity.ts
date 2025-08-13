/**
 * 回答履歴エンティティ
 * 要件: 2.4 (回答更新履歴の保持)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Response } from './response.entity';
import { User } from '../../modules/users/entities/user.entity';

@Entity('response_history')
export class ResponseHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'response_id', type: 'uuid' })
  responseId: string;

  @Column({ name: 'old_content', type: 'text', nullable: true })
  oldContent: string;

  @Column({ name: 'new_content', type: 'text' })
  newContent: string;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  // リレーション
  @ManyToOne(() => Response, response => response.history)
  @JoinColumn({ name: 'response_id' })
  response: Response;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;
}