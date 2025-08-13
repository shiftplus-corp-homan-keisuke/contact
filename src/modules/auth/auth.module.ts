/**
 * 認証モジュール
 * 要件: 4.1, 4.2 (認証機能の独立性確保)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// エンティティ
import { User } from '../users/entities/user.entity';
import { Role } from '../users/entities/role.entity';
import { AuthAttempt } from './entities/auth-attempt.entity';
import { UserHistory } from '../users/entities/user-history.entity';

// サービス
import { AuthService } from './services/auth.service';

// リポジトリ
import { UserRepository } from '../users/repositories/user.repository';

// コントローラー
import { AuthController } from './controllers/auth.controller';

// 戦略
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

// ガード
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, AuthAttempt, UserHistory]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserRepository, JwtStrategy, LocalStrategy, JwtAuthGuard, LocalAuthGuard, ApiKeyAuthGuard, RateLimitGuard],
  exports: [AuthService, JwtAuthGuard, LocalAuthGuard, ApiKeyAuthGuard, RateLimitGuard, JwtStrategy, LocalStrategy],
})
export class AuthModule {}