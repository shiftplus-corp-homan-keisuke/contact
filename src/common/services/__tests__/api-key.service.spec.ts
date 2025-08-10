/**
 * APIキーサービステスト
 * 要件: 7.1, 7.4 (API認証とレート制限)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ApiKeyService } from '../api-key.service';
import { ApiKey } from '../../entities/api-key.entity';
import { Application } from '../../entities/application.entity';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let apiKeyRepository: jest.Mocked<Repository<ApiKey>>;
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let configService: jest.Mocked<ConfigService>;

  const mockApplication = {
    id: 'app-uuid',
    name: 'Test App',
    description: 'Test Application',
  };

  const mockApiKey = {
    id: 'api-key-uuid',
    appId: 'app-uuid',
    keyHash: 'hashed-key',
    name: 'Test API Key',
    permissions: ['inquiry:create', 'inquiry:read'],
    rateLimitPerHour: 1000,
    isActive: true,
    createdAt: new Date(),
    lastUsedAt: null,
    expiresAt: null,
    application: mockApplication,
    rateLimitTracking: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    apiKeyRepository = module.get(getRepositoryToken(ApiKey));
    applicationRepository = module.get(getRepositoryToken(Application));
    configService = module.get(ConfigService);
  });

  describe('generateApiKey', () => {
    it('アプリケーションが存在する場合、APIキーを正常に生成する', async () => {
      // Arrange
      const createApiKeyDto = {
        appId: 'app-uuid',
        name: 'Test API Key',
        permissions: ['inquiry:create'],
        rateLimitPerHour: 1000,
      };

      applicationRepository.findOne.mockResolvedValue(mockApplication as any);
      apiKeyRepository.create.mockReturnValue(mockApiKey as any);
      apiKeyRepository.save.mockResolvedValue(mockApiKey as any);

      // Act
      const result = await service.generateApiKey(createApiKeyDto);

      // Assert
      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: createApiKeyDto.appId },
      });
      expect(apiKeyRepository.create).toHaveBeenCalled();
      expect(apiKeyRepository.save).toHaveBeenCalled();
      expect(result.apiKey).toMatch(/^ims_/);
      expect(result.appId).toBe(createApiKeyDto.appId);
      expect(result.name).toBe(createApiKeyDto.name);
    });

    it('アプリケーションが存在しない場合、NotFoundExceptionを投げる', async () => {
      // Arrange
      const createApiKeyDto = {
        appId: 'non-existent-app',
        name: 'Test API Key',
      };

      applicationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateApiKey(createApiKeyDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateApiKey', () => {
    it('有効なAPIキーの場合、APIキーコンテキストを返す', async () => {
      // Arrange
      const apiKey = 'ims_valid-api-key';
      const hashedKey = await bcrypt.hash(apiKey, 12);
      const mockApiKeyWithHash = { ...mockApiKey, keyHash: hashedKey };

      apiKeyRepository.find.mockResolvedValue([mockApiKeyWithHash as any]);
      apiKeyRepository.update = jest.fn().mockResolvedValue({ affected: 1 });

      // Act
      const result = await service.validateApiKey(apiKey);

      // Assert
      expect(result.appId).toBe(mockApiKey.appId);
      expect(result.permissions).toEqual(mockApiKey.permissions);
      expect(result.isActive).toBe(true);
      expect(result.apiKeyId).toBe(mockApiKey.id);
    });

    it('無効な形式のAPIキーの場合、UnauthorizedExceptionを投げる', async () => {
      // Arrange
      const invalidApiKey = 'invalid-format';

      // Act & Assert
      await expect(service.validateApiKey(invalidApiKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('存在しないAPIキーの場合、UnauthorizedExceptionを投げる', async () => {
      // Arrange
      const apiKey = 'ims_non-existent-key';
      apiKeyRepository.find.mockResolvedValue([]);

      // Act & Assert
      await expect(service.validateApiKey(apiKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('有効期限切れのAPIキーの場合、UnauthorizedExceptionを投げる', async () => {
      // Arrange
      const apiKey = 'ims_expired-key';
      const hashedKey = await bcrypt.hash(apiKey, 12);
      const expiredApiKey = {
        ...mockApiKey,
        keyHash: hashedKey,
        expiresAt: new Date(Date.now() - 1000), // 1秒前に期限切れ
      };

      apiKeyRepository.find.mockResolvedValue([expiredApiKey as any]);

      // Act & Assert
      await expect(service.validateApiKey(apiKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getApiKeysByApp', () => {
    it('指定されたアプリのAPIキー一覧を返す', async () => {
      // Arrange
      const appId = 'app-uuid';
      const mockApiKeys = [mockApiKey];

      apiKeyRepository.find.mockResolvedValue(mockApiKeys as any);

      // Act
      const result = await service.getApiKeysByApp(appId);

      // Assert
      expect(apiKeyRepository.find).toHaveBeenCalledWith({
        where: { appId },
        relations: ['application'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockApiKeys);
    });
  });

  describe('revokeApiKey', () => {
    it('存在するAPIキーを無効化する', async () => {
      // Arrange
      const apiKeyId = 'api-key-uuid';
      const activeApiKey = { ...mockApiKey, isActive: true };

      apiKeyRepository.findOne.mockResolvedValue(activeApiKey as any);
      apiKeyRepository.save.mockResolvedValue({ ...activeApiKey, isActive: false } as any);

      // Act
      await service.revokeApiKey(apiKeyId);

      // Assert
      expect(apiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId },
      });
      expect(apiKeyRepository.save).toHaveBeenCalledWith({
        ...activeApiKey,
        isActive: false,
      });
    });

    it('存在しないAPIキーの場合、NotFoundExceptionを投げる', async () => {
      // Arrange
      const apiKeyId = 'non-existent-key';
      apiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.revokeApiKey(apiKeyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getApiKeyStats', () => {
    it('APIキー統計を正常に取得する', async () => {
      // Arrange
      const apiKeyId = 'api-key-uuid';
      const mockApiKeyWithTracking = {
        ...mockApiKey,
        rateLimitTracking: [
          { requestCount: 100 },
          { requestCount: 200 },
        ],
        lastUsedAt: new Date(),
      };

      apiKeyRepository.findOne.mockResolvedValue(mockApiKeyWithTracking as any);

      // Act
      const result = await service.getApiKeyStats(apiKeyId);

      // Assert
      expect(result.totalRequests).toBe(300);
      expect(result.isActive).toBe(true);
      expect(result.rateLimitPerHour).toBe(1000);
      expect(result.lastUsedAt).toBeDefined();
    });

    it('存在しないAPIキーの場合、NotFoundExceptionを投げる', async () => {
      // Arrange
      const apiKeyId = 'non-existent-key';
      apiKeyRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getApiKeyStats(apiKeyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});