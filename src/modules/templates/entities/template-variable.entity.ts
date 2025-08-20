import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Template } from './template.entity';

/**
 * テンプレート変数エンティティ
 * テンプレート内で使用される動的変数を管理
 */
@Entity('template_variables')
export class TemplateVariable {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'template_id' })
    templateId: string;

    @Column({ length: 100 })
    name: string;

    @Column({
        type: 'enum',
        enum: ['text', 'number', 'date', 'boolean', 'select'],
        default: 'text',
    })
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';

    @Column({ length: 500, nullable: true })
    description: string;

    @Column({ name: 'default_value', nullable: true })
    defaultValue: string;

    @Column({ default: false })
    required: boolean;

    @Column('simple-array', { nullable: true })
    options: string[];

    @Column({ name: 'order_index', default: 0 })
    orderIndex: number;

    @ManyToOne(() => Template, template => template.variables, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'template_id' })
    template: Template;
}