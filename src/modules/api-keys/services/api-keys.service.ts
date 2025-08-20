/**
 * APIキーサービス
 * 要件7.1: APIキー認証機能の実装
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyContext, ApiKeyUsageStats } from '../types/api-key.types';

@Injectable()
export class ApiKeysService {
    private readonly logger = new Logger(ApiKeysService.name);

    constructor(
        @InjectRepository(ApiKey)
        private readonly apiKeyRepository: Repository<ApiKey>,
    ) { }

    /**
     * APIキーを検証してコンテキストを返す
     * 要件7.1: APIキー認証機能の実装
     */
    async validateApiKey(apiKey: string): Promise<ApiKeyContext | null> {
        try {
            // APIキーをハッシュ化して検索（実際の実装では適切なハッシュ化が必要）
            const keyRecord = await this.apiKeyRepository.findOne({
                where: {
                    keyHash: this.hashApiKey(apiKey),
                    isActive: true,
                },
                relations: ['application'],
            });

            if (!keyRecord) {
                return null;
            }

            // 有効期限チェック
            if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
                this.logger.warn(`期限切れAPIキー使用: ${keyRecord.name}`);
                return null;
            }

            // 最終使用日時を更新
            await this.updateLastUsedAt(keyRecord.id);

            return {
                id: keyRecord.id,
                appId: keyRecord.appId,
                name: keyRecord.name,
                permissions: keyRecord.permissions || [],
                rateLimit: {
                    windowMs: keyRecord.rateLimitWindow * 1000, // 秒をミリ秒に変換
                    maxRequests: keyRecord.rateLimitMax,
                },
                isActive: keyRecord.isActive,
                expiresAt: keyRecord.expiresAt,
                lastUsedAt: keyRecord.lastUsedAt,
            };

        } catch (error) {
            this.logger.error(`APIキー検証エラー: ${error.message}`, error.stack);
            return null;
        }
    }

    /**
     * APIキー使用統計を記録
     * 要件7.1: APIキー認証機能の実装
     */
    async recordApiKeyUsage(apiKey: string, stats: ApiKeyUsageStats): Promise<void> {
        try {
            const keyHash = this.hashApiKey(apiKey);

            // 使用統計をログに記録（実際の実装では専用テーブルに保存）
            this.logger.log(`APIキー使用: ${keyHash.substring(0, 8)}... ${stats.method} ${stats.endpoint} from ${stats.ip}`);

            // 使用回数を更新
            await this.apiKeyRepository
                .createQueryBuilder()
                .update(ApiKey)
                .set({
                    usageCount: () => 'usage_count + 1',
                    lastUsedAt: new Date(),
                })
                .where('key_hash = :keyHash', { keyHash })
                .execute();

        } catch (error) {
            this.logger.error(`APIキー使用統計記録エラー: ${error.message}`, error.stack);
            // エラーが発生してもリクエストは継続
        }
    }

    /**
     * 最終使用日時を更新
     */
    private async updateLastUsedAt(apiKeyId: string): Promise<void> {
        try {
            await this.apiKeyRepository.update(apiKeyId, {
                lastUsedAt: new Date(),
            });
        } catch (error) {
            this.logger.error(`最終使用日時更新エラー: ${error.message}`, error.stack);
        }
    }

    /**
     * APIキーをハッシュ化
     * 注意: 実際の実装では適切な暗号化ハッシュ関数を使用してください
     */
    private hashApiKey(apiKey: string): string {
        // 簡易実装（実際にはbcryptやscryptなどを使用）
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(apiKey).digest('hex');
    }
    /**
     * 全てのAPIキーを取得
     */
    async findAll(): Promise<ApiKey[]> {
        return this.apiKeyRepository.find({
            relations: ['application'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * IDでAPIキーを取得
     */
    async findById(id: string): Promise<ApiKey | null> {
        return this.apiKeyRepository.findOne({
            where: { id },
            relations: ['application'],
        });
    }

    /**
     * APIキーを作成
     */
    async create(createDto: any): Promise<{ apiKey: ApiKey; plainKey: string }> {
        // 新しいAPIキーを生成
        const plainKey = this.generateApiKey();
        const keyHash = this.hashApiKey(plainKey);

        const apiKeyData = {
            ...createDto,
            keyHash,
            usageCount: 0,
        };

        const apiKey = this.apiKeyRepository.create(apiKeyData);
        const savedApiKey = await this.apiKeyRepository.save(apiKey);

        return {
            apiKey: Array.isArray(savedApiKey) ? savedApiKey[0] : savedApiKey,
            plainKey,
        };
    }

    /**
     * APIキーを更新
     */
    async update(id: string, updateDto: any): Promise<ApiKey | null> {
        await this.apiKeyRepository.update(id, updateDto);
        return this.findById(id);
    }

    /**
     * APIキーを削除
     */
    async remove(id: string): Promise<void> {
        await this.apiKeyRepository.delete(id);
    }

    /**
     * APIキーを再生成
     */
    async regenerate(id: string): Promise<{ apiKey: ApiKey; plainKey: string }> {
        const apiKey = await this.findById(id);
        if (!apiKey) {
            throw new Error('APIキーが見つかりません');
        }

        // 新しいキーを生成
        const plainKey = this.generateApiKey();
        const keyHash = this.hashApiKey(plainKey);

        await this.apiKeyRepository.update(id, {
            keyHash,
            lastUsedAt: null,
            usageCount: 0,
        });

        const updatedApiKey = await this.findById(id);
        return {
            apiKey: updatedApiKey,
            plainKey,
        };
    }

    /**
     * 使用統計を取得
     */
    async getUsageStats(id: string, days?: number): Promise<any> {
        const apiKey = await this.findById(id);
        if (!apiKey) {
            throw new Error('APIキーが見つかりません');
        }

        return {
            totalUsage: apiKey.usageCount,
            lastUsedAt: apiKey.lastUsedAt,
            // 実際の実装では詳細な統計データを返す
        };
    }

    /**
     * レート制限チェック
     */
    async checkRateLimit(apiKey: string): Promise<any> {
        // 実際の実装ではRedisなどを使用してレート制限をチェック
        return {
            allowed: true,
            remaining: 100,
            resetTime: new Date(Date.now() + 3600000), // 1時間後
        };
    }

    /**
     * APIキーを生成
     */
    private generateApiKey(): string {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }
}