import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';

/**
 * ファイルエンティティ
 * 問い合わせに関連するファイルの情報を管理
 */
@Entity('files')
@Index(['inquiryId', 'isDeleted'])
@Index(['uploadedBy', 'createdAt'])
@Index(['mimeType', 'isDeleted'])
export class File {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, comment: 'ファイル名' })
    filename: string;

    @Column({ type: 'varchar', length: 255, comment: '元のファイル名' })
    originalName: string;

    @Column({ type: 'varchar', length: 500, comment: 'ファイルパス' })
    filePath: string;

    @Column({ type: 'varchar', length: 100, comment: 'MIMEタイプ' })
    mimeType: string;

    @Column({ type: 'bigint', comment: 'ファイルサイズ（バイト）' })
    size: number;

    @Column({ type: 'varchar', length: 64, nullable: true, comment: 'ファイルハッシュ（SHA-256）' })
    fileHash: string;

    @Column({ type: 'uuid', comment: '関連する問い合わせID' })
    inquiryId: string;

    @Column({ type: 'uuid', comment: 'アップロードしたユーザーID' })
    uploadedBy: string;

    @Column({ type: 'boolean', default: false, comment: 'ウイルススキャン済みフラグ' })
    isScanned: boolean;

    @Column({
        type: 'enum',
        enum: ['pending', 'clean', 'infected', 'suspicious', 'error'],
        default: 'pending',
        comment: 'スキャン結果'
    })
    scanResult: 'pending' | 'clean' | 'infected' | 'suspicious' | 'error';

    @Column({ type: 'text', nullable: true, comment: 'スキャン詳細情報' })
    scanDetails: string;

    @Column({ type: 'timestamp', nullable: true, comment: 'スキャン実行日時' })
    scannedAt: Date;

    @Column({ type: 'boolean', default: false, comment: '削除フラグ' })
    isDeleted: boolean;

    @Column({ type: 'timestamp', nullable: true, comment: '削除日時' })
    deletedAt: Date;

    @Column({ type: 'uuid', nullable: true, comment: '削除実行者ID' })
    deletedBy: string;

    @Column({ type: 'json', nullable: true, comment: 'メタデータ（追加情報）' })
    metadata: Record<string, any>;

    @CreateDateColumn({ comment: '作成日時' })
    createdAt: Date;

    @UpdateDateColumn({ comment: '更新日時' })
    updatedAt: Date;

    // リレーション
    @ManyToOne(() => Inquiry, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'inquiryId' })
    inquiry: Inquiry;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'uploadedBy' })
    uploader: User;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'deletedBy' })
    deleter: User;
}