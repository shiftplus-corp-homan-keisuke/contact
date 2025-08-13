/**
 * 回答エンティティ
 * 要件: 2.1, 2.2, 2.3 (回答管理機能)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Inquiry } from '../../../modules/inquiries/entities/inquiry.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { ResponseHistory } from '../../../common/entities/response-history.entity';
import { File } from '../../../common/entities/file.entity';
import { ResponseStatus } from '../../../common/types/response.types';

@Entity('responses')
@Index(['inquiryId', 'createdAt'])
@Index(['userId', 'status'])
@Index(['isInternal'])
export class Response {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inquiry_id', type: 'uuid' })
  @Index()
  inquiryId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_internal', type: 'boolean', default: false })
  @Index()
  isInternal: boolean;

  @Column({
    type: 'enum',
    enum: ResponseStatus,
    default: ResponseStatus.DRAFT,
  })
  @Index()
  status: ResponseStatus;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // リレーション
  @ManyToOne(() => Inquiry, inquiry => inquiry.responses)
  @JoinColumn({ name: 'inquiry_id' })
  inquiry: Inquiry;

  @ManyToOne(() => User, user => user.responses)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => ResponseHistory, history => history.response)
  history: ResponseHistory[];

  @OneToMany(() => File, file => file.response)
  files: File[];
}