/**
 * 問い合わせ状態履歴エンティティ
 * 要件2: 問い合わせ状態変更履歴の記録に対応
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Inquiry, InquiryStatus } from './inquiry.entity';
import { User } from '../../users/entities/user.entity';

@Entity('inquiry_status_history')
@Index(['inquiryId', 'changedAt'])
export class InquiryStatusHistory extends BaseEntity {
    @Column({
        type: 'uuid',
        comment: '問い合わせID'
    })
    inquiryId: string;

    @Column({
        type: 'enum',
        enum: ['new', 'in_progress', 'pending', 'resolved', 'closed'],
        nullable: true,
        comment: '変更前の状態'
    })
    oldStatus?: InquiryStatus;

    @Column({
        type: 'enum',
        enum: ['new', 'in_progress', 'pending', 'resolved', 'closed'],
        comment: '変更後の状態'
    })
    newStatus: InquiryStatus;

    @Column({
        type: 'uuid',
        comment: '変更実行者ID'
    })
    changedBy: string;

    @Column({
        type: 'text',
        nullable: true,
        comment: '変更理由・コメント'
    })
    comment?: string;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        comment: '変更日時'
    })
    changedAt: Date;

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
        comment: '変更実行IPアドレス'
    })
    ipAddress?: string;

    @Column({
        type: 'jsonb',
        default: '{}',
        comment: '追加メタデータ（JSON）'
    })
    metadata: Record<string, any>;

    // リレーション
    @ManyToOne(() => Inquiry, inquiry => inquiry.statusHistory)
    @JoinColumn({ name: 'inquiryId' })
    inquiry: Inquiry;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'changedBy' })
    changedByUser: User;
}