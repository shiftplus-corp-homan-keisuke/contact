/**
 * テンプレートリポジトリ
 * 要件: 10.1, 10.2, 10.3 (テンプレート管理システム)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Template } from '../entities/template.entity';
import { TemplateVariable } from '../entities/template-variable.entity';
import { TemplateUsage } from '../entities/template-usage.entity';
import { TemplateSearchFilters } from '../types/template.types';

export interface TemplateSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  appId?: string;
  createdBy?: string;
  isShared?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class TemplateRepository {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(TemplateVariable)
    private readonly variableRepository: Repository<TemplateVariable>,
    @InjectRepository(TemplateUsage)
    private readonly usageRepository: Repository<TemplateUsage>,
  ) {}

  /**
   * テンプレート作成
   */
  async create(templateData: Partial<Template>): Promise<Template> {
    const template = this.templateRepository.create(templateData);
    return await this.templateRepository.save(template);
  }

  /**
   * テンプレート取得（ID指定）
   */
  async findById(id: string): Promise<Template | null> {
    return await this.templateRepository.findOne({
      where: { id },
      relations: ['creator', 'application', 'variables', 'usageHistory'],
    });
  }

  /**
   * テンプレート更新
   */
  async update(id: string, updateData: Partial<Template>): Promise<Template> {
    await this.templateRepository.update(id, updateData);
    return await this.findById(id);
  }

  /**
   * テンプレート削除（論理削除）
   */
  async softDelete(id: string): Promise<void> {
    await this.templateRepository.update(id, { isActive: false });
  }

  /**
   * テンプレート物理削除
   */
  async delete(id: string): Promise<void> {
    await this.templateRepository.delete(id);
  }

  /**
   * テンプレート検索
   */
  async search(options: TemplateSearchOptions): Promise<{ templates: Template[]; total: number }> {
    const queryBuilder = this.createSearchQueryBuilder(options);
    
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder
      .skip(offset)
      .take(limit);

    // ソート設定
    const sortBy = options.sortBy || 'updatedAt';
    const sortOrder = options.sortOrder || 'DESC';
    queryBuilder.orderBy(`template.${sortBy}`, sortOrder);

    const [templates, total] = await queryBuilder.getManyAndCount();

    return { templates, total };
  }

  /**
   * 人気テンプレート取得
   */
  async findPopularTemplates(limit: number = 10, appId?: string): Promise<Template[]> {
    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.creator', 'creator')
      .leftJoinAndSelect('template.application', 'application')
      .leftJoinAndSelect('template.variables', 'variables')
      .where('template.isActive = :isActive', { isActive: true })
      .orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.effectivenessScore', 'DESC')
      .take(limit);

    if (appId) {
      queryBuilder.andWhere('(template.appId = :appId OR template.appId IS NULL)', { appId });
    }

    return await queryBuilder.getMany();
  }

  /**
   * ユーザー別テンプレート取得
   */
  async findByUser(userId: string, options: TemplateSearchOptions = {}): Promise<Template[]> {
    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.creator', 'creator')
      .leftJoinAndSelect('template.application', 'application')
      .leftJoinAndSelect('template.variables', 'variables')
      .where('template.createdBy = :userId', { userId })
      .andWhere('template.isActive = :isActive', { isActive: true });

    if (options.category) {
      queryBuilder.andWhere('template.category = :category', { category: options.category });
    }

    if (options.appId) {
      queryBuilder.andWhere('template.appId = :appId', { appId: options.appId });
    }

    queryBuilder.orderBy('template.updatedAt', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * 共有テンプレート取得
   */
  async findSharedTemplates(options: TemplateSearchOptions = {}): Promise<Template[]> {
    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.creator', 'creator')
      .leftJoinAndSelect('template.application', 'application')
      .leftJoinAndSelect('template.variables', 'variables')
      .where('template.isShared = :isShared', { isShared: true })
      .andWhere('template.isActive = :isActive', { isActive: true });

    if (options.category) {
      queryBuilder.andWhere('template.category = :category', { category: options.category });
    }

    if (options.appId) {
      queryBuilder.andWhere('(template.appId = :appId OR template.appId IS NULL)', { appId: options.appId });
    }

    queryBuilder.orderBy('template.usageCount', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * カテゴリ別テンプレート数取得
   */
  async getTemplateCountByCategory(appId?: string): Promise<Record<string, number>> {
    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .select('template.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('template.isActive = :isActive', { isActive: true })
      .groupBy('template.category');

    if (appId) {
      queryBuilder.andWhere('(template.appId = :appId OR template.appId IS NULL)', { appId });
    }

    const results = await queryBuilder.getRawMany();
    
    return results.reduce((acc, result) => {
      acc[result.category || 'その他'] = parseInt(result.count);
      return acc;
    }, {});
  }

  /**
   * テンプレート使用回数更新
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    await this.templateRepository
      .createQueryBuilder()
      .update(Template)
      .set({ 
        usageCount: () => 'usage_count + 1',
        lastUsedAt: new Date()
      })
      .where('id = :id', { id: templateId })
      .execute();
  }

  /**
   * テンプレート効果スコア更新
   */
  async updateEffectivenessScore(templateId: string, score: number): Promise<void> {
    await this.templateRepository.update(templateId, { effectivenessScore: score });
  }

  /**
   * 検索クエリビルダー作成
   */
  private createSearchQueryBuilder(options: TemplateSearchOptions): SelectQueryBuilder<Template> {
    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.creator', 'creator')
      .leftJoinAndSelect('template.application', 'application')
      .leftJoinAndSelect('template.variables', 'variables')
      .where('template.isActive = :isActive', { isActive: options.isActive ?? true });

    // キーワード検索
    if (options.query) {
      queryBuilder.andWhere(
        '(template.name ILIKE :query OR template.content ILIKE :query OR template.description ILIKE :query)',
        { query: `%${options.query}%` }
      );
    }

    // カテゴリフィルター
    if (options.category) {
      queryBuilder.andWhere('template.category = :category', { category: options.category });
    }

    // タグフィルター
    if (options.tags && options.tags.length > 0) {
      queryBuilder.andWhere('template.tags && :tags', { tags: options.tags });
    }

    // アプリケーションフィルター
    if (options.appId) {
      queryBuilder.andWhere('(template.appId = :appId OR template.appId IS NULL)', { appId: options.appId });
    }

    // 作成者フィルター
    if (options.createdBy) {
      queryBuilder.andWhere('template.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    // 共有フィルター
    if (options.isShared !== undefined) {
      queryBuilder.andWhere('template.isShared = :isShared', { isShared: options.isShared });
    }

    return queryBuilder;
  }

  /**
   * テンプレート変数作成
   */
  async createVariable(variableData: Partial<TemplateVariable>): Promise<TemplateVariable> {
    const variable = this.variableRepository.create(variableData);
    return await this.variableRepository.save(variable);
  }

  /**
   * テンプレート変数更新
   */
  async updateVariable(id: string, updateData: Partial<TemplateVariable>): Promise<TemplateVariable> {
    await this.variableRepository.update(id, updateData);
    return await this.variableRepository.findOne({ where: { id } });
  }

  /**
   * テンプレート変数削除
   */
  async deleteVariable(id: string): Promise<void> {
    await this.variableRepository.delete(id);
  }

  /**
   * テンプレート使用履歴作成
   */
  async createUsage(usageData: Partial<TemplateUsage>): Promise<TemplateUsage> {
    const usage = this.usageRepository.create(usageData);
    return await this.usageRepository.save(usage);
  }

  /**
   * テンプレート使用履歴取得
   */
  async findUsageHistory(templateId: string, limit: number = 50): Promise<TemplateUsage[]> {
    return await this.usageRepository.find({
      where: { templateId },
      relations: ['user', 'inquiry', 'response'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * ユーザー別使用履歴取得
   */
  async findUserUsageHistory(userId: string, limit: number = 50): Promise<TemplateUsage[]> {
    return await this.usageRepository.find({
      where: { usedBy: userId },
      relations: ['template', 'inquiry', 'response'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}