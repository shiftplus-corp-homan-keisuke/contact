import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FAQ } from '../entities';
import { FAQFilters } from '../types';

@Injectable()
export class FAQsRepository {
    constructor(
        @InjectRepository(FAQ)
        private readonly faqRepository: Repository<FAQ>,
    ) { }

    async create(faqData: Partial<FAQ>): Promise<FAQ> {
        const faq = this.faqRepository.create(faqData);
        return this.faqRepository.save(faq);
    }

    async findById(id: string): Promise<FAQ | null> {
        return this.faqRepository.findOne({
            where: { id },
            relations: ['application'],
        });
    }

    async findByAppId(appId: string, filters?: FAQFilters): Promise<FAQ[]> {
        const queryBuilder = this.createFilteredQuery(filters);
        queryBuilder.andWhere('faq.appId = :appId', { appId });

        return queryBuilder
            .orderBy('faq.orderIndex', 'ASC')
            .addOrderBy('faq.createdAt', 'DESC')
            .getMany();
    }

    async findAll(filters?: FAQFilters): Promise<FAQ[]> {
        const queryBuilder = this.createFilteredQuery(filters);

        return queryBuilder
            .orderBy('faq.orderIndex', 'ASC')
            .addOrderBy('faq.createdAt', 'DESC')
            .getMany();
    }

    async update(id: string, updateData: Partial<FAQ>): Promise<FAQ | null> {
        await this.faqRepository.update(id, updateData);
        return this.findById(id);
    }

    async delete(id: string): Promise<void> {
        await this.faqRepository.delete(id);
    }

    /**
     * アプリ別FAQ件数取得
     * 要件7.2: FAQ取得APIの実装
     */
    async countByAppId(appId: string, filters?: FAQFilters): Promise<number> {
        const queryBuilder = this.createFilteredQuery(filters);
        queryBuilder.andWhere('faq.appId = :appId', { appId });
        return queryBuilder.getCount();
    }

    /**
     * アプリ別カテゴリ一覧取得
     * 要件7.2: FAQ取得APIの実装
     */
    async findCategoriesByAppId(appId: string, filters?: FAQFilters): Promise<string[]> {
        const queryBuilder = this.faqRepository
            .createQueryBuilder('faq')
            .select('DISTINCT faq.category', 'category')
            .where('faq.appId = :appId', { appId })
            .andWhere('faq.category IS NOT NULL')
            .andWhere('faq.category != \'\'');

        if (filters?.isPublished !== undefined) {
            queryBuilder.andWhere('faq.isPublished = :isPublished', {
                isPublished: filters.isPublished,
            });
        }

        const results = await queryBuilder.getRawMany();
        return results.map(result => result.category).filter(Boolean);
    }

    /**
     * 人気FAQ一覧取得（アクセス数順）
     * 要件7.2: FAQ取得APIの実装
     */
    async findPopularByAppId(appId: string, limit: number): Promise<FAQ[]> {
        return this.faqRepository
            .createQueryBuilder('faq')
            .leftJoinAndSelect('faq.application', 'application')
            .where('faq.appId = :appId', { appId })
            .andWhere('faq.isPublished = :isPublished', { isPublished: true })
            .orderBy('faq.viewCount', 'DESC')
            .addOrderBy('faq.createdAt', 'DESC')
            .limit(limit)
            .getMany();
    }

    /**
     * 最新FAQ一覧取得（更新日時順）
     * 要件7.2: FAQ取得APIの実装
     */
    async findRecentByAppId(appId: string, limit: number): Promise<FAQ[]> {
        return this.faqRepository
            .createQueryBuilder('faq')
            .leftJoinAndSelect('faq.application', 'application')
            .where('faq.appId = :appId', { appId })
            .andWhere('faq.isPublished = :isPublished', { isPublished: true })
            .orderBy('faq.updatedAt', 'DESC')
            .limit(limit)
            .getMany();
    }

