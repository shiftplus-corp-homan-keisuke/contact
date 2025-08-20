import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

/**
 * ユーザー履歴エンティティ
 * 要件4: ユーザー情報更新時の変更履歴記録
 */
@Entity('user_history')
export class UserHistory extends BaseEntity {
    @Column({
        type: 'uuid',
        comment: '対象ユーザーID',
    })
    userId: string;

    @Column({
        type: 'varchar',
        length: 100,
        comment: '変更されたフィールド名',
    })
    fieldName: string;

    @Column({
        type: 'text',
        nullable: true,
        comment: '変更前の値',
    })
    oldValue?: string;

    @Column({
        type: 'text',
        nullable: true,
        comment: '変更後の値',
    })
    newValue?: string;

    @Column({
        type: 'uuid',
        nullable: true,
        comment: '変更実行者ID',
    })
    changedBy?: string;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        comment: '変更日時',
    })
    changedAt: Date;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: '変更理由・コメント',
    })
    comment?: string;

    // リレーション
    @ManyToOne(() => User, (user) => user.history)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'changedBy' })
    changedByUser: User;
}