import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { File } from './file.entity';
import { User } from '../../modules/users/entities/user.entity';

/**
 * ファイルアクセスログエンティティ
 * ファイルへのアクセス履歴を記録
 */
@Entity('file_access_logs')
@Index(['fileId', 'accessedAt'])
@Index(['userId', 'accessedAt'])
@Index(['action'])
export class FileAccessLog extends BaseEntity {
  /**
   * ファイルID
   */
  @Column({ type: 'uuid', nullable: false })
  fileId: string;

  /**
   * ユーザーID
   */
  @Column({ type: 'uuid', nullable: false })
  userId: string;

  /**
   * アクセス種別
   */
  @Column({ 
    type: 'enum', 
    enum: ['upload', 'download', 'view', 'delete', 'update'],
    nullable: false
  })
  action: 'upload' | 'download' | 'view' | 'delete' | 'update';

  /**
   * IPアドレス
   */
  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  /**
   * ユーザーエージェント
   */
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  /**
   * アクセス日時
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  accessedAt: Date;

  /**
   * 成功フラグ
   */
  @Column({ type: 'boolean', default: true })
  success: boolean;

  /**
   * エラーメッセージ
   */
  @Column({ type: 'text', nullable: true })
  error: string;

  // リレーション
  @ManyToOne(() => File, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: File;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}