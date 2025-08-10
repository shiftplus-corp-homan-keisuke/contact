/**
 * 認証サービスのテスト
 * 要件: 4.1, 4.2 (ユーザー管理機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../services/auth.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuthAttempt } from '../entities/auth-attempt.entity';
import { UserHistory } from '../entities/user-history.entity';
import { RoleType, ResourceType, ActionType } from '../types/role.types';

// bcryptのモック
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let authAttemptRepository: jest.Mocked<Repository<AuthAttempt>>;
  let userHistoryRepository: jest.Mocked<Repository<UserHistory>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockRole = {
    id: 'role-uuid',
    name: RoleType.ADMIN,
    description: '管理者',
    permissions: [
      { resource: ResourceType.USER, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    name: 'テストユーザー',
    roleId: 'role-uuid',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: mockRole,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuthAttempt),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    roleRepository = module.get(getRepositoryToken(Role));
    authAttemptRepository = module.get(getRepositoryToken(AuthAttempt));
    userHistoryRepository = module.get(getRepositoryToken(UserHistory));
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('正常なログインが成功すること', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password123' };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      authAttemptRepository.create.mockReturnValue({} as any);
      authAttemptRepository.save.mockResolvedValue({} as any);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: {
            id: mockRole.id,
            name: mockRole.name,
            permissions: mockRole.permissions,
          },
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email, isActive: true },
        relations: ['role'],
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash);
    });

    it('存在しないユーザーでログインが失敗すること', async () => {
      // Arrange
      const loginDto = { email: 'nonexistent@example.com', password: 'password123' };
      userRepository.findOne.mockResolvedValue(null);
      authAttemptRepository.create.mockReturnValue({} as any);
      authAttemptRepository.save.mockResolvedValue({} as any);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(authAttemptRepository.save).toHaveBeenCalled();
    });

    it('間違ったパスワードでログインが失敗すること', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'wrong-password' };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);
      authAttemptRepository.create.mockReturnValue({} as any);
      authAttemptRepository.save.mockResolvedValue({} as any);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(authAttemptRepository.save).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('正常なユーザー作成が成功すること', async () => {
      // Arrange
      const createUserDto = {
        email: 'new@example.com',
        password: 'password123',
        name: '新規ユーザー',
        roleId: 'role-uuid',
      };
      userRepository.findOne.mockResolvedValueOnce(null); // 重複チェック
      roleRepository.findOne.mockResolvedValue(mockRole as any);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);
      userHistoryRepository.create.mockReturnValue({} as any);
      userHistoryRepository.save.mockResolvedValue({} as any);

      // Act
      const result = await service.createUser(createUserDto, 'creator-uuid');

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
      expect(roleRepository.findOne).toHaveBeenCalledWith({ where: { id: createUserDto.roleId } });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 12);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('重複するメールアドレスでユーザー作成が失敗すること', async () => {
      // Arrange
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: '新規ユーザー',
        roleId: 'role-uuid',
      };
      userRepository.findOne.mockResolvedValue(mockUser as any); // 既存ユーザー

      // Act & Assert
      await expect(service.createUser(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('存在しない役割でユーザー作成が失敗すること', async () => {
      // Arrange
      const createUserDto = {
        email: 'new@example.com',
        password: 'password123',
        name: '新規ユーザー',
        roleId: 'nonexistent-role-uuid',
      };
      userRepository.findOne.mockResolvedValue(null);
      roleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createUser(createUserDto)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('正常なユーザー更新が成功すること', async () => {
      // Arrange
      const updateUserDto = { name: '更新されたユーザー' };
      const updatedUser = { ...mockUser, name: '更新されたユーザー' };
      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.save.mockResolvedValue(updatedUser as any);
      userHistoryRepository.create.mockReturnValue({} as any);
      userHistoryRepository.save.mockResolvedValue({} as any);

      // Act
      const result = await service.updateUser('user-uuid', updateUserDto, 'updater-uuid');

      // Assert
      expect(result.name).toBe('更新されたユーザー');
      expect(userRepository.save).toHaveBeenCalled();
      expect(userHistoryRepository.save).toHaveBeenCalled();
    });

    it('存在しないユーザーの更新が失敗すること', async () => {
      // Arrange
      const updateUserDto = { name: '更新されたユーザー' };
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateUser('nonexistent-uuid', updateUserDto, 'updater-uuid'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserById', () => {
    it('正常なユーザー取得が成功すること', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.getUserById('user-uuid');

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid', isActive: true },
        relations: ['role'],
      });
    });

    it('存在しないユーザーの取得が失敗すること', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserById('nonexistent-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('refreshToken', () => {
    it('正常なトークンリフレッシュが成功すること', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      jwtService.verify.mockReturnValue({ sub: 'user-uuid' });
      userRepository.findOne.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('new-access-token');

      // Act
      const result = await service.refreshToken(refreshToken);

      // Assert
      expect(result).toEqual({
        accessToken: 'new-access-token',
        expiresIn: 3600,
      });
      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken);
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('無効なリフレッシュトークンで失敗すること', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});