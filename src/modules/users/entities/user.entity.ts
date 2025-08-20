import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from './role.entity';
import { UserHistory } from './user-history.entity';

/**
 * ユーザーエンティティ
 * 要件4: ユーザー管理機能
 */
@Entity('users')
export class User extends BaseEntity {
    @Column({
        type: 'varchar',
        length: 255,
        unique: true,
        comment: 'メールアドレス（ログインID）',
    })
    email: string;

    @Column({
        type: 'varchar',
        length: 255,
        comment: 'パスワードハッシュ',
    })
    @Exclude() // レスポンスから除外
    passwordHash: string;

    @Column({
        type: 'varchar',
        length: 255,
        comment: 'ユーザー名',
    })
    name: string;

    @Column({
        type: 'uuid',
        comment: '役割ID',
    })
    roleId: string;

    @Column({
        type: 'boolean',
        default: true,
        comment: 'アクティブフラグ',
    })
    isActive: boolean;

    @Column({
        type: 'timestamp',
        nullable: true,
        comment: '最終ログイン日時',
    })
    lastLoginAt?: Date;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: 'プロフィール画像URL',
    })
    profileImageUrl?: string;

    @Column({
        type: 'varchar',
        length: 20,
        nullable: true,
        comment: '電話番号',
    })
    phoneNumber?: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
        comment: '部署名',
    })
    department?: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
        comment: '役職',
    })
    position?: string;

    // リレーション
    @ManyToOne(() => Role, { eager: true })
    @JoinColumn({ name: 'roleId' })
    role: Role;

    @OneToMany(() => UserHistory, (history) => history.user)
    history: UserHistory[];
}