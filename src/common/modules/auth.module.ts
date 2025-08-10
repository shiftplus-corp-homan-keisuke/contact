/**
 * 認証・認可モジュール
 * 要件: 4.1, 4.2, 5.1, 5.2, 5.3, 5.4 (認証・権限管理機能)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// エンティティ
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuthAttempt } from '../entities/auth-attempt.entity';
import { UserHistory } from '../entities/user-history.entity';

// サービス
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';
import { PermissionService } from '../services/permission.service';
import { SecurityMonitoringService } from '../services/security-monitoring.service';

// ストラテジー
import { JwtStrategy } from '../strategies/jwt.strategy';
import { LocalStrategy } from '../strategies/local.strategy';

// ガード
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

// コントローラー
import { RoleController } from '../controllers/role.controller';
import { AuthController } from '../controllers/auth.controller';
import { SecurityMonitoringController } from '../controllers/security-monitoring.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      AuthAttempt,
      UserHistory,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
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
  providers: [
    // サービス
    AuthService,
    RoleService,
    PermissionService,
    SecurityMonitoringService,
    
    // ストラテジー
    JwtStrategy,
    LocalStrategy,
    
    // ガード
    JwtAuthGuard,
    LocalAuthGuard,
    PermissionsGuard,
  ],
  controllers: [
    RoleController,
    AuthController,
    SecurityMonitoringController,
  ],
  exports: [
    // サービス
    AuthService,
    RoleService,
    PermissionService,
    SecurityMonitoringService,
    
    // ガード
    JwtAuthGuard,
    LocalAuthGuard,
    PermissionsGuard,
    
    // JWT モジュール
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}