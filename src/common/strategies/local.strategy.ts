/**
 * ローカル認証戦略
 * 要件: 4.1, 4.2 (ユーザー登録・ログイン機能の実装)
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../services/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: any, email: string, password: string): Promise<any> {
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    try {
      const result = await this.authService.login(
        { email, password },
        ipAddress,
        userAgent,
      );
      return result;
    } catch (error) {
      throw new UnauthorizedException('認証に失敗しました');
    }
  }
}