import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FileService } from '../../../modules/files/services/file.service';
import { FileRepository } from '../../repositories/file.repository';
import { File } from '../../entities/file.entity';
import { FileScanResult } from '../../types/file.types';

describe('FileService', () => {
  let service: FileService;
  let fileRepository: jest.Mocked<FileRepository>;
  let configService: jest.Mocked<ConfigService>;

  const mockFile: Partial<File> = {
    id: 'test-file-id',
    filename: 'test_file.pdf',
    originalFilename: 'test file.pdf',
    size: 1024,
    mimeType: 'application/pdf',
    filePath: '/uploads/2024/01/test_file.pdf',
    fileHash: 'abc123',
    inquiryId: 'inquiry-id',
    uploadedBy: 'user-id',
    uploadedAt: new Date(),
    isScanned: true,
    scanResult: FileScanResult.CLEAN,
    scannedAt: new Date(),
    description: 'テストファイル',
    downloadCount: 0,
    lastDownloadedAt: null,
    expiresAt: null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMulterFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test file.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test file content'),
    destination: '',
    filename: '',
    path: '',
    stream: null
  };

  beforeEach(async () => {
    const mockFileRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByInquiryId: jest.fn(),
      findByFileHash: jest.fn(),
      searchFiles: jest.fn(),
      softDelete: jest.fn(),
      incrementDownloadCount: jest.fn(),
      getFileStatistics: jest.fn(),
      getStorageUsageByApp: jest.fn(),
      findExpiredFiles: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config = {
          'FILE_ALLOWED_MIME_TYPES': 'image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'FILE_ALLOWED_EXTENSIONS': '.jpg,.jpeg,.png,.gif,.pdf,.txt,.doc,.docx',
          'FILE_MAX_SIZE': '10485760', // 10MB
          'FILE_STORAGE_PATH': './uploads',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: FileRepository,
          useValue: mockFileRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    fileRepository = module.get(FileRepository);
    configService = module.get(ConfigService);

    // ConfigServiceのモック設定
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        FILE_MAX_SIZE: 10 * 1024 * 1024,
        FILE_ALLOWED_MIME_TYPES: 'application/pdf,image/jpeg,image/png',
        FILE_ALLOWED_EXTENSIONS: '.pdf,.jpg,.jpeg,.png',
        FILE_UPLOAD_DIR: './uploads',
        FILE_MAX_FILENAME_LENGTH: 255,
        STORAGE_TOTAL_SIZE: 100 * 1024 * 1024 * 1024,
      };
      return config[key] || defaultValue;
    });
  });

  describe('uploadFile', () => {
    it('有効なファイルをアップロードできること', async () => {
      // Arrange
      fileRepository.findByFileHash.mockResolvedValue(null);
      fileRepository.create.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.uploadFile(
        mockMulterFile,
        'inquiry-id',
        'user-id',
        'テストファイル'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(result.file.originalFilename).toBe('test file.pdf');
      expect(fileRepository.save).toHaveBeenCalled();
    });

    it('重複ファイルの場合はエラーを返すこと', async () => {
      // Arrange
      fileRepository.findByFileHash.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.uploadFile(
        mockMulterFile,
        'inquiry-id',
        'user-id'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('同じファイルが既にアップロードされています');
    });

    it('ファイルサイズが上限を超える場合はエラーを返すこと', async () => {
      // Arrange
      const largeFile = {
        ...mockMulterFile,
        size: 20 * 1024 * 1024, // 20MB
      };

      // Act
      const result = await service.uploadFile(
        largeFile,
        'inquiry-id',
        'user-id'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('ファイルサイズが上限');
    });

    it('許可されていないファイル形式の場合はエラーを返すこと', async () => {
      // Arrange
      const invalidFile = {
        ...mockMulterFile,
        mimetype: 'application/exe',
        originalname: 'virus.exe',
      };

      // Act
      const result = await service.uploadFile(
        invalidFile,
        'inquiry-id',
        'user-id'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('許可されていないファイル形式');
    });
  });

  describe('downloadFile', () => {
    it('存在するファイルをダウンロードできること', async () => {
      // Arrange
      fileRepository.findById.mockResolvedValue(mockFile as File);
      fileRepository.incrementDownloadCount.mockResolvedValue(undefined);

      // Mock fs.access
      jest.doMock('fs/promises', () => ({
        access: jest.fn().mockResolvedValue(undefined),
      }));

      // Act
      const result = await service.downloadFile('test-file-id', 'user-id');

      // Assert
      expect(result).toBeDefined();
      expect(result.filename).toBe(mockFile.originalFilename);
      expect(result.mimeType).toBe(mockFile.mimeType);
      expect(result.size).toBe(mockFile.size);
      expect(fileRepository.incrementDownloadCount).toHaveBeenCalledWith('test-file-id');
    });

    it('存在しないファイルの場合はNotFoundExceptionを投げること', async () => {
      // Arrange
      fileRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.downloadFile('non-existent-id', 'user-id')
      ).rejects.toThrow(NotFoundException);
    });

    it('削除されたファイルの場合はNotFoundExceptionを投げること', async () => {
      // Arrange
      const deletedFile = { ...mockFile, isDeleted: true };
      fileRepository.findById.mockResolvedValue(deletedFile as File);

      // Act & Assert
      await expect(
        service.downloadFile('test-file-id', 'user-id')
      ).rejects.toThrow(NotFoundException);
    });

    it('感染したファイルの場合はBadRequestExceptionを投げること', async () => {
      // Arrange
      const infectedFile = { ...mockFile, scanResult: FileScanResult.INFECTED };
      fileRepository.findById.mockResolvedValue(infectedFile as File);

      // Act & Assert
      await expect(
        service.downloadFile('test-file-id', 'user-id')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFile', () => {
    it('ファイル情報を取得できること', async () => {
      // Arrange
      fileRepository.findById.mockResolvedValue(mockFile as File);

      // Act
      const result = await service.getFile('test-file-id');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockFile.id);
      expect(result.filename).toBe(mockFile.filename);
      expect(result.originalFilename).toBe(mockFile.originalFilename);
    });

    it('存在しないファイルの場合はNotFoundExceptionを投げること', async () => {
      // Arrange
      fileRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getFile('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFilesByInquiry', () => {
    it('問い合わせに関連するファイル一覧を取得できること', async () => {
      // Arrange
      const files = [mockFile, { ...mockFile, id: 'file-2' }];
      fileRepository.findByInquiryId.mockResolvedValue(files as File[]);

      // Act
      const result = await service.getFilesByInquiry('inquiry-id');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockFile.id);
      expect(result[1].id).toBe('file-2');
    });
  });

  describe('deleteFile', () => {
    it('ファイルを削除できること', async () => {
      // Arrange
      fileRepository.findById.mockResolvedValue(mockFile as File);
      fileRepository.softDelete.mockResolvedValue(undefined);

      // Act
      const result = await service.deleteFile('test-file-id', 'user-id');

      // Assert
      expect(result.success).toBe(true);
      expect(result.fileId).toBe('test-file-id');
      expect(fileRepository.softDelete).toHaveBeenCalledWith('test-file-id', 'user-id');
    });

    it('存在しないファイルの場合はNotFoundExceptionを投げること', async () => {
      // Arrange
      fileRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteFile('non-existent-id', 'user-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStorageUsage', () => {
    it('ストレージ使用量を取得できること', async () => {
      // Arrange
      const mockStats = {
        totalFiles: 10,
        totalSize: 1024 * 1024, // 1MB
        byApplication: [],
        byMimeType: [],
        byScanResult: [],
        byMonth: []
      };
      const mockByApp = [
        {
          appId: 'app-1',
          appName: 'App 1',
          usedSize: 512 * 1024,
          fileCount: 5
        }
      ];

      fileRepository.getFileStatistics.mockResolvedValue(mockStats);
      fileRepository.getStorageUsageByApp.mockResolvedValue(mockByApp);

      // Act
      const result = await service.getStorageUsage();

      // Assert
      expect(result).toBeDefined();
      expect(result.usedSize).toBe(1024 * 1024);
      expect(result.totalSize).toBe(100 * 1024 * 1024 * 1024);
      expect(result.byApplication).toEqual(mockByApp);
    });
  });

  describe('cleanupExpiredFiles', () => {
    it('期限切れファイルをクリーンアップできること', async () => {
      // Arrange
      const expiredFiles = [
        { ...mockFile, id: 'expired-1', expiresAt: new Date('2023-01-01') },
        { ...mockFile, id: 'expired-2', expiresAt: new Date('2023-01-01') }
      ];
      fileRepository.findExpiredFiles.mockResolvedValue(expiredFiles as File[]);
      fileRepository.softDelete.mockResolvedValue(undefined);

      // Act
      const result = await service.cleanupExpiredFiles();

      // Assert
      expect(result.cleanedFileCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(fileRepository.softDelete).toHaveBeenCalledTimes(2);
    });
  });
});