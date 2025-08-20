import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * 認証試行ログエンティティ
 * 要件4.4: 無効な認証情報でのアクセス試行ログ記録
 */
@Entity('auth_attempts')
export class AuthAttempt extends BaseEntity {
    @Column({
        type: 'varchar',
        length: 255,
        comment: 'ログイン試行されたメールアドレス',
    })
    email: string;

    @Column({
        type: 'inet',
        nullable: true,
        comment: 'IPアドレス',
    })
    ipAddress?: string;

    @Column({
        type: 'text',
        nullable: true,
        comment: 'ユーザーエージェント',
    })
    userAgent?: string;

    @Column({
        type: 'boolean',
        comment: '認証成功フラグ',
    })
    success: boolean;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: '失敗理由',
    })
    failureReason?: string;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        comment: '試行日時',
    })
    attemptedAt: Date;
}