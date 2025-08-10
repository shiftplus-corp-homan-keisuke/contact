/**
 * ユーザーリポジトリのテスト
 * 要件: 4.1, 4.2 (ユーザー管理機能のテスト)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from '../user.repository';
import { User } from '../../entities/user.entity';
import { UserHistory } from '../../entities/user-history.entity';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockUserRepo: Partial<Repository<User>>;
  let mockUserHistoryRepo: Partial<Repository<UserHistory>>;

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockUserHistoryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(UserHistory),
          useValue: mockUserHistoryRepo,
        },
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
  });

  describe('findByEmail', () => {
    it('メールアドレスでユーザーを取得できる', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockUserRepo.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('test@example.com');

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['role']
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('recordUserHistory', () => {
    it('ユーザー履歴を記録できる', async () => {
      const mockHistory = { id: '1', userId: '1', fieldName: 'name' };
      mockUserHistoryRepo.create = jest.fn().mockReturnValue(mockHistory);
      mockUserHistoryRepo.save = jest.fn().mockResolvedValue(mockHistory);

      const result = await userRepository.recordUserHistory(
        '1', 'name', 'Old Name', 'New Name', 'admin'
      );

      expect(mockUserHistoryRepo.create).toHaveBeenCalled();
      expect(mockUserHistoryRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockHistory);
    });
  });
});