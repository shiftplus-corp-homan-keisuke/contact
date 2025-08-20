/**
 * 回答履歴エンティティ
 * 要件2: 回答更新履歴の保持に対応
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Response } from './response.entity';
import { User } from '../../users/entities/user.entity';

@Entity('response_history')
@Index(['responseId', 'changedAt'])
export class ResponseHistory extends BaseEntity {
    @Column({
        type: 'uuid',
        comment: '回答ID'
    })
    responseId: string;

    @Column({
        type: 'text',
        nullable: true,
        comment: '変更前の内容'
    })
    oldContent?: string;

    @Column({
        type: 'text',
        comment: '変更後の内容'
    })
    newContent: string;

    @Column({
        type: 'uuid',
        comment: '変更実行者ID'
    })
    changedBy: string;

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
        type: 'text',
        nullable: true,
        comment: '変更理由・コメント'
    })
    comment?: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
        comment: '変更タイプ（create, update, delete）'
    })
    changeType?: string;

    @Column({
        type: 'jsonb',
        default: '{}',
        comment: '変更詳細メタデータ（JSON）'
    })
    metadata: Record<string, any>;

    // リレーション
    @ManyToOne(() => Response, response => response.history)
    @JoinColumn({ name: 'responseId' })
    response: Response;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'changedBy' })
    changedByUser: User;
}