/**
 * JWT認証戦略
 * 要件: 4.1, 4.2 (JWT認証の設定とPassport.js統合)
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../services/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'default-secret-key'),
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.authService.getUserById(payload.sub);
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('ユーザーが無効です');
      }

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        role: user.role,
        permissions: user.role.permissions,
      };
    } catch (error) {
      throw new UnauthorizedException('認証に失敗しました');
    }
  }
}