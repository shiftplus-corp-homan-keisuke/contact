/**
 * APIキー認証ガード
 * 要件: 7.1 (API認証)
 * 
 * 認証モジュール固有のガード - API認証に特化
 */

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class ApiKeyAuthGuard extends AuthGuard('api-key') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('API認証が必要です');
    }
    return user;
  }

  getRequest(context: ExecutionContext): Request {
    return context.switchToHttp().getRequest();
  }
}