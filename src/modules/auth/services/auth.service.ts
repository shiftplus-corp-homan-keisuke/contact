/**
 * 認証サービス
 * 要件: 4.1, 4.2 (ユーザー管理機能)
 */

import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../users/entities/role.entity';
import { UserRepository } from '../../users/repositories/user.repository';
import { AuthAttempt } from '../entities/auth-attempt.entity';
import { UserHistory } from '../../users/entities/user-history.entity';
import { LoginDto, CreateUserDto, UpdateUserDto, AuthResponseDto } from '../dto/auth.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string;
  permissions: any[];
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: {
      id: string;
      name: string;
      permissions: any[];
    };
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(AuthAttempt)
    private readonly authAttemptRepository: Repository<AuthAttempt>,
    @InjectRepository(UserHistory)
    private readonly userHistoryRepository: Repository<UserHistory>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * ユーザーログイン
   * 要件: 4.2 - 認証情報を検証してアクセスを許可または拒否
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const { email, password } = loginDto;

    try {
      // ユーザーを検索（役割情報も含む）
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        await this.logAuthAttempt(email, false, 'ユーザーが見つかりません', ipAddress, userAgent);
        throw new UnauthorizedException('認証に失敗しました');
      }

      // パスワード検証
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        await this.logAuthAttempt(email, false, 'パスワードが正しくありません', ipAddress, userAgent);
        throw new UnauthorizedException('認証に失敗しました');
      }

      // 成功ログ
      await this.logAuthAttempt(email, true, null, ipAddress, userAgent);

      // JWTトークン生成
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        roleId: user.roleId,
        permissions: user.role.permissions,
      };

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign({ sub: user.id }, { expiresIn: '7d' });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: {
            id: user.role.id,
            name: user.role.name,
            permissions: user.role.permissions,
          },
        },
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1時間
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      await this.logAuthAttempt(email, false, 'システムエラー', ipAddress, userAgent);
      throw new UnauthorizedException('認証に失敗しました');
    }
  }

  /**
   * ユーザー作成
   * 要件: 4.1 - ユーザー情報を保存し、認証情報を生成
   */
  async createUser(createUserDto: CreateUserDto, createdBy?: string): Promise<User> {
    const { email, password, name, roleId, isActive = true } = createUserDto;

    // メールアドレスの重複チェック
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('このメールアドレスは既に使用されています');
    }

    // 役割の存在確認
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new BadRequestException('指定された役割が見つかりません');
    }

    // パスワードハッシュ化
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ユーザー作成
    const savedUser = await this.userRepository.create({
      email,
      passwordHash,
      name,
      roleId,
      isActive,
    });

    // 作成履歴記録
    if (createdBy) {
      await this.recordUserHistory(savedUser.id, 'created', null, 'ユーザー作成', createdBy);
    }

    return savedUser;
  }

  /**
   * ユーザー更新
   * 要件: 4.3 - ユーザー情報更新時の変更履歴記録
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto, updatedBy: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    const oldValues = { ...user };

    // 更新データの適用
    if (updateUserDto.email !== undefined) {
      // メールアドレスの重複チェック
      if (updateUserDto.email !== user.email) {
        const existingUser = await this.userRepository.findByEmail(updateUserDto.email);
        if (existingUser) {
          throw new ConflictException('このメールアドレスは既に使用されています');
        }
      }
      user.email = updateUserDto.email;
    }

    if (updateUserDto.password !== undefined) {
      const saltRounds = 12;
      user.passwordHash = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.roleId !== undefined) {
      // 役割の存在確認
      const role = await this.roleRepository.findOne({ where: { id: updateUserDto.roleId } });
      if (!role) {
        throw new BadRequestException('指定された役割が見つかりません');
      }
      user.roleId = updateUserDto.roleId;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    const updatedUser = await this.userRepository.update(userId, user);

    // 変更履歴記録
    await this.recordUserChanges(oldValues, updatedUser, updatedBy);

    return updatedUser;
  }

  /**
   * トークン検証
   */
  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('無効なトークンです');
    }
  }

  /**
   * ユーザーIDでユーザー取得
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findUserWithDetails(userId);

    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    return user;
  }

  /**
   * ユーザー履歴取得
   */
  async getUserHistory(userId: string): Promise<UserHistory[]> {
    return this.userHistoryRepository.find({
      where: { userId },
      relations: ['changedByUser'],
      order: { changedAt: 'DESC' },
    });
  }

  /**
   * リフレッシュトークンでアクセストークン更新
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.getUserById(payload.sub);

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        roleId: user.roleId,
        permissions: user.role.permissions,
      };

      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '1h' });

      return {
        accessToken,
        expiresIn: 3600,
      };
    } catch (error) {
      throw new UnauthorizedException('無効なリフレッシュトークンです');
    }
  }

  /**
   * 認証試行ログ記録
   * 要件: 4.4 - 無効な認証情報でのアクセス試行ログ記録
   */
  private async logAuthAttempt(
    email: string,
    success: boolean,
    failureReason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const authAttempt = this.authAttemptRepository.create({
      email,
      success,
      failureReason,
      ipAddress,
      userAgent,
    });

    await this.authAttemptRepository.save(authAttempt);
  }

  /**
   * ユーザー履歴記録
   */
  private async recordUserHistory(
    userId: string,
    fieldName: string,
    oldValue: string,
    newValue: string,
    changedBy: string,
  ): Promise<void> {
    const history = this.userHistoryRepository.create({
      userId,
      fieldName,
      oldValue,
      newValue,
      changedBy,
    });

    await this.userHistoryRepository.save(history);
  }

  /**
   * ユーザー変更履歴記録
   */
  private async recordUserChanges(oldUser: User, newUser: User, changedBy: string): Promise<void> {
    const changes = [];

    if (oldUser.email !== newUser.email) {
      changes.push({ field: 'email', oldValue: oldUser.email, newValue: newUser.email });
    }

    if (oldUser.name !== newUser.name) {
      changes.push({ field: 'name', oldValue: oldUser.name, newValue: newUser.name });
    }

    if (oldUser.roleId !== newUser.roleId) {
      changes.push({ field: 'roleId', oldValue: oldUser.roleId, newValue: newUser.roleId });
    }

    if (oldUser.isActive !== newUser.isActive) {
      changes.push({ field: 'isActive', oldValue: oldUser.isActive.toString(), newValue: newUser.isActive.toString() });
    }

    // パスワード変更は履歴に記録しない（セキュリティ上の理由）

    for (const change of changes) {
      await this.recordUserHistory(newUser.id, change.field, change.oldValue, change.newValue, changedBy);
    }
  }
}