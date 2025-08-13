/**
 * レート制限ガード
 * 要件: 7.4 (レート制限機能の実装)
 */

import { Injectable, CanActivate, ExecutionContext, TooManyRequestsException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // パブリックエンドポイントの場合はスキップ
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const clientId = request.ip || request.headers['x-forwarded-for'] || 'unknown';

    // TODO: レート制限の検証ロジックを実装
    // 現在は仮実装
    return true;
  }
}