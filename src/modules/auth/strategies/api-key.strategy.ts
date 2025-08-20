import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ApiKeysService } from '../../api-keys/services/api-keys.service';
import { ApiKeyContext } from '../types/auth.types';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    constructor(private readonly apiKeysService: ApiKeysService) {
        super();
    }

    async validate(req: Request): Promise<ApiKeyContext> {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            throw new UnauthorizedException('APIキーが必要です');
        }

        try {
            const context = await this.apiKeysService.validateApiKey(apiKey);
            if (!context.isActive) {
                throw new UnauthorizedException('無効なAPIキーです');
            }

            // レート制限チェック
            const rateLimitStatus = await this.apiKeysService.checkRateLimit(apiKey);
            if (rateLimitStatus.isExceeded) {
                throw new UnauthorizedException('レート制限を超過しました');
            }

            return context;
        } catch (error) {
            throw new UnauthorizedException('無効なAPIキーです');
        }
    }
}