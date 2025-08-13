/**
 * 履歴管理サービス
 * 要件: 2.2, 2.4, 4.3 (履歴データの取得・表示機能)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserHistory } from '../../modules/users/entities/user-history.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';
import { ResponseHistory } from '../entities/response-history.entity';
import { PaginatedResult, PaginationOptions, DateRange } from '../types';

export interface ActivityLogEntry {
  id: string;
  entityType: 'user' | 'inquiry' | 'response';
  entityId: string;
  action: string;
  details: string;
  changedAt: Date;
  changedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface HistoryFilters {
  entityType?: 'user' | 'inquiry' | 'response';
  entityId?: string;
  changedBy?: string;
  dateRange?: DateRange;
  action?: string;
}

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(UserHistory)
    private userHistoryRepository: Repository<UserHistory>,
    @InjectRepository(InquiryStatusHistory)
    private inquiryStatusHistoryRepository: Repository<InquiryStatusHistory>,
    @InjectRepository(ResponseHistory)
    private responseHistoryRepository: Repository<ResponseHistory>,
    private dataSource: DataSource
  ) {}

  /**
   * 現在のユーザーIDを設定（トリガー用）
   */
  async setCurrentUserId(userId: string): Promise<void> {
    await this.dataSource.query(`SET app.current_user_id = $1`, [userId]);
  }

  /**
   * 現在のユーザーIDをクリア
   */
  async clearCurrentUserId(): Promise<void> {
    await this.dataSource.query(`RESET app.current_user_id`);
  }

  /**
   * ユーザー履歴を取得
   */
  async getUserHistory(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<UserHistory>> {
    const queryBuilder = this.userHistoryRepository.createQueryBuilder('uh')
      .leftJoinAndSelect('uh.user', 'user')
      .leftJoinAndSelect('uh.changedByUser', 'changedBy')
      .where('uh.userId = :userId', { userId })
      .orderBy('uh.changedAt', 'DESC');

    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    if (pagination) {
      const { page, limit } = pagination;
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

    return {
      items,
      total,
      page: 1,
      limit: total,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
  }

  /**
   * 問い合わせ状態履歴を取得
   */
  async getInquiryStatusHistory(
    inquiryId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<InquiryStatusHistory>> {
    const queryBuilder = this.inquiryStatusHistoryRepository.createQueryBuilder('ish')
      .leftJoinAndSelect('ish.inquiry', 'inquiry')
      .leftJoinAndSelect('ish.changedByUser', 'changedBy')
      .where('ish.inquiryId = :inquiryId', { inquiryId })
      .orderBy('ish.changedAt', 'DESC');

    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    if (pagination) {
      const { page, limit } = pagination;
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

    return {
      items,
      total,
      page: 1,
      limit: total,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
  }

  /**
   * 回答履歴を取得
   */
  async getResponseHistory(
    responseId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ResponseHistory>> {
    const queryBuilder = this.responseHistoryRepository.createQueryBuilder('rh')
      .leftJoinAndSelect('rh.response', 'response')
      .leftJoinAndSelect('rh.changedByUser', 'changedBy')
      .where('rh.responseId = :responseId', { responseId })
      .orderBy('rh.changedAt', 'DESC');

    if (pagination) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    if (pagination) {
      const { page, limit } = pagination;
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

    return {
      items,
      total,
      page: 1,
      limit: total,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
  }

  /**
   * 統合アクティビティログを取得
   */
  async getActivityLog(
    filters?: HistoryFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ActivityLogEntry>> {
    let query = `
      SELECT 
        'user' as entity_type,
        uh.id,
        uh.user_id as entity_id,
        CONCAT('Updated ', uh.field_name, ' from "', COALESCE(uh.old_value, 'null'), '" to "', uh.new_value, '"') as action,
        CONCAT('Field: ', uh.field_name) as details,
        uh.changed_at,
        uh.changed_by,
        cb.name as changed_by_name,
        cb.email as changed_by_email
      FROM user_history uh
      LEFT JOIN users cb ON uh.changed_by = cb.id
      
      UNION ALL
      
      SELECT 
        'inquiry' as entity_type,
        ish.id,
        ish.inquiry_id as entity_id,
        CONCAT('Status changed from "', COALESCE(ish.old_status, 'null'), '" to "', ish.new_status, '"') as action,
        COALESCE(ish.comment, 'No comment') as details,
        ish.changed_at,
        ish.changed_by,
        cb.name as changed_by_name,
        cb.email as changed_by_email
      FROM inquiry_status_history ish
      LEFT JOIN users cb ON ish.changed_by = cb.id
      
      UNION ALL
      
      SELECT 
        'response' as entity_type,
        rh.id,
        rh.response_id as entity_id,
        'Response content updated' as action,
        CONCAT('Content length changed from ', LENGTH(rh.old_content), ' to ', LENGTH(rh.new_content), ' characters') as details,
        rh.changed_at,
        rh.changed_by,
        cb.name as changed_by_name,
        cb.email as changed_by_email
      FROM response_history rh
      LEFT JOIN users cb ON rh.changed_by = cb.id
    `;

    const conditions: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (filters?.entityType) {
      conditions.push(`entity_type = $${paramIndex}`);
      parameters.push(filters.entityType);
      paramIndex++;
    }

    if (filters?.entityId) {
      conditions.push(`entity_id = $${paramIndex}`);
      parameters.push(filters.entityId);
      paramIndex++;
    }

    if (filters?.changedBy) {
      conditions.push(`changed_by = $${paramIndex}`);
      parameters.push(filters.changedBy);
      paramIndex++;
    }

    if (filters?.dateRange) {
      conditions.push(`changed_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      parameters.push(filters.dateRange.startDate, filters.dateRange.endDate);
      paramIndex += 2;
    }

    if (conditions.length > 0) {
      query = `SELECT * FROM (${query}) as combined_log WHERE ${conditions.join(' AND ')}`;
    } else {
      query = `SELECT * FROM (${query}) as combined_log`;
    }

    query += ` ORDER BY changed_at DESC`;

    // 件数取得用のクエリ
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;
    const countResult = await this.dataSource.query(countQuery, parameters);
    const total = parseInt(countResult[0].total);

    // ページネーション適用
    if (pagination) {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      parameters.push(limit, offset);
    }

    const rawResults = await this.dataSource.query(query, parameters);

    const items: ActivityLogEntry[] = rawResults.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      details: row.details,
      changedAt: row.changed_at,
      changedBy: {
        id: row.changed_by,
        name: row.changed_by_name || 'Unknown',
        email: row.changed_by_email || 'unknown@example.com'
      }
    }));

    if (pagination) {
      const { page, limit } = pagination;
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

    return {
      items,
      total,
      page: 1,
      limit: total,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
  }

  /**
   * 履歴統計を取得
   */
  async getHistoryStatistics(dateRange?: DateRange): Promise<{
    userChanges: number;
    inquiryStatusChanges: number;
    responseChanges: number;
    totalChanges: number;
    topChangedEntities: Array<{ entityType: string; entityId: string; changeCount: number }>;
  }> {
    const conditions = dateRange 
      ? `WHERE changed_at BETWEEN $1 AND $2`
      : '';
    const params = dateRange ? [dateRange.startDate, dateRange.endDate] : [];

    const userChanges = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM user_history ${conditions}`,
      params
    );

    const inquiryChanges = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM inquiry_status_history ${conditions}`,
      params
    );

    const responseChanges = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM response_history ${conditions}`,
      params
    );

    const topEntitiesQuery = `
      SELECT entity_type, entity_id, COUNT(*) as change_count FROM (
        SELECT 'user' as entity_type, user_id as entity_id, changed_at FROM user_history
        UNION ALL
        SELECT 'inquiry' as entity_type, inquiry_id as entity_id, changed_at FROM inquiry_status_history
        UNION ALL
        SELECT 'response' as entity_type, response_id as entity_id, changed_at FROM response_history
      ) as all_changes
      ${conditions}
      GROUP BY entity_type, entity_id
      ORDER BY change_count DESC
      LIMIT 10
    `;

    const topEntities = await this.dataSource.query(topEntitiesQuery, params);

    return {
      userChanges: parseInt(userChanges[0].count),
      inquiryStatusChanges: parseInt(inquiryChanges[0].count),
      responseChanges: parseInt(responseChanges[0].count),
      totalChanges: parseInt(userChanges[0].count) + parseInt(inquiryChanges[0].count) + parseInt(responseChanges[0].count),
      topChangedEntities: topEntities.map(row => ({
        entityType: row.entity_type,
        entityId: row.entity_id,
        changeCount: parseInt(row.change_count)
      }))
    };
  }

  /**
   * 履歴データのクリーンアップ（古いデータの削除）
   */
  async cleanupOldHistory(retentionDays: number = 365): Promise<{
    deletedUserHistory: number;
    deletedInquiryHistory: number;
    deletedResponseHistory: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const userHistoryResult = await this.userHistoryRepository
      .createQueryBuilder()
      .delete()
      .where('changedAt < :cutoffDate', { cutoffDate })
      .execute();

    const inquiryHistoryResult = await this.inquiryStatusHistoryRepository
      .createQueryBuilder()
      .delete()
      .where('changedAt < :cutoffDate', { cutoffDate })
      .execute();

    const responseHistoryResult = await this.responseHistoryRepository
      .createQueryBuilder()
      .delete()
      .where('changedAt < :cutoffDate', { cutoffDate })
      .execute();

    return {
      deletedUserHistory: userHistoryResult.affected || 0,
      deletedInquiryHistory: inquiryHistoryResult.affected || 0,
      deletedResponseHistory: responseHistoryResult.affected || 0,
    };
  }
}