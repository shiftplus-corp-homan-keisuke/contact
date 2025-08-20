/**
 * 基底エンティティクラス
 * 全てのエンティティで共通する基本フィールドを定義
 */

import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Column
} from 'typeorm';

/**
 * 基本エンティティ（ID、作成日時、更新日時）
 */
export abstract class BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        comment: '作成日時'
    })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
        comment: '更新日時'
    })
    updatedAt: Date;
}

/**
 * ソフトデリート対応エンティティ
 */
export abstract class SoftDeleteEntity extends BaseEntity {
    @DeleteDateColumn({
        type: 'timestamp',
        nullable: true,
        comment: '削除日時'
    })
    deletedAt?: Date;
}

/**
 * 作成者・更新者追跡エンティティ
 */
export abstract class AuditableEntity extends BaseEntity {
    @Column({
        type: 'uuid',
        nullable: true,
        comment: '作成者ID'
    })
    createdBy?: string;

    @Column({
        type: 'uuid',
        nullable: true,
        comment: '更新者ID'
    })
    updatedBy?: string;
}