import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { User } from '../../users/entities/user.entity';

/**
 * エスカレーションエンティティ
 * 問い合わせのエスカレーション履歴を管理
 */
@Entity('escalations')
export class Escalation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'inquiry_id', type: 'uuid' })
    inquiryId: string;

    @ManyToOne(() => Inquiry)
    @JoinColumn({ name: 'inquiry_id' })
    inquiry: Inquiry;

    @Column({ name: 'escalated_from', type: 'uuid', nullable: true })
    escalatedFrom: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'escalated_from' })
    fromUser: User;

    @Column({ name: 'escalated_to', type: 'uuid' })
    escalatedTo: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'escalated_to' })
    toUser: User;

    @Column({ name: 'escalation_reason', type: 'varchar', length: 100 })
    escalationReason: 'sla_violation' | 'complexity' | 'manual' | 'priority_change';

    @Column({ name: 'escalation_level', type: 'integer' })
    escalationLevel: number;

    @Column({ name: 'comment', type: 'text', nullable: true })
    comment: string;

    @Column({ name: 'is_automatic', type: 'boolean', default: false })
    isAutomatic: boolean;

    @Column({ name: 'escalated_by', type: 'uuid', nullable: true })
    escalatedBy: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'escalated_by' })
    escalator: User;

    @CreateDateColumn({ name: 'escalated_at' })
    escalatedAt: Date;
}