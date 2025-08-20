import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

/**
 * 役割エンティティ
 * 要件5: 権限管理機能（RBAC）
 */
@Entity('roles')
export class Role extends BaseEntity {
    @Column({
        type: 'varchar',
        length: 100,
        unique: true,
        comment: '役割名',
    })
    name: string;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: '役割の説明',
    })
    description?: string;

    @Column({
        type: 'jsonb',
        comment: '権限リスト',
    })
    permissions: string[];

    @Column({
        type: 'boolean',
        default: true,
        comment: 'アクティブフラグ',
    })
    isActive: boolean;

    @Column({
        type: 'integer',
        default: 0,
        comment: '表示順序',
    })
    sortOrder: number;

    // リレーション
    @OneToMany(() => User, (user) => user.role)
    users: User[];
}