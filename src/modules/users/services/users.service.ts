import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserHistory } from '../entities/user-history.entity';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(UserHistory)
        private readonly userHistoryRepository: Repository<UserHistory>,
    ) { }

    /**
     * ユーザー作成
     */
    async create(createUserDto: CreateUserDto): Promise<User> {
        // メールアドレスの重複チェック
        const existingUser = await this.findByEmail(createUserDto.email);
        if (existingUser) {
            throw new ConflictException('このメールアドレスは既に使用されています');
        }

        const user = this.userRepository.create(createUserDto);
        const savedUser = await this.userRepository.save(user);

        this.logger.log(`ユーザー作成: ${savedUser.email} (ID: ${savedUser.id})`);
        return savedUser;
    }

    /**
     * ID でユーザー検索
     */
    async findById(id: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id },
            relations: ['role'],
        });
    }

    /**
     * メールアドレスでユーザー検索
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { email },
            relations: ['role'],
        });
    }

    /**
     * 全ユーザー取得
     */
    async findAll(): Promise<User[]> {
        return this.userRepository.find({
            relations: ['role'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * ユーザー更新
     */
    async update(id: string, updateUserDto: UpdateUserDto, updatedBy?: string): Promise<User> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('ユーザーが見つかりません');
        }

        // メールアドレス変更時の重複チェック
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.findByEmail(updateUserDto.email);
            if (existingUser) {
                throw new ConflictException('このメールアドレスは既に使用されています');
            }
        }

        // 変更履歴の記録
        await this.recordUserChanges(user, updateUserDto, updatedBy);

        // ユーザー情報更新
        Object.assign(user, updateUserDto);
        const updatedUser = await this.userRepository.save(user);

        this.logger.log(`ユーザー更新: ${updatedUser.email} (ID: ${updatedUser.id})`);
        return updatedUser;
    }

    /**
     * パスワード更新
     */
    async updatePassword(id: string, passwordHash: string, updatedBy?: string): Promise<void> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('ユーザーが見つかりません');
        }

        // パスワード変更履歴の記録
        await this.recordPasswordChange(user.id, updatedBy);

        // パスワード更新
        user.passwordHash = passwordHash;
        await this.userRepository.save(user);

        this.logger.log(`パスワード更新: ${user.email} (ID: ${user.id})`);
    }

    /**
     * 最終ログイン時刻更新
     */
    async updateLastLogin(id: string): Promise<void> {
        await this.userRepository.update(id, {
            lastLoginAt: new Date(),
        });
    }

    /**
     * ユーザー削除（ソフトデリート）
     */
    async remove(id: string, deletedBy?: string): Promise<void> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('ユーザーが見つかりません');
        }

        // 削除履歴の記録
        await this.recordUserDeletion(user.id, deletedBy);

        // ソフトデリート
        user.isActive = false;
        await this.userRepository.save(user);

        this.logger.log(`ユーザー削除: ${user.email} (ID: ${user.id})`);
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
     * ユーザー変更履歴の記録
     */
    private async recordUserChanges(
        originalUser: User,
        updates: UpdateUserDto,
        changedBy?: string,
    ): Promise<void> {
        const changes: Array<{
            fieldName: string;
            oldValue: string;
            newValue: string;
        }> = [];

        // 変更されたフィールドを特定
        Object.keys(updates).forEach((key) => {
            const oldValue = originalUser[key];
            const newValue = updates[key];

            if (oldValue !== newValue) {
                changes.push({
                    fieldName: key,
                    oldValue: oldValue?.toString() || null,
                    newValue: newValue?.toString() || null,
                });
            }
        });

        // 履歴レコード作成
        for (const change of changes) {
            const history = this.userHistoryRepository.create({
                userId: originalUser.id,
                fieldName: change.fieldName,
                oldValue: change.oldValue,
                newValue: change.newValue,
                changedBy,
                changedAt: new Date(),
            });

            await this.userHistoryRepository.save(history);
        }
    }

    /**
     * パスワード変更履歴の記録
     */
    private async recordPasswordChange(userId: string, changedBy?: string): Promise<void> {
        const history = this.userHistoryRepository.create({
            userId,
            fieldName: 'password',
            oldValue: '[HIDDEN]',
            newValue: '[HIDDEN]',
            changedBy,
            changedAt: new Date(),
            comment: 'パスワード変更',
        });

        await this.userHistoryRepository.save(history);
    }

    /**
     * ユーザー削除履歴の記録
     */
    private async recordUserDeletion(userId: string, deletedBy?: string): Promise<void> {
        const history = this.userHistoryRepository.create({
            userId,
            fieldName: 'isActive',
            oldValue: 'true',
            newValue: 'false',
            changedBy: deletedBy,
            changedAt: new Date(),
            comment: 'ユーザー削除',
        });

        await this.userHistoryRepository.save(history);
    }
}