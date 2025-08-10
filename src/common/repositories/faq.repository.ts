/**
 * FAQリポジトリ
 * 要件: 6.3, 6.4 (FAQ管理機能)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { FAQ } from '../entities/faq.entity';
import { BaseRepository } from './base.repository';

export interface FAQFilters {
  appId?: string;
  category?: string;
  isPublished?: boolean;
  tags?: string[];
}

export interface FAQSearchOptions {
  query?: string;
  filters?: FAQFilters;
  sortBy?: 'createdAt' | 'updatedAt' | 'orderIndex';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

@Injectable()
export class FAQRepository extends BaseRepository<FAQ> {
  constructor(
    @InjectRepository(FAQ)
    private readonly faqRepository: Repository<FAQ>,
  ) {
    super(faqRepository);
  }

  /**
   * アプリ別FAQ取得
   */
  async findByAppId(appId: string, options?: FAQSearchOptions): Promise<FAQ[]> {
    const queryBuilder = this.faqRepository
      .createQueryBuilder('faq')
      .leftJoinAndSelect('faq.application', 'application')
      .where('faq.appId = :appId', { appId });

    // フィルター適用
    if (options?.filters) {
      const { category, isPublished, tags } = options.filters;

      if (category) {
        queryBuilder.andWhere('faq.category = :category', { category });
      }

      if (isPublished !== undefined) {
        queryBuilder.andWhere('faq.isPublished = :isPublished', { isPublished });
      }

      if (tags && tags.length > 0) {
        queryBuilder.andWhere('faq.tags && :tags', { tags });
      }
    }

    // 検索クエリ適用
    if (options?.query) {
      queryBuilder.andWhere(
        '(faq.question ILIKE :query OR faq.answer ILIKE :query)',
        { query: `%${options.query}%` }
      );
    }

    // ソート適用
    const sortBy = options?.sortBy || 'orderIndex';
    const sortOrder = options?.sortOrder || 'ASC';
    queryBuilder.orderBy(`faq.${sortBy}`, sortOrder);

    // ページネーション適用
    if (options?.page && options?.limit) {
      const skip = (options.page - 1) * options.limit;
      queryBuilder.skip(skip).take(options.limit);
    }

    return queryBuilder.getMany();
  }

  /**
   * 公開済みFAQ取得
   */
  async findPublishedByAppId(appId: string): Promise<FAQ[]> {
    return this.findByAppId(appId, {
      filters: { isPublished: true },
      sortBy: 'orderIndex',
      sortOrder: 'ASC'
    });
  }

  /**
   * カテゴリ別FAQ取得
   */
  async findByCategory(appId: string, category: string): Promise<FAQ[]> {
    return this.findByAppId(appId, {
      filters: { category, isPublished: true },
      sortBy: 'orderIndex',
      sortOrder: 'ASC'
    });
  }

  /**
   * FAQ検索（全文検索）
   */
  async searchFAQs(options: FAQSearchOptions): Promise<{ items: FAQ[]; total: number }> {
    const queryBuilder = this.faqRepository
      .createQueryBuilder('faq')
      .leftJoinAndSelect('faq.application', 'application');

    // フィルター適用
    if (options.filters?.appId) {
      queryBuilder.andWhere('faq.appId = :appId', { appId: options.filters.appId });
    }

    if (options.filters?.category) {
      queryBuilder.andWhere('faq.category = :category', { category: options.filters.category });
    }

    if (options.filters?.isPublished !== undefined) {
      queryBuilder.andWhere('faq.isPublished = :isPublished', { isPublished: options.filters.isPublished });
    }

    if (options.filters?.tags && options.filters.tags.length > 0) {
      queryBuilder.andWhere('faq.tags && :tags', { tags: options.filters.tags });
    }

    // 検索クエリ適用
    if (options.query) {
      queryBuilder.andWhere(
        '(faq.question ILIKE :query OR faq.answer ILIKE :query OR faq.category ILIKE :query)',
        { query: `%${options.query}%` }
      );
    }

    // 総件数取得
    const total = await queryBuilder.getCount();

    // ソート適用
    const sortBy = options.sortBy || 'updatedAt';
    const sortOrder = options.sortOrder || 'DESC';
    queryBuilder.orderBy(`faq.${sortBy}`, sortOrder);

    // ページネーション適用
    if (options.page && options.limit) {
      const skip = (options.page - 1) * options.limit;
      queryBuilder.skip(skip).take(options.limit);
    }

    const items = await queryBuilder.getMany();

    return { items, total };
  }

  /**
   * 最大orderIndex取得
   */
  async getMaxOrderIndex(appId: string): Promise<number> {
    const result = await this.faqRepository
      .createQueryBuilder('faq')
      .select('MAX(faq.orderIndex)', 'maxOrder')
      .where('faq.appId = :appId', { appId })
      .getRawOne();

    return result?.maxOrder || 0;
  }

  /**
   * orderIndex更新
   */
  async updateOrderIndexes(updates: { id: string; orderIndex: number }[]): Promise<void> {
    const queryRunner = this.faqRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const update of updates) {
        await queryRunner.manager.update(FAQ, update.id, { orderIndex: update.orderIndex });
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 公開状態一括更新
   */
  async bulkUpdatePublishStatus(ids: string[], isPublished: boolean): Promise<void> {
    await this.faqRepository
      .createQueryBuilder()
      .update(FAQ)
      .set({ isPublished })
      .where('id IN (:...ids)', { ids })
      .execute();
  }

  /**
   * アプリ別FAQ統計取得
   */
  async getFAQStatistics(appId: string): Promise<{
    total: number;
    published: number;
    unpublished: number;
    categories: { category: string; count: number }[];
  }> {
    const [total, published, categories] = await Promise.all([
      this.faqRepository.count({ where: { appId } }),
      this.faqRepository.count({ where: { appId, isPublished: true } }),
      this.faqRepository
        .createQueryBuilder('faq')
        .select('faq.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('faq.appId = :appId', { appId })
        .andWhere('faq.category IS NOT NULL')
        .groupBy('faq.category')
        .getRawMany()
    ]);

    return {
      total,
      published,
      unpublished: total - published,
      categories: categories.map(c => ({ category: c.category, count: parseInt(c.count) }))
    };
  }
}