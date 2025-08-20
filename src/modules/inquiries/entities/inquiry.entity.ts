/**
 * 問い合わせエンティティ
 * 要件1: 問い合わせ登録機能に対応
 * 要件2: 問い合わせ・回答管理機能に対応
 */

import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Application } from './application.entity';
import { User } from '../../users/entities/user.entity';
import { InquiryStatusHistory } from './inquiry-status-history.entity';

export type InquiryStatus = 'new' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type InquiryPriority = 'low' | 'medium' | 'high' | 'urgent';

@Entity('inquiries')
@Index(['appId', 'status'])
@Index(['assignedTo', 'status'])
@Index(['customerEmail'])
@Index(['createdAt'])
export class Inquiry extends BaseEntity {
    @Column({
        type: 'uuid',
        comment: '対象アプリケーションID'
    })
    appId: string;

    @Column({
        type: 'varchar',
        length: 500,
        comment: '問い合わせタイトル'
    })
    title: string;

    @Column({
        type: 'text',
        comment: '問い合わせ内容'
    })
    content: string;

    @Column({
        type: 'enum',
        enum: ['new', 'in_progress', 'pending', 'resolved', 'closed'],
        default: 'new',
        comment: '問い合わせ状態'
    })
    status: InquiryStatus;

    @Column({
        type: 'enum',
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        comment: '優先度'
    })
    priority: InquiryPriority;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
        comment: 'カテゴリ'
    })
    category?: string;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: '顧客メールアドレス'
    })
    customerEmail?: string;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: '顧客名'
    })
    customerName?: string;

    @Column({
        type: 'uuid',
        nullable: true,
        comment: '担当者ID'
    })
    assignedTo?: string;

    @Column({
        type: 'timestamp',
        nullable: true,
        comment: '初回回答日時'
    })
    firstResponseAt?: Date;

    @Column({
        type: 'timestamp',
        nullable: true,
        comment: '解決日時'
    })
    resolvedAt?: Date;

    @Column({
        type: 'timestamp',
        nullable: true,
        comment: 'クローズ日時'
    })
    closedAt?: Date;

    @Column({
        type: 'jsonb',
        default: '{}',
        comment: 'メタデータ（JSON）'
    })
    metadata: Record<string, any>;

    @Column({
        type: 'jsonb',
        default: '[]',
        comment: 'タグ（JSON配列）'
    })
    tags: string[];

    // リレーション
    @ManyToOne(() => Application, app => app.inquiries)
    @JoinColumn({ name: 'appId' })
    app: Application;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'assignedTo' })
    assignedUser?: User;

    @OneToMany(() => InquiryStatusHistory, history => history.inquiry)
    statusHistory: InquiryStatusHistory[];

    // 回答リレーション（FAQクラスタリングで使用）
    responses?: any[]; // 循環参照を避けるためanyを使用
}