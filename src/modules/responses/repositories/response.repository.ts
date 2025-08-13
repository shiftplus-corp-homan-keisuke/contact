/**
 * 回答リポジトリ
 * 要件: 2.1, 2.2, 2.3 (回答管理機能)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Response } from '../entities/response.entity';
import { ResponseHistory } from '../../../common/entities/response-history.entity';
import { ResponseStatus } from '../../../common/types/response.types';

export interface ResponseHistoryData {
  responseId: string;
  oldContent: string;
  newContent: string;
  changedBy: string;
  changeType: 'create' | 'update' | 'send' | 'delete';
}

export interface ResponseSearchFilters {
  inquiryId?: string;
  userId?: string;
  status?: ResponseStatus;
  isInternal?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

@Injectable()
export class ResponseRepository extends Repository<Response> {
  constructor(
    @InjectRepository(Response)
    private readonly repository: Repository<Response>,
    @InjectRepository(ResponseHistory)
    private readonly historyRepository: Repository<ResponseHistory>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /**
   * 問い合わせ別の回答取得
   * 要件: 2.2 - 回答履歴の管理と表示
   */
  async findByInquiry(
    inquiryId: string,
    includeInternal: boolean = false,
  ): Promise<Response[]> {
    const queryBuilder = this.createQueryBuilder('response')
      .leftJoinAndSelect('response.user', 'user')
      .leftJoinAndSelect('response.files', 'files')
      .where('response.inquiryId = :inquiryId', { inquiryId })
      .orderBy('response.createdAt', 'ASC');

    if (!includeInternal) {
      queryBuilder.andWhere('response.isInternal = false');
    }

    return queryBuilder.getMany();
  }

  /**
   * ユーザー別の回答取得
   */
  async findByUser(
    userId: string,
    status?: ResponseStatus,
    limit: number = 50,
  ): Promise<Response[]> {
    const queryBuilder = this.createQueryBuilder('response')
      .leftJoinAndSelect('response.inquiry', 'inquiry')
      .leftJoinAndSelect('inquiry.application', 'application')
      .where('response.userId = :userId', { userId })
      .orderBy('response.updatedAt', 'DESC')
      .limit(limit);

    if (status) {
      queryBuilder.andWhere('response.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  /**
   * 下書き一覧取得
   * 要件: 2.3 - 下書き管理機能
   */
  async findDrafts(userId?: string): Promise<Response[]> {
    const queryBuilder = this.createQueryBuilder('response')
      .leftJoinAndSelect('response.inquiry', 'inquiry')
      .leftJoinAndSelect('inquiry.application', 'application')
      .leftJoinAndSelect('response.user', 'user')
      .where('response.status = :status', { status: ResponseStatus.DRAFT })
      .orderBy('response.updatedAt', 'DESC');

    if (userId) {
      queryBuilder.andWhere('response.userId = :userId', { userId });
    }

    return queryBuilder.getMany();
  }

  /**
   * 送信待ちの回答取得
   */
  async findPendingSend(limit: number = 100): Promise<Response[]> {
    return this.createQueryBuilder('response')
      .leftJoinAndSelect('response.inquiry', 'inquiry')
      .leftJoinAndSelect('response.user', 'user')
      .where('response.status = :status', { status: ResponseStatus.PENDING })
      .andWhere('response.isInternal = false')
      .orderBy('response.createdAt', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * 統計情報取得
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date,
    appId?: string,
  ): Promise<{
    totalResponses: number;
    sentResponses: number;
    draftResponses: number;
    internalResponses: number;
    averageResponseTime: number;
  }> {
    const queryBuilder = this.createQueryBuilder('response')
      .leftJoin('response.inquiry', 'inquiry');

    if (startDate && endDate) {
      queryBuilder.where('response.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (appId) {
      queryBuilder.andWhere('inquiry.appId = :appId', { appId });
    }

    const [
      totalResponses,
      sentResponses,
      draftResponses,
      internalResponses,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('response.status = :status', { status: ResponseStatus.SENT }).getCount(),
      queryBuilder.clone().andWhere('response.status = :status', { status: ResponseStatus.DRAFT }).getCount(),
      queryBuilder.clone().andWhere('response.isInternal = true').getCount(),
    ]);

    // 平均回答時間の計算
    const avgResponseTimeResult = await this.createQueryBuilder('response')
      .leftJoin('response.inquiry', 'inquiry')
      .select('AVG(EXTRACT(EPOCH FROM (response.createdAt - inquiry.createdAt)))', 'avgTime')
      .where('response.status = :status', { status: ResponseStatus.SENT })
      .andWhere('response.isInternal = false')
      .getRawOne();

    const averageResponseTime = avgResponseTimeResult?.avgTime 
      ? parseFloat(avgResponseTimeResult.avgTime) 
      : 0;

    return {
      totalResponses,
      sentResponses,
      draftResponses,
      internalResponses,
      averageResponseTime,
    };
  }

  /**
   * 期間別の回答数取得
   */
  async getCountByPeriod(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
    appId?: string,
  ): Promise<Array<{ period: string; count: number }>> {
    let dateFormat: string;
    switch (groupBy) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
    }

    const queryBuilder = this.createQueryBuilder('response')
      .leftJoin('response.inquiry', 'inquiry')
      .select(`TO_CHAR(response.createdAt, '${dateFormat}')`, 'period')
      .addSelect('COUNT(*)', 'count')
      .where('response.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('period')
      .orderBy('period', 'ASC');

    if (appId) {
      queryBuilder.andWhere('inquiry.appId = :appId', { appId });
    }

    const results = await queryBuilder.getRawMany();
    
    return results.map(result => ({
      period: result.period,
      count: parseInt(result.count, 10),
    }));
  }

  /**
   * ユーザー別の回答統計
   */
  async getUserStatistics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalResponses: number;
    sentResponses: number;
    draftResponses: number;
    averageResponseTime: number;
  }> {
    const queryBuilder = this.createQueryBuilder('response')
      .leftJoin('response.inquiry', 'inquiry')
      .where('response.userId = :userId', { userId });

    if (startDate && endDate) {
      queryBuilder.andWhere('response.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [totalResponses, sentResponses, draftResponses] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('response.status = :status', { status: ResponseStatus.SENT }).getCount(),
      queryBuilder.clone().andWhere('response.status = :status', { status: ResponseStatus.DRAFT }).getCount(),
    ]);

    // 平均回答時間の計算
    const avgResponseTimeResult = await queryBuilder
      .clone()
      .select('AVG(EXTRACT(EPOCH FROM (response.createdAt - inquiry.createdAt)))', 'avgTime')
      .andWhere('response.status = :status', { status: ResponseStatus.SENT })
      .andWhere('response.isInternal = false')
      .getRawOne();

    const averageResponseTime = avgResponseTimeResult?.avgTime 
      ? parseFloat(avgResponseTimeResult.avgTime) 
      : 0;

    return {
      totalResponses,
      sentResponses,
      draftResponses,
      averageResponseTime,
    };
  }

  /**
   * 変更履歴の作成
   * 要件: 2.2 - 回答の変更履歴管理
   */
  async createHistory(data: ResponseHistoryData): Promise<ResponseHistory> {
    const history = this.historyRepository.create({
      responseId: data.responseId,
      oldContent: data.oldContent,
      newContent: data.newContent,
      changedBy: data.changedBy,
      changeType: data.changeType,
    });

    return this.historyRepository.save(history);
  }

  /**
   * 変更履歴の取得
   * 要件: 2.2 - 回答の変更履歴管理
   */
  async getHistory(responseId: string): Promise<ResponseHistory[]> {
    return this.historyRepository.find({
      where: { responseId },
      relations: ['changedByUser'],
      order: { changedAt: 'DESC' },
    });
  }

  /**
   * 高度な検索
   */
  async findWithFilters(
    filters: ResponseSearchFilters,
    page: number = 1,
    limit: number = 20,
  ): Promise<[Response[], number]> {
    const queryBuilder = this.createQueryBuilder('response')
      .leftJoinAndSelect('response.inquiry', 'inquiry')
      .leftJoinAndSelect('response.user', 'user')
      .leftJoinAndSelect('response.files', 'files')
      .orderBy('response.createdAt', 'DESC');

    this.applyFilters(queryBuilder, filters);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    return queryBuilder.getManyAndCount();
  }

  /**
   * フィルター条件の適用
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<Response>,
    filters: ResponseSearchFilters,
  ): void {
    if (filters.inquiryId) {
      queryBuilder.andWhere('response.inquiryId = :inquiryId', {
        inquiryId: filters.inquiryId,
      });
    }

    if (filters.userId) {
      queryBuilder.andWhere('response.userId = :userId', { userId: filters.userId });
    }

    if (filters.status) {
      queryBuilder.andWhere('response.status = :status', { status: filters.status });
    }

    if (filters.isInternal !== undefined) {
      queryBuilder.andWhere('response.isInternal = :isInternal', {
        isInternal: filters.isInternal,
      });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('response.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere('response.content ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }
  }
}