    /**
     * 複数FAQ一括更新
     * 要件7.2: FAQ取得APIの実装
     */
    async bulkUpdate(ids: string[], updateData: Partial<FAQ>): Promise<FAQ[]> {
        await this.faqRepository
            .createQueryBuilder()
            .update(FAQ)
            .set(updateData)
            .where('id IN (:...ids)', { ids })
            .execute();

        return this.faqRepository
            .createQueryBuilder('faq')
            .leftJoinAndSelect('faq.application', 'application')
            .where('faq.id IN (:...ids)', { ids })
            .getMany();
    }

    /**
     * フィルター条件付きクエリビルダー作成
     */
    private createFilteredQuery(filters?: FAQFilters): SelectQueryBuilder<FAQ> {
        const queryBuilder = this.faqRepository
            .createQueryBuilder('faq')
            .leftJoinAndSelect('faq.application', 'application');

        if (!filters) {
            return queryBuilder;
        }

        if (filters.isPublished !== undefined) {
            queryBuilder.andWhere('faq.isPublished = :isPublished', {
                isPublished: filters.isPublished,
            });
        }

        if (filters.category) {
            queryBuilder.andWhere('faq.category = :category', {
                category: filters.category,
            });
        }

        if (filters.tags && filters.tags.length > 0) {
            queryBuilder.andWhere('faq.tags && :tags', {
                tags: filters.tags,
            });
        }

        if (filters.search) {
            queryBuilder.andWhere(
                '(faq.question ILIKE :search OR faq.answer ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }

        if (filters.offset !== undefined) {
            queryBuilder.offset(filters.offset);
        }

        if (filters.limit !== undefined) {
            queryBuilder.limit(filters.limit);
        }

        return queryBuilder;
        await this.faqRepository.delete(id);
    }

    async findPublishedByAppId(appId: string): Promise<FAQ[]> {
        return this.faqRepository.find({
            where: {
                appId,
                isPublished: true
            },
            order: {
                orderIndex: 'ASC',
                createdAt: 'DESC',
            },
        });
    }

    async getCategories(appId?: string): Promise<string[]> {
        const queryBuilder = this.faqRepository
            .createQueryBuilder('faq')
            .select('DISTINCT faq.category', 'category')
            .where('faq.category IS NOT NULL');

        if (appId) {
            queryBuilder.andWhere('faq.appId = :appId', { appId });
        }

        const results = await queryBuilder.getRawMany();
        return results.map(result => result.category).filter(Boolean);
    }

    async getTags(appId?: string): Promise<string[]> {
        const queryBuilder = this.faqRepository
            .createQueryBuilder('faq')
            .select('faq.tags', 'tags')
            .where('faq.tags IS NOT NULL');

        if (appId) {
            queryBuilder.andWhere('faq.appId = :appId', { appId });
        }

        const results = await queryBuilder.getMany();
        const allTags = results.flatMap(faq => faq.tags || []);
        return [...new Set(allTags)];
    }

    private createFilteredQuery(filters?: FAQFilters): SelectQueryBuilder<FAQ> {
        const queryBuilder = this.faqRepository
            .createQueryBuilder('faq')
            .leftJoinAndSelect('faq.application', 'application');

        if (!filters) {
            return queryBuilder;
        }

        if (filters.appId) {
            queryBuilder.andWhere('faq.appId = :appId', { appId: filters.appId });
        }

        if (filters.category) {
            queryBuilder.andWhere('faq.category = :category', { category: filters.category });
        }

        if (filters.isPublished !== undefined) {
            queryBuilder.andWhere('faq.isPublished = :isPublished', { isPublished: filters.isPublished });
        }

        if (filters.tags && filters.tags.length > 0) {
            queryBuilder.andWhere('faq.tags && :tags', { tags: filters.tags });
        }

        if (filters.search) {
            queryBuilder.andWhere(
                '(faq.question ILIKE :search OR faq.answer ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }

        return queryBuilder;
    }
}