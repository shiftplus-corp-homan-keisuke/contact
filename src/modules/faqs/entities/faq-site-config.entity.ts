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

@Entity('faq_site_configs')
@Index(['appId'], { unique: true })
export class FAQSiteConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'app_id' })
    appId: string;

    @ManyToOne(() => Application)
    @JoinColumn({ name: 'app_id' })
    application: Application;

    @Column({ name: 'site_title' })
    siteTitle: string;

    @Column({ name: 'site_description', type: 'text', nullable: true })
    siteDescription: string;

    @Column({ default: 'default' })
    theme: string;

    @Column({ name: 'custom_css', type: 'text', nullable: true })
    customCss: string;

    @Column({ name: 'logo_url', nullable: true })
    logoUrl: string;

    @Column({ name: 'footer_text', nullable: true })
    footerText: string;

    @Column({ name: 'enable_search', default: true })
    enableSearch: boolean;

    @Column({ name: 'enable_category_filter', default: true })
    enableCategoryFilter: boolean;

    @Column({ name: 'is_published', default: false })
    isPublished: boolean;

    @Column({ name: 'site_url', nullable: true })
    siteUrl: string;

    @Column({ name: 'last_generated_at', nullable: true })
    lastGeneratedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}