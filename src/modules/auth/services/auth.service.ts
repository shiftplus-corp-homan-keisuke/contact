import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../../users/services/users.service';
import { PermissionsService } from '../../users/services/permissions.service';
import { AuthAttempt } from '../entities/auth-attempt.entity';
import { RegisterDto } from '../dto/auth.dto';
import { AuthResult, UserContext, LoginContext } from '../types/auth.types';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly saltRounds = 12;

    constructor(
        private readonly usersService: UsersService,
        private readonly permissionsService: PermissionsService,
        private readonly jwtService: JwtService,
        @InjectRepository(AuthAttempt)
        private readonly authAttemptRepository: Repository<AuthAttempt>,
    ) { }

    /**
     * ユーザー認証（Local Strategy用）
     */
    async validateUser(email: string, password: string): Promise<User | null> {
        try {
            const user = await this.usersService.findByEmail(email);
            if (!user) {
                await this.logAuthAttempt(email, false, 'ユーザーが見つかりません');
                return null;
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                await this.logAuthAttempt(email, false, 'パスワードが間違っています');
                return null;
            }

            if (!user.isActive) {
                await this.logAuthAttempt(email, false, 'アカウントが無効です');
                return null;
            }

            await this.logAuthAttempt(email, true);
            return user;
        } catch (error) {
            this.logger.error(`認証エラー: ${email}`, error.stack);
            await this.logAuthAttempt(email, false, 'システムエラー');
            return null;
        }
    }

    /**
     * ログイン処理
     */
    async login(user: User, context: LoginContext): Promise<AuthResult> {
        const payload = {
            sub: user.id,
            email: user.email,
            roleId: user.roleId,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        // 最終ログイン時刻を更新
        await this.usersService.updateLastLogin(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                roleId: user.roleId,
                permissions: [],
            },
            accessToken,
            refreshToken,
            expiresIn: 24 * 60 * 60, // 24時間（秒）
        };
    }

    /**
     * ユーザー登録
     */
    async register(registerDto: RegisterDto, context: LoginContext): Promise<AuthResult> {
        // メールアドレスの重複チェック
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            throw new ConflictException('このメールアドレスは既に使用されています');
        }

        // パスワードハッシュ化
        const passwordHash = await this.hashPassword(registerDto.password);

        // ユーザー作成
        const user = await this.usersService.create({
            email: registerDto.email,
            name: registerDto.name,
            passwordHash,
            roleId: registerDto.roleId,
        });

        // ログイン処理
        return this.login(user, context);
    }

    /**
     * トークンリフレッシュ
     */
    async refreshToken(refreshToken: string): Promise<AuthResult> {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.usersService.findById(payload.sub);

            if (!user || !user.isActive) {
                throw new UnauthorizedException('無効なリフレッシュトークンです');
            }

            return this.login(user, { ip: '', userAgent: '' });
        } catch (error) {
            this.logger.error('トークンリフレッシュエラー', error.stack);
            throw new UnauthorizedException('無効なリフレッシュトークンです');
        }
    }

    /**
     * ログアウト処理
     */
    async logout(userId: string): Promise<void> {
        // 実装: トークンブラックリスト機能（Redis使用）
        // 現在は何もしない（JWTの性質上、クライアント側でトークンを削除）
        this.logger.log(`ユーザーログアウト: ${userId}`);
    }

    /**
     * パスワード変更
     */
    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string,
    ): Promise<void> {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('ユーザーが見つかりません');
        }

        // 現在のパスワード確認
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            throw new BadRequestException('現在のパスワードが間違っています');
        }

        // 新しいパスワードをハッシュ化
        const newPasswordHash = await this.hashPassword(newPassword);

        // パスワード更新
        await this.usersService.updatePassword(userId, newPasswordHash);
    }

    /**
     * JWT検証（JWT Strategy用）
     */
    async validateJwtPayload(payload: any): Promise<UserContext> {
        const user = await this.usersService.findById(payload.sub);
        if (!user || !user.isActive) {
            throw new UnauthorizedException('無効なトークンです');
        }

        const permissions = await this.permissionsService.getUserPermissions(user.id);

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
            permissions,
        };
    }

    /**
     * パスワードハッシュ化
     */
    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    /**
     * 認証試行ログ記録
     */
    private async logAuthAttempt(
        email: string,
        success: boolean,
        failureReason?: string,
        ip?: string,
        userAgent?: string,
    ): Promise<void> {
        try {
            const authAttempt = this.authAttemptRepository.create({
                email,
                success,
                failureReason,
                ipAddress: ip,
                userAgent,
            });

            await this.authAttemptRepository.save(authAttempt);
        } catch (error) {
            this.logger.error('認証試行ログ記録エラー', error.stack);
        }
    }

    /**
     * 疑わしい活動の検出
     */
    async detectSuspiciousActivity(userId: string): Promise<any[]> {
        // 実装: 短時間での複数回ログイン失敗、異常なIPアドレスからのアクセスなど
        // 現在は空配列を返す
        return [];
    }
}