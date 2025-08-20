import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../users/entities';

/**
 * マクロエンティティ
 * 動的コンテンツ生成のためのマクロ機能を管理
 */
@Entity('macros')
@Index(['createdBy'])
@Index(['name'])
export class Macro {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 500, nullable: true })
    description: string;

    @Column('text')
    content: string;

    @Column('jsonb', { default: {} })
    variables: Record<string, string>;

    @Column({ name: 'is_shared', default: false })
    isShared: boolean;

    @Column({ name: 'usage_count', default: 0 })
    usageCount: number;

    @Column({ name: 'created_by' })
    createdBy: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}