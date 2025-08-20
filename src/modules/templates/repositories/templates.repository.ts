import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Template } from '../entities';
import { TemplateFilters } from '../types';
import { PaginatedResult } from '../../../common/types';

/**
 * テンプレートリポジトリ
 * テンプレートデータの永続化とクエリを担当
 */
@Injectable()
export class TemplatesRepository {
    constructor(
        @InjectRepository(Template)
        private readonly templateRepository: Repository<Template>,
    ) { }

    /**
     * テンプレートを作成
     */
    async create(templateData: Partial<Template>): Promise<Template> {
        const template = this.templateRepository.create(templateData);
        return await this.templateRepository.save(template);
    }

    /**
     * IDでテンプレートを取得
     */
    async findById(id: string): Promise<Template | null> {
        return await this.templateRepository.findOne({
            where: { id },
            relations: ['variables', 'creator'],
        });
    }

    /**
     * テンプレートを更新
     */
    async update(id: string, updateData: Partial<Template>): Promise<Template> {
        await this.templateRepository.update(id, updateData);
        return await this.findById(id);
    }

    /**
     * テンプレートを削除
     */
    async delete(id: string): Promise<void> {
        await this.templateRepository.delete(id);
    }

    /**
     * フィルタ条件でテンプレートを検索
     */
    async findWithFilters(
        filters: TemplateFilters,
        page: number = 1,
        limit: number = 20,
    ): Promise<PaginatedResult<Template>> {
        const queryBuilder = this.createFilteredQuery(filters);

        // ページネーション
        const offset = (page - 1) * limit;
        queryBuilder.skip(offset).take(limit);

        // 結果取得
        const [items, total] = await queryBuilder.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * カテゴリ別テンプレート数を取得
     */
    async getCategoryStats(): Promise<Array<{ category: string; count: number }>> {
        return await this.templateRepository
            .createQueryBuilder('template')
            .select('template.category', 'category')
            .addSelect('COUNT(*)', 'count')
            .groupBy('template.category')
            .orderBy('count', 'DESC')
            .getRawMany();
    }

    /**
     * 人気テンプレートを取得
     */
    async getPopularTemplates(limit: number = 10): Promise<Template[]> {
        return await this.templateRepository.find({
            relations: ['variables', 'creator'],
            order: { usageCount: 'DESC' },
            take: limit,
        });
    }

    /**
     * ユーザーのテンプレートを取得
     */
    async findByUserId(
        userId: string,
        includeShared: boolean = true,
    ): Promise<Template[]> {
        const queryBuilder = this.templateRepository
            .createQueryBuilder('template')
            .leftJoinAndSelect('template.variables', 'variables')
            .leftJoinAndSelect('template.creator', 'creator');

        if (includeShared) {
            queryBuilder.where(
                '(template.createdBy = :userId OR template.isShared = true)',
                { userId },
            );
        } else {
            queryBuilder.where('template.createdBy = :userId', { userId });
        }

        return await queryBuilder
            .orderBy('template.updatedAt', 'DESC')
            .getMany();
    }

    /**
     * 使用回数を増加
     */
    async incrementUsageCount(id: string): Promise<void> {
        await this.templateRepository.increment({ id }, 'usageCount', 1);
    }

    /**
     * フィルタ条件に基づくクエリビルダーを作成
     */
    private createFilteredQuery(filters: TemplateFilters): SelectQueryBuilder<Template> {
        const queryBuilder = this.templateRepository
            .createQueryBuilder('template')
            .leftJoinAndSelect('template.variables', 'variables')
            .leftJoinAndSelect('template.creator', 'creator');

        // カテゴリフィルタ
        if (filters.category) {
            queryBuilder.andWhere('template.category = :category', {
                category: filters.category,
            });
        }

        // 共有フラグフィルタ
        if (filters.isShared !== undefined) {
            queryBuilder.andWhere('template.isShared = :isShared', {
                isShared: filters.isShared,
            });
        }

        // 作成者フィルタ
        if (filters.createdBy) {
            queryBuilder.andWhere('template.createdBy = :createdBy', {
                createdBy: filters.createdBy,
            });
        }

        // タグフィルタ
        if (filters.tags && filters.tags.length > 0) {
            const tagConditions = filters.tags.map((_, index) =>
                `template.tags LIKE :tag${index}`
            ).join(' OR ');

            queryBuilder.andWhere(`(${tagConditions})`);

            filters.tags.forEach((tag, index) => {
                queryBuilder.setParameter(`tag${index}`, `%${tag}%`);
            });
        }

        // 検索クエリ
        if (filters.searchQuery) {
            queryBuilder.andWhere(
                '(template.name ILIKE :searchQuery OR template.content ILIKE :searchQuery)',
                { searchQuery: `%${filters.searchQuery}%` },
            );
        }

        return queryBuilder.orderBy('template.updatedAt', 'DESC');
    }
}