import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Inquiry } from './inquiry.entity';
import { User } from './user.entity';

/**
 * ファイルエンティティ
 * 問い合わせに関連するファイルの情報を管理
 */
@Entity('files')
@Index(['inquiryId', 'isDeleted'])
@Index(['uploadedBy', 'uploadedAt'])
@Index(['mimeType'])
export class File extends BaseEntity {
  /**
   * ファイル名
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  filename: string;

  /**
   * 元のファイル名（アップロード時の名前）
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  originalFilename: string;

  /**
   * ファイルサイズ（バイト）
   */
  @Column({ type: 'bigint', nullable: false })
  size: number;

  /**
   * MIMEタイプ
   */
  @Column({ type: 'varchar', length: 100, nullable: false })
  mimeType: string;

  /**
   * ファイルの保存パス
   */
  @Column({ type: 'varchar', length: 500, nullable: false })
  filePath: string;

  /**
   * ファイルのハッシュ値（重複チェック用）
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  fileHash: string;

  /**
   * 関連する問い合わせID
   */
  @Column({ type: 'uuid', nullable: false })
  inquiryId: string;

  /**
   * アップロードしたユーザーID
   */
  @Column({ type: 'uuid', nullable: false })
  uploadedBy: string;

  /**
   * アップロード日時
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  uploadedAt: Date;

  /**
   * ウイルススキャン済みフラグ
   */
  @Column({ type: 'boolean', default: false })
  isScanned: boolean;

  /**
   * スキャン結果
   */
  @Column({ 
    type: 'enum', 
    enum: ['clean', 'infected', 'suspicious', 'pending'],
    default: 'pending'
  })
  scanResult: 'clean' | 'infected' | 'suspicious' | 'pending';

  /**
   * スキャン日時
   */
  @Column({ type: 'timestamp', nullable: true })
  scannedAt: Date;

  /**
   * ファイルが削除されているかどうか
   */
  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  /**
   * 削除日時
   */
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  /**
   * 削除したユーザーID
   */
  @Column({ type: 'uuid', nullable: true })
  deletedBy: string;

  /**
   * ファイルの説明・コメント
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * ダウンロード回数
   */
  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  /**
   * 最終ダウンロード日時
   */
  @Column({ type: 'timestamp', nullable: true })
  lastDownloadedAt: Date;

  /**
   * 有効期限
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  // リレーション
  @ManyToOne(() => Inquiry, inquiry => inquiry.files)
  @JoinColumn({ name: 'inquiryId' })
  inquiry: Inquiry;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedBy' })
  uploader: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'deletedBy' })
  deleter: User;
}