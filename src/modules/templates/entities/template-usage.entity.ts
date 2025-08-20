import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
    Index,
} from 'typeorm';
import { Template } from './template.entity';
import { User } from '../../users/entities';
import { Inquiry } from '../../inquiries/entities';

/**
 * テンプレート使用履歴エンティティ
 * テンプレートの使用状況を追跡
 */
@Entity('template_usage')
@Index(['templateId'])
@Index(['userId'])
@Index(['usedAt'])
export class TemplateUsage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'template_id' })
    templateId: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'inquiry_id', nullable: true })
    inquiryId: string;

    @Column({ name: 'rating', nullable: true })
    rating: number; // 1-5の評価

    @Column({ length: 500, nullable: true })
    feedback: string;

    @Column('jsonb', { name: 'used_variables', default: {} })
    usedVariables: Record<string, string>;

    @Column('jsonb', { name: 'used_macros', default: [] })
    usedMacros: string[];

    @Column({ name: 'expanded_content', type: 'text', nullable: true })
    expandedContent: string;

    @CreateDateColumn({ name: 'used_at' })
    usedAt: Date;

    @ManyToOne(() => Template, template => template.usages)
    @JoinColumn({ name: 'template_id' })
    template: Template;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Inquiry, { nullable: true })
    @JoinColumn({ name: 'inquiry_id' })
    inquiry: Inquiry;
}