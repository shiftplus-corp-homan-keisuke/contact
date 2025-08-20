import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { AuthAttempt } from './entities/auth-attempt.entity';
import { UsersModule } from '../users/users.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
    imports: [
        // Passport設定
        PassportModule.register({ defaultStrategy: 'jwt' }),

        // JWT設定
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET', 'default-secret-key'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
                },
            }),
            inject: [ConfigService],
        }),

        // TypeORM設定
        TypeOrmModule.forFeature([AuthAttempt]),

        // 依存モジュール
        UsersModule,
        ApiKeysModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        ApiKeyStrategy,
    ],
    exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule { }