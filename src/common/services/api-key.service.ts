/**
 * APIキー管理サービス
 * 要件: 7.1, 7.4 (API認証とレート制限)
 */

import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey } from '../entities/api-key.entity';
import { Application } from '../entities/application.entity';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyResponseDto } from '../dto/api-key.dto';

export interface ApiKeyContext {
  appId: string;
  permissions: string[];
  rateLimit: RateLimitConfig;
  isActive: boolean;
  apiKeyId: string;
}

export interface RateLimitConfig {
  limitPerHour: number;
  windowSizeMs: number;
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: Date;
  isExceeded: boolean;
  limit: number;
}

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * APIキー生成
   * 要件: 7.1 - APIキーまたはトークンベースの認証を提供
   */
  async generateApiKey(createApiKeyDto: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    const { appId, name, permissions = [], rateLimitPerHour = 1000, expiresAt } = createApiKeyDto;

    // アプリケーションの存在確認
    const application = await this.applicationRepository.findOne({ where: { id: appId } });
    if (!application) {
      throw new NotFoundException('指定されたアプリケーションが見つかりません');
    }

    // APIキーの生成（32バイトのランダム文字列をBase64エンコード）
    const rawApiKey = crypto.randomBytes(32).toString('base64url');
    const apiKeyWithPrefix = `ims_${rawApiKey}`;

    // APIキーのハッシュ化（保存用）
    const saltRounds = 12;
    const keyHash = await bcrypt.hash(apiKeyWithPrefix, saltRounds);

    // APIキーエンティティの作成
    const apiKey = this.apiKeyRepository.create({
      appId,
      keyHash,
      name,
      permissions,
      rateLimitPerHour,
      isActive: true,
      expiresAt,
    });

    const savedApiKey = await this.apiKeyRepository.save(apiKey);

    return {
      id: savedApiKey.id,
      apiKey: apiKeyWithPrefix, // 生のAPIキーは作成時のみ返却
      name: savedApiKey.name,
      appId: savedApiKey.appId,
      permissions: savedApiKey.permissions,
      rateLimitPerHour: savedApiKey.rateLimitPerHour,
      isActive: savedApiKey.isActive,
      createdAt: savedApiKey.createdAt,
      expiresAt: savedApiKey.expiresAt,
    };
  }

  /**
   * APIキー検証
   * 要件: 7.1 - 認証済みAPIリクエストを受け付けて処理
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyContext> {
    if (!apiKey || !apiKey.startsWith('ims_')) {
      throw new UnauthorizedException('無効なAPIキー形式です');
    }

    // データベースから全てのアクティブなAPIキーを取得してハッシュ比較
    const activeApiKeys = await this.apiKeyRepository.find({
      where: { isActive: true },
      relations: ['application'],
    });

    let matchedApiKey: ApiKey | null = null;

    for (const dbApiKey of activeApiKeys) {
      const isMatch = await bcrypt.compare(apiKey, dbApiKey.keyHash);
      if (isMatch) {
        matchedApiKey = dbApiKey;
        break;
      }
    }

    if (!matchedApiKey) {
      throw new UnauthorizedException('無効なAPIキーです');
    }

    // 有効期限チェック
    if (matchedApiKey.expiresAt && matchedApiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('APIキーの有効期限が切れています');
    }

    // 最終使用日時を更新
    await this.updateLastUsedAt(matchedApiKey.id);

    return {
      appId: matchedApiKey.appId,
      permissions: matchedApiKey.permissions,
      rateLimit: {
        limitPerHour: matchedApiKey.rateLimitPerHour,
        windowSizeMs: 60 * 60 * 1000, // 1時間
      },
      isActive: matchedApiKey.isActive,
      apiKeyId: matchedApiKey.id,
    };
  }

  /**
   * APIキー一覧取得
   */
  async getApiKeysByApp(appId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { appId },
      relations: ['application'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * APIキー更新
   */
  async updateApiKey(apiKeyId: string, updateApiKeyDto: UpdateApiKeyDto): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id: apiKeyId } });
    if (!apiKey) {
      throw new NotFoundException('APIキーが見つかりません');
    }

    // 更新可能なフィールドのみ更新
    if (updateApiKeyDto.name !== undefined) {
      apiKey.name = updateApiKeyDto.name;
    }

    if (updateApiKeyDto.permissions !== undefined) {
      apiKey.permissions = updateApiKeyDto.permissions;
    }

    if (updateApiKeyDto.rateLimitPerHour !== undefined) {
      apiKey.rateLimitPerHour = updateApiKeyDto.rateLimitPerHour;
    }

    if (updateApiKeyDto.isActive !== undefined) {
      apiKey.isActive = updateApiKeyDto.isActive;
    }

    if (updateApiKeyDto.expiresAt !== undefined) {
      apiKey.expiresAt = updateApiKeyDto.expiresAt;
    }

    return this.apiKeyRepository.save(apiKey);
  }

  /**
   * APIキー無効化
   */
  async revokeApiKey(apiKeyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id: apiKeyId } });
    if (!apiKey) {
      throw new NotFoundException('APIキーが見つかりません');
    }

    apiKey.isActive = false;
    await this.apiKeyRepository.save(apiKey);
  }

  /**
   * APIキー削除
   */
  async deleteApiKey(apiKeyId: string): Promise<void> {
    const result = await this.apiKeyRepository.delete(apiKeyId);
    if (result.affected === 0) {
      throw new NotFoundException('APIキーが見つかりません');
    }
  }

  /**
   * 最終使用日時更新
   */
  private async updateLastUsedAt(apiKeyId: string): Promise<void> {
    await this.apiKeyRepository.update(apiKeyId, {
      lastUsedAt: new Date(),
    });
  }

  /**
   * APIキー統計取得
   */
  async getApiKeyStats(apiKeyId: string): Promise<{
    totalRequests: number;
    lastUsedAt: Date;
    isActive: boolean;
    rateLimitPerHour: number;
  }> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId },
      relations: ['rateLimitTracking'],
    });

    if (!apiKey) {
      throw new NotFoundException('APIキーが見つかりません');
    }

    // レート制限追跡データから総リクエスト数を計算
    const totalRequests = apiKey.rateLimitTracking?.reduce(
      (sum, tracking) => sum + tracking.requestCount,
      0
    ) || 0;

    return {
      totalRequests,
      lastUsedAt: apiKey.lastUsedAt,
      isActive: apiKey.isActive,
      rateLimitPerHour: apiKey.rateLimitPerHour,
    };
  }
}