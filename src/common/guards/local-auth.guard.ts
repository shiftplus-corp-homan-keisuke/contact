/**
 * ローカル認証ガード
 * 要件: 4.1, 4.2 (ログイン機能)
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}