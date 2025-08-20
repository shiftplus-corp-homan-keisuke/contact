/**
 * 回答エンティティ
 * 要件2: 問い合わせ・回答管理機能に対応
 */

import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { User } from '../../users/entities/user.entity';
import { ResponseHistory } from './response-history.entity';

@Entity('responses')
@Index(['inquiryId', 'createdAt'])
@Index(['userId'])
export class Response extends BaseEntity {
    @Column({
        type: 'uuid',
        comment: '問い合わせID'
    })
    inquiryId: string;

    @Column({
        type: 'uuid',
        comment: '回答者ID'
    })
    userId: string;

    @Column({
        type: 'text',
        comment: '回答内容'
    })
    content: string;

    @Column({
        type: 'boolean',
        default: false,
        comment: '公開フラグ（FAQなどで公開可能か）'
    })
    isPublic: boolean;

    @Column({
        type: 'boolean',
        default: false,
        comment: '内部メモフラグ'
    })
    isInternal: boolean;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
        comment: '回答タイプ（answer, note, escalation）'
    })
    responseType?: string;

    @Column({
        type: 'integer',
        nullable: true,
        comment: '回答時間（分）'
    })
    responseTimeMinutes?: number;

    @Column({
        type: 'jsonb',
        default: '{}',
        comment: 'メタデータ（JSON）'
    })
    metadata: Record<string, any>;

    @Column({
        type: 'jsonb',
        default: '[]',
        comment: '添付ファイルID一覧（JSON配列）'
    })
    attachmentIds: string[];

    // リレーション
    @ManyToOne(() => Inquiry)
    @JoinColumn({ name: 'inquiryId' })
    inquiry: Inquiry;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @OneToMany(() => ResponseHistory, history => history.response)
    history: ResponseHistory[];
}