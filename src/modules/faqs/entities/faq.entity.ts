import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { Application } from '../../inquiries/entities/application.entity';

@Entity('faqs')
@Index(['appId', 'isPublished'])
@Index(['category'])
export class FAQ {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'app_id' })
    appId: string;

    @ManyToOne(() => Application)
    @JoinColumn({ name: 'app_id' })
    application: Application;

    @Column({ type: 'text' })
    question: string;

    @Column({ type: 'text' })
    answer: string;

    @Column({ length: 100, nullable: true })
    category: string;

    @Column({ name: 'order_index', default: 0 })
    orderIndex: number;

    @Column({ name: 'is_published', default: false })
    isPublished: boolean;

    @Column('simple-array', { nullable: true })
    tags: string[];

    @Column({ name: 'view_count', default: 0 })
    viewCount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}