/**
 * 問い合わせリポジトリ
 * 要件: 1.1, 1.3, 1.4, 2.2, 2.3 (問い合わせ登録・管理機能)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Inquiry } from '../entities/inquiry.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';
import { InquiryStatus, InquiryFilters, SearchCriteria, PaginatedResult } from '../types';

@Injectable()
export class InquiryRepository extends BaseRepository<Inquiry> {
  constructor(
    @InjectRepository(Inquiry)
    protected repository: Repository<Inquiry>,
    @InjectRepository(InquiryStatusHistory)
    private statusHistoryRepository: Repository<InquiryStatusHistory>
  ) {
    super(repository);
  }

  /**
   * 問い合わせ詳細を取得（関連データ含む）
   */
  async findInquiryWithDetails(id: string): Promise<Inquiry | null> {
    return await this.repository.findOne({
      where: { id },
      relations: [
        'application',
        'assignedUser',
        'responses',
        'responses.user',
        'statusHistory',
        'statusHistory.changedByUser'
      ]
    });
  }

  /**
   * アプリケーション別問い合わせを取得
   */
  async findByAppId(appId: string): Promise<Inquiry[]> {
    return await this.repository.find({
      where: { appId },
      relations: ['application', 'assignedUser'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * 担当者別問い合わせを取得
   */
  async findByAssignedUser(userId: string): Promise<Inquiry[]> {
    return await this.repository.find({
      where: { assignedTo: userId },
      relations: ['application', 'assignedUser'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * ステータス別問い合わせを取得
   */
  async findByStatus(status: InquiryStatus): Promise<Inquiry[]> {
    return await this.repository.find({
      where: { status },
      relations: ['application', 'assignedUser'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * 検索・フィルタリング機能
   */
  async searchInquiries(criteria: SearchCriteria): Promise<PaginatedResult<Inquiry>> {
    const queryBuilder = this.createSearchQueryBuilder(criteria);
    
    const { page = 1, limit = 20 } = criteria;
    const skip = (page - 1) * limit;

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * 検索クエリビルダーを作成
   */
  private createSearchQueryBuilder(criteria: SearchCriteria): SelectQueryBuilder<Inquiry> {
    const queryBuilder = this.repository.createQueryBuilder('inquiry')
      .leftJoinAndSelect('inquiry.application', 'application')
      .leftJoinAndSelect('inquiry.assignedUser', 'assignedUser');

    // 全文検索
    if (criteria.query) {
      queryBuilder.andWhere(
        `to_tsvector('japanese', inquiry.title || ' ' || inquiry.content) @@ plainto_tsquery('japanese', :query)`,
        { query: criteria.query }
      );
    }

    // フィルター適用
    if (criteria.filters) {
      this.applyFilters(queryBuilder, criteria.filters);
    }

    // ソート
    const sortBy = criteria.sortBy || 'createdAt';
    const sortOrder = criteria.sortOrder || 'DESC';
    queryBuilder.orderBy(`inquiry.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    return queryBuilder;
  }

  /**
   * フィルターを適用
   */
  private applyFilters(queryBuilder: SelectQueryBuilder<Inquiry>, filters: InquiryFilters): void {
    if (filters.appId) {
      queryBuilder.andWhere('inquiry.appId = :appId', { appId: filters.appId });
    }

    if (filters.status && filters.status.length > 0) {
      queryBuilder.andWhere('inquiry.status IN (:...statuses)', { statuses: filters.status });
    }

    if (filters.category && filters.category.length > 0) {
      queryBuilder.andWhere('inquiry.category IN (:...categories)', { categories: filters.category });
    }

    if (filters.assignedTo) {
      queryBuilder.andWhere('inquiry.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters.priority && filters.priority.length > 0) {
      queryBuilder.andWhere('inquiry.priority IN (:...priorities)', { priorities: filters.priority });
    }

    if (filters.customerEmail) {
      queryBuilder.andWhere('inquiry.customerEmail = :customerEmail', { customerEmail: filters.customerEmail });
    }

    if (filters.dateRange) {
      queryBuilder.andWhere('inquiry.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate
      });
    }
  }

  /**
   * ステータス履歴を記録
   */
  async recordStatusHistory(
    inquiryId: string,
    oldStatus: InquiryStatus | null,
    newStatus: InquiryStatus,
    changedBy: string,
    comment?: string
  ): Promise<InquiryStatusHistory> {
    const history = this.statusHistoryRepository.create({
      inquiryId,
      oldStatus,
      newStatus,
      changedBy,
      comment
    });

    return await this.statusHistoryRepository.save(history);
  }

  /**
   * ステータス更新（履歴記録付き）
   */
  async updateStatus(
    id: string,
    newStatus: InquiryStatus,
    changedBy: string,
    comment?: string
  ): Promise<Inquiry | null> {
    const inquiry = await this.findById(id);
    if (!inquiry) {
      return null;
    }

    // ステータス履歴を記録
    await this.recordStatusHistory(id, inquiry.status, newStatus, changedBy, comment);

    // ステータスを更新
    return await this.update(id, { status: newStatus });
  }

  /**
   * ステータス履歴を取得
   */
  async getStatusHistory(inquiryId: string): Promise<InquiryStatusHistory[]> {
    return await this.statusHistoryRepository.find({
      where: { inquiryId },
      relations: ['changedByUser'],
      order: { changedAt: 'DESC' }
    });
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(appId?: string): Promise<{
    total: number;
    byStatus: Record<InquiryStatus, number>;
    byPriority: Record<string, number>;
  }> {
    const queryBuilder = this.repository.createQueryBuilder('inquiry');
    
    if (appId) {
      queryBuilder.where('inquiry.appId = :appId', { appId });
    }

    const total = await queryBuilder.getCount();

    // ステータス別集計
    const statusStats = await queryBuilder
      .select('inquiry.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('inquiry.status')
      .getRawMany();

    const byStatus = statusStats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {} as Record<InquiryStatus, number>);

    // 優先度別集計
    const priorityStats = await queryBuilder
      .select('inquiry.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('inquiry.priority')
      .getRawMany();

    const byPriority = priorityStats.reduce((acc, stat) => {
      acc[stat.priority] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    return { total, byStatus, byPriority };
  }
}