/**
 * ベースリポジトリクラス
 * 要件: 1.2, 2.1, 4.1 (基本的なCRUD操作)
 */

import { Repository, FindOptionsWhere, FindManyOptions, DeepPartial, ObjectLiteral } from 'typeorm';
import { PaginatedResult, PaginationOptions } from '../types';

export abstract class BaseRepository<T extends ObjectLiteral> {
  constructor(protected repository: Repository<T>) {}

  /**
   * エンティティを作成
   */
  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return await this.repository.save(entity);
  }

  /**
   * IDでエンティティを取得
   */
  async findById(id: string): Promise<T | null> {
    return await this.repository.findOne({ where: { id } as any });
  }

  /**
   * 複数のIDでエンティティを取得
   */
  async findByIds(ids: string[]): Promise<T[]> {
    return await this.repository.findByIds(ids);
  }

  /**
   * 条件でエンティティを取得
   */
  async findOne(where: FindOptionsWhere<T>): Promise<T | null> {
    return await this.repository.findOne({ where });
  }

  /**
   * 複数のエンティティを取得
   */
  async findMany(options?: FindManyOptions<T>): Promise<T[]> {
    return await this.repository.find(options);
  }

  /**
   * ページネーション付きで取得
   */
  async findWithPagination(
    options: FindManyOptions<T>,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await this.repository.findAndCount({
      ...options,
      skip,
      take: limit,
    });

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
   * エンティティを更新
   */
  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id, data as any);
    return await this.findById(id);
  }

  /**
   * エンティティを削除
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  /**
   * エンティティの存在確認
   */
  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  /**
   * エンティティの件数を取得
   */
  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return await this.repository.count({ where });
  }

  /**
   * 複数のエンティティを一括作成
   */
  async createMany(data: DeepPartial<T>[]): Promise<T[]> {
    const entities = this.repository.create(data);
    return await this.repository.save(entities);
  }

  /**
   * 複数のエンティティを一括削除
   */
  async deleteMany(where: FindOptionsWhere<T>): Promise<number> {
    const result = await this.repository.delete(where);
    return result.affected || 0;
  }

  /**
   * トランザクション内でエンティティを保存
   */
  async saveInTransaction(entity: T): Promise<T> {
    return await this.repository.save(entity);
  }
}