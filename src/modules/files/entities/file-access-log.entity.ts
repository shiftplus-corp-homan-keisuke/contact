import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { File } from './file.entity';

/**
 * ファイルアクセスログエンティティ
 * ファイルへのアクセス履歴を記録
 */
@Entity('file_access_logs')
@Index(['fileId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class FileAccessLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', comment: 'ファイルID' })
    fileId: string;

    @Column({ type: 'uuid', nullable: true, comment: 'アクセスしたユーザーID' })
    userId: string;

    @Column({
        type: 'enum',
        enum: ['upload', 'download', 'view', 'delete', 'scan'],
        comment: 'アクション種別'
    })
    action: 'upload' | 'download' | 'view' | 'delete' | 'scan';

    @Column({ type: 'inet', nullable: true, comment: 'IPアドレス' })
    ipAddress: string;

    @Column({ type: 'text', nullable: true, comment: 'ユーザーエージェント' })
    userAgent: string;

    @Column({ type: 'boolean', default: true, comment: 'アクセス成功フラグ' })
    success: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true, comment: '失敗理由' })
    failureReason: string;

    @Column({ type: 'json', nullable: true, comment: '追加情報' })
    metadata: Record<string, any>;

    @CreateDateColumn({ comment: 'アクセス日時' })
    createdAt: Date;

    // リレーション
    @ManyToOne(() => File, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'fileId' })
    file: File;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User;
}