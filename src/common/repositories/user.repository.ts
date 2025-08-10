/**
 * ユーザーリポジトリ
 * 要件: 4.1, 4.2 (ユーザー管理機能)
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { User } from '../entities/user.entity';
import { UserHistory } from '../entities/user-history.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    protected repository: Repository<User>,
    @InjectRepository(UserHistory)
    private userHistoryRepository: Repository<UserHistory>
  ) {
    super(repository);
  }

  /**
   * メールアドレスでユーザーを取得
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { email },
      relations: ['role']
    });
  }

  /**
   * 役割IDでユーザーを取得
   */
  async findByRoleId(roleId: string): Promise<User[]> {
    return await this.repository.find({
      where: { roleId },
      relations: ['role']
    });
  }

  /**
   * アクティブなユーザーを取得
   */
  async findActiveUsers(): Promise<User[]> {
    return await this.repository.find({
      where: { isActive: true },
      relations: ['role']
    });
  }

  /**
   * ユーザー詳細を取得（関連データ含む）
   */
  async findUserWithDetails(id: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['role', 'assignedInquiries', 'responses']
    });
  }

  /**
   * ユーザー履歴を記録
   */
  async recordUserHistory(
    userId: string,
    fieldName: string,
    oldValue: string | null,
    newValue: string,
    changedBy: string
  ): Promise<UserHistory> {
    const history = this.userHistoryRepository.create({
      userId,
      fieldName,
      oldValue,
      newValue,
      changedBy
    });

    return await this.userHistoryRepository.save(history);
  }

  /**
   * ユーザー履歴を取得
   */
  async getUserHistory(userId: string): Promise<UserHistory[]> {
    return await this.userHistoryRepository.find({
      where: { userId },
      relations: ['changedByUser'],
      order: { changedAt: 'DESC' }
    });
  }

  /**
   * ユーザー更新（履歴記録付き）
   */
  async updateWithHistory(
    id: string,
    updates: Partial<User>,
    changedBy: string
  ): Promise<User | null> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      return null;
    }

    // 変更履歴を記録
    for (const [field, newValue] of Object.entries(updates)) {
      if (field in existingUser && existingUser[field] !== newValue) {
        await this.recordUserHistory(
          id,
          field,
          existingUser[field]?.toString() || null,
          newValue?.toString() || '',
          changedBy
        );
      }
    }

    return await this.update(id, updates);
  }

  /**
   * メールアドレスの重複チェック
   */
  async isEmailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const query = this.repository.createQueryBuilder('user')
      .where('user.email = :email', { email });

    if (excludeUserId) {
      query.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * パスワードハッシュを更新
   */
  async updatePassword(userId: string, passwordHash: string, changedBy: string): Promise<boolean> {
    await this.recordUserHistory(
      userId,
      'password',
      '[HIDDEN]',
      '[UPDATED]',
      changedBy
    );

    const result = await this.repository.update(userId, { passwordHash });
    return result.affected > 0;
  }
}