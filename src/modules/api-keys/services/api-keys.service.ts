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
}