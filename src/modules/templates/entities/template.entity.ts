import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../users/entities';
import { TemplateUsage } from './template-usage.entity';
import { TemplateVariable } from './template-variable.entity';

/**
 * テンプレートエンティティ
 * 回答テンプレートの基本情報を管理
 */
@Entity('templates')
@Index(['category'])
@Index(['isShared'])
@Index(['createdBy'])
export class Template {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 100 })
    category: string;

    @Column('text')
    content: string;

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column({ name: 'is_shared', default: false })
    isShared: boolean;

    @Column({ name: 'usage_count', default: 0 })
    usageCount: number;

    @Column({ name: 'created_by' })
    createdBy: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @OneToMany(() => TemplateUsage, usage => usage.template)
    usages: TemplateUsage[];

    @OneToMany(() => TemplateVariable, variable => variable.template, {
        cascade: true,
        eager: true,
    })
    variables: TemplateVariable[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}