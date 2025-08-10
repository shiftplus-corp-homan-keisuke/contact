/**
 * 検索サービス
 * 要件: 8.1, 8.2, 8.4 (検索・フィルタリング機能)
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { SearchInquiriesDto, SearchResultDto } from '../dto/search.dto';
import { InquiryStatus, InquiryPriority } from '../types/inquiry.types';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
  ) {}

  /**
   * 問い合わせの検索・フィルタリング
   * 要件: 8.1, 8.2, 8.4 (検索・フィルタリング機能)
   */
  async searchInquiries(searchDto: SearchInquiriesDto): Promise<SearchResultDto<Inquiry>> {
    const startTime = Date.now();
    this.logger.log(`検索実行開始: query="${searchDto.query}", filters=${JSON.stringify(searchDto)}`);

    // クエリビルダーを作成
    const queryBuilder = this.createSearchQueryBuilder(searchDto);

    // 総件数を取得
    const total = await queryBuilder.getCount();

    // ページネーション適用
    queryBuilder
      .skip(searchDto.skip)
      .take(searchDto.limit);

    // ソート適用
    this.applySorting(queryBuilder, searchDto.sortBy, searchDto.sortOrder);

    // 結果を取得
    const items = await queryBuilder.getMany();

    const executionTime = Date.now() - startTime;
    const totalPages = Math.ceil(total / searchDto.limit);

    this.logger.log(`検索実行完了: ${items.length}件取得, 実行時間: ${executionTime}ms`);

    return {
      items,
      total,
      page: searchDto.page,
      limit: searchDto.limit,
      totalPages,
      query: searchDto.query,
      appliedFilters: this.extractAppliedFilters(searchDto),
      executionTime,
    };
  }

  /**
   * 検索クエリビルダーを作成
   */
  private createSearchQueryBuilder(searchDto: SearchInquiriesDto): SelectQueryBuilder<Inquiry> {
    const queryBuilder = this.inquiryRepository
      .createQueryBuilder('inquiry')
      .leftJoinAndSelect('inquiry.application', 'application')
      .leftJoinAndSelect('inquiry.assignedUser', 'assignedUser');

    // 全文検索の適用
    if (searchDto.query && searchDto.query.trim()) {
      this.applyFullTextSearch(queryBuilder, searchDto.query.trim());
    }

    // フィルターの適用
    this.applyFilters(queryBuilder, searchDto);

    return queryBuilder;
  }

  /**
   * PostgreSQL全文検索を適用
   * 要件: 8.1, 8.3 (全文検索機能)
   */
  private applyFullTextSearch(queryBuilder: SelectQueryBuilder<Inquiry>, query: string): void {
    // PostgreSQLの全文検索機能を使用
    // to_tsvector()とto_tsquery()を使用してより高度な検索を実現
    const searchTerms = query
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => term.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ''))
      .filter(term => term.length > 0);

    if (searchTerms.length === 0) {
      return;
    }

    // 日本語対応のため、simple辞書を使用
    const tsquery = searchTerms.map(term => `${term}:*`).join(' & ');
    
    queryBuilder.andWhere(
      `(
        to_tsvector('simple', inquiry.title) @@ to_tsquery('simple', :tsquery) OR
        to_tsvector('simple', inquiry.content) @@ to_tsquery('simple', :tsquery) OR
        inquiry.title ILIKE :likeQuery OR
        inquiry.content ILIKE :likeQuery OR
        inquiry.category ILIKE :likeQuery OR
        inquiry.customer_name ILIKE :likeQuery
      )`,
      {
        tsquery,
        likeQuery: `%${query}%`
      }
    );

    this.logger.debug(`全文検索適用: query="${query}", tsquery="${tsquery}"`);
  }

  /**
   * フィルターを適用
   * 要件: 8.2 (フィルタリング機能)
   */
  private applyFilters(queryBuilder: SelectQueryBuilder<Inquiry>, searchDto: SearchInquiriesDto): void {
    // アプリケーションIDフィルター
    if (searchDto.appId) {
      queryBuilder.andWhere('inquiry.appId = :appId', { appId: searchDto.appId });
    }

    // 状態フィルター
    if (searchDto.status && searchDto.status.length > 0) {
      queryBuilder.andWhere('inquiry.status IN (:...status)', { status: searchDto.status });
    }

    // カテゴリフィルター
    if (searchDto.category && searchDto.category.length > 0) {
      queryBuilder.andWhere('inquiry.category IN (:...category)', { category: searchDto.category });
    }

    // 優先度フィルター
    if (searchDto.priority && searchDto.priority.length > 0) {
      queryBuilder.andWhere('inquiry.priority IN (:...priority)', { priority: searchDto.priority });
    }

    // 担当者フィルター
    if (searchDto.assignedTo) {
      queryBuilder.andWhere('inquiry.assignedTo = :assignedTo', { assignedTo: searchDto.assignedTo });
    }

    // 顧客メールアドレスフィルター
    if (searchDto.customerEmail) {
      queryBuilder.andWhere('inquiry.customerEmail ILIKE :customerEmail', {
        customerEmail: `%${searchDto.customerEmail}%`
      });
    }

    // 日付範囲フィルター
    if (searchDto.startDate) {
      queryBuilder.andWhere('inquiry.createdAt >= :startDate', {
        startDate: new Date(searchDto.startDate)
      });
    }

    if (searchDto.endDate) {
      const endDate = new Date(searchDto.endDate);
      endDate.setHours(23, 59, 59, 999); // 終了日の23:59:59まで含める
      queryBuilder.andWhere('inquiry.createdAt <= :endDate', { endDate });
    }
  }

  /**
   * ソートを適用
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<Inquiry>,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): void {
    const sortColumn = this.getSortColumn(sortBy);
    queryBuilder.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // 同じ値の場合の二次ソート（作成日時の降順）
    if (sortBy !== 'createdAt') {
      queryBuilder.addOrderBy('inquiry.createdAt', 'DESC');
    }
  }

  /**
   * ソート列名を取得
   */
  private getSortColumn(sortBy: string): string {
    const sortColumnMap: Record<string, string> = {
      createdAt: 'inquiry.createdAt',
      updatedAt: 'inquiry.updatedAt',
      title: 'inquiry.title',
      priority: 'inquiry.priority',
      status: 'inquiry.status',
    };

    return sortColumnMap[sortBy] || 'inquiry.createdAt';
  }

  /**
   * 適用されたフィルターを抽出
   */
  private extractAppliedFilters(searchDto: SearchInquiriesDto): Record<string, any> {
    const filters: Record<string, any> = {};

    if (searchDto.appId) filters.appId = searchDto.appId;
    if (searchDto.status && searchDto.status.length > 0) filters.status = searchDto.status;
    if (searchDto.category && searchDto.category.length > 0) filters.category = searchDto.category;
    if (searchDto.priority && searchDto.priority.length > 0) filters.priority = searchDto.priority;
    if (searchDto.assignedTo) filters.assignedTo = searchDto.assignedTo;
    if (searchDto.customerEmail) filters.customerEmail = searchDto.customerEmail;
    if (searchDto.startDate) filters.startDate = searchDto.startDate;
    if (searchDto.endDate) filters.endDate = searchDto.endDate;
    if (searchDto.sortBy !== 'createdAt') filters.sortBy = searchDto.sortBy;
    if (searchDto.sortOrder !== 'desc') filters.sortOrder = searchDto.sortOrder;

    return filters;
  }

  /**
   * 検索候補を取得（オートコンプリート用）
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const suggestions = await this.inquiryRepository
      .createQueryBuilder('inquiry')
      .select('DISTINCT inquiry.title', 'title')
      .where('inquiry.title ILIKE :query', { query: `%${query.trim()}%` })
      .orderBy('LENGTH(inquiry.title)', 'ASC')
      .limit(limit)
      .getRawMany();

    return suggestions.map(s => s.title);
  }

  /**
   * カテゴリ一覧を取得（フィルター用）
   */
  async getAvailableCategories(): Promise<string[]> {
    const categories = await this.inquiryRepository
      .createQueryBuilder('inquiry')
      .select('DISTINCT inquiry.category', 'category')
      .where('inquiry.category IS NOT NULL')
      .andWhere('inquiry.category != \'\'')
      .orderBy('inquiry.category', 'ASC')
      .getRawMany();

    return categories.map(c => c.category);
  }

  /**
   * 検索統計を取得
   */
  async getSearchStatistics(): Promise<{
    totalInquiries: number;
    statusBreakdown: Record<InquiryStatus, number>;
    priorityBreakdown: Record<InquiryPriority, number>;
    categoryBreakdown: Record<string, number>;
  }> {
    const [
      totalInquiries,
      statusStats,
      priorityStats,
      categoryStats
    ] = await Promise.all([
      this.inquiryRepository.count(),
      this.getStatusBreakdown(),
      this.getPriorityBreakdown(),
      this.getCategoryBreakdown()
    ]);

    return {
      totalInquiries,
      statusBreakdown: statusStats,
      priorityBreakdown: priorityStats,
      categoryBreakdown: categoryStats,
    };
  }

  private async getStatusBreakdown(): Promise<Record<InquiryStatus, number>> {
    const results = await this.inquiryRepository
      .createQueryBuilder('inquiry')
      .select('inquiry.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('inquiry.status')
      .getRawMany();

    const breakdown = {} as Record<InquiryStatus, number>;
    Object.values(InquiryStatus).forEach(status => {
      breakdown[status] = 0;
    });

    results.forEach(result => {
      breakdown[result.status as InquiryStatus] = parseInt(result.count);
    });

    return breakdown;
  }

  private async getPriorityBreakdown(): Promise<Record<InquiryPriority, number>> {
    const results = await this.inquiryRepository
      .createQueryBuilder('inquiry')
      .select('inquiry.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('inquiry.priority')
      .getRawMany();

    const breakdown = {} as Record<InquiryPriority, number>;
    Object.values(InquiryPriority).forEach(priority => {
      breakdown[priority] = 0;
    });

    results.forEach(result => {
      breakdown[result.priority as InquiryPriority] = parseInt(result.count);
    });

    return breakdown;
  }

  private async getCategoryBreakdown(): Promise<Record<string, number>> {
    const results = await this.inquiryRepository
      .createQueryBuilder('inquiry')
      .select('inquiry.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('inquiry.category IS NOT NULL')
      .andWhere('inquiry.category != \'\'')
      .groupBy('inquiry.category')
      .orderBy('COUNT(*)', 'DESC')
      .limit(20) // 上位20カテゴリのみ
      .getRawMany();

    const breakdown: Record<string, number> = {};
    results.forEach(result => {
      breakdown[result.category] = parseInt(result.count);
    });

    return breakdown;
  }
}