/**
 * アプリケーションエンティティ
 * 要件1: 問い合わせ登録機能の対象アプリ管理に対応
 */

import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Inquiry } from './inquiry.entity';

@Entity('applications')
@Index(['name'], { unique: true })
export class Application extends BaseEntity {
    @Column({
        type: 'varchar',
        length: 255,
        unique: true,
        comment: 'アプリケーション名'
    })
    name: string;

    @Column({
        type: 'text',
        nullable: true,
        comment: 'アプリケーションの説明'
    })
    description?: string;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        unique: true,
        comment: 'APIキー'
    })
    apiKey?: string;

    @Column({
        type: 'boolean',
        default: true,
        comment: 'アクティブフラグ'
    })
    isActive: boolean;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: '担当者メールアドレス'
    })
    contactEmail?: string;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: '担当者名'
    })
    contactName?: string;

    @Column({
        type: 'jsonb',
        default: '{}',
        comment: 'アプリケーション設定（JSON）'
    })
    settings: Record<string, any>;

    // リレーション
    @OneToMany(() => Inquiry, inquiry => inquiry.app)
    inquiries: Inquiry[];
}