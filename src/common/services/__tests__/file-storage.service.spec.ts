import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from '../../../modules/files/services/file-storage.service';
import { FileRepository } from '../../repositories/file.repository';
import { FileService } from '../../../modules/files/services/file.service';
import { File } from '../../entities/file.entity';

describe('FileStorageService', () => {
  let service: FileStorageService;
  let fileRepository: jest.Mocked<FileRepository>;
  let fileService: jest.Mocked<FileService>;
  let configService: jest.Mocked<ConfigService>;

  const mockFile: Partial<File> = {
    id: 'test-file-id',
    filename: 'test_file.pdf',
    originalFilename: 'test file.pdf',
    size: 1024 * 1024, // 1MB
    mimeType: 'application/pdf',
    filePath: '/uploads/2024/01/test_file.pdf',
    fileHash: 'abc123',
    inquiryId: 'inquiry-id',
    uploadedBy: 'user-id',
    uploadedAt: new Date('2023-01-01'),
    isScanned: true,
    scanResult: 'clean' as any,
    scannedAt: new Date(),
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  beforeEach(async () => {
    const mockFileRepository = {
      getFileStatistics: jest.fn(),
      getStorageUsageByApp: jest.fn(),
      findOldFiles: jest.fn(),
      softDelete: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockFileService = {
      cleanupExpiredFiles: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: FileRepository,
          useValue: mockFileRepository,
        },
        {
          provide: FileService,
          useValue: mockFileService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
    fileRepository = module.get(FileRepository);
    fileService = module.get(FileService);
    configService = module.get(ConfigService);

    // ConfigServiceのモック設定
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        FILE_UPLOAD_DIR: './uploads',
        FILE_ARCHIVE_DIR: './archives',
        FILE_BACKUP_DIR: './backups',
        STORAGE_MAX_SIZE: 100 * 1024 * 1024 * 1024, // 100GB
        FILE_CLEANUP_THRESHOLD_DAYS: 365,
        FILE_ARCHIVE_THRESHOLD_DAYS: 180,
      };
      return config[key] || defaultValue;
    });
  });

  describe('monitorStorageUsage', () => {
    it('ストレージ使用量を正常に監視できること', async () => {
      // Arrange
      const mockStats = {
        totalFiles: 100,
        totalSize: 50 * 1024 * 1024 * 1024, // 50GB
        byApplication: [],
        byMimeType: [],
        byScanResult: [],
        byMonth: []
      };

      const mockByApp = [
        {
          appId: 'app-1',
          appName: 'App 1',
          usedSize: 25 * 1024 * 1024 * 1024, // 25GB
          fileCount: 50
        }
      ];

      fileRepository.getFileStatistics.mockResolvedValue(mockStats);
      fileRepository.getStorageUsageByApp.mockResolvedValue(mockByApp);

      // Act
      const result = await service.monitorStorageUsage();

      // Assert
      expect(result.usedSize).toBe(50 * 1024 * 1024 * 1024);
      expect(result.totalSize).toBe(100 * 1024 * 1024 * 1024);
      expect(result.availableSize).toBe(50 * 1024 * 1024 * 1024);
      expect(result.usagePercentage).toBe(50);
      expect(result.byApplication).toEqual(mockByApp);
    });

    it('使用量が80%を超えた場合に警告ログを出力すること', async () => {
      // Arrange
      const mockStats = {
        totalFiles: 100,
        totalSize: 85 * 1024 * 1024 * 1024, // 85GB (85%)
        byApplication: [],
        byMimeType: [],
        byScanResult: [],
        byMonth: []
      };

      fileRepository.getFileStatistics.mockResolvedValue(mockStats);
      fileRepository.getStorageUsageByApp.mockResolvedValue([]);

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      // Act
      const result = await service.monitorStorageUsage();

      // Assert
      expect(result.usagePercentage).toBe(85);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ストレージ使用量が80%を超えました')
      );
    });
  });

  describe('performAutomaticCleanup', () => {
    it('自動クリーンアップを正常に実行できること', async () => {
      // Arrange
      const expiredCleanupResult = {
        cleanedFileCount: 10,
        freedSize: 10 * 1024 * 1024, // 10MB
        errorCount: 0,
        errors: []
      };

      const oldFiles = [
        { ...mockFile, id: 'old-file-1', size: 5 * 1024 * 1024 },
        { ...mockFile, id: 'old-file-2', size: 3 * 1024 * 1024 }
      ];

      fileService.cleanupExpiredFiles.mockResolvedValue(expiredCleanupResult);
      fileRepository.findOldFiles.mockResolvedValue(oldFiles as File[]);
      fileRepository.softDelete.mockResolvedValue(undefined);

      // fs.unlinkのモック
      jest.doMock('fs/promises', () => ({
        unlink: jest.fn().mockResolvedValue(undefined),
        readdir: jest.fn().mockResolvedValue([]),
      }));

      // Act
      const result = await service.performAutomaticCleanup();

      // Assert
      expect(result.cleanedFileCount).toBeGreaterThan(0);
      expect(result.freedSize).toBeGreaterThan(0);
      expect(fileService.cleanupExpiredFiles).toHaveBeenCalled();
      expect(fileRepository.findOldFiles).toHaveBeenCalled();
    });

    it('クリーンアップ中にエラーが発生した場合も継続すること', async () => {
      // Arrange
      const expiredCleanupResult = {
        cleanedFileCount: 5,
        freedSize: 5 * 1024 * 1024,
        errorCount: 1,
        errors: ['期限切れファイル削除エラー']
      };

      const oldFiles = [
        { ...mockFile, id: 'old-file-1' }
      ];

      fileService.cleanupExpiredFiles.mockResolvedValue(expiredCleanupResult);
      fileRepository.findOldFiles.mockResolvedValue(oldFiles as File[]);
      fileRepository.softDelete.mockRejectedValue(new Error('削除エラー'));

      // Act
      const result = await service.performAutomaticCleanup();

      // Assert
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('archiveOldFiles', () => {
    it('古いファイルを正常にアーカイブできること', async () => {
      // Arrange
      const filesToArchive = [
        { ...mockFile, id: 'archive-file-1' },
        { ...mockFile, id: 'archive-file-2' }
      ];

      fileRepository.findOldFiles.mockResolvedValue(filesToArchive as File[]);
      fileRepository.softDelete.mockResolvedValue(undefined);

      // fs.mkdirとfs.unlinkのモック
      jest.doMock('fs/promises', () => ({
        mkdir: jest.fn().mockResolvedValue(undefined),
        unlink: jest.fn().mockResolvedValue(undefined),
      }));

      // archiverのモック
      const mockArchive = {
        pointer: jest.fn().mockReturnValue(1024 * 1024), // 1MB
        file: jest.fn(),
        finalize: jest.fn(),
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            // エラーハンドラーを保存
          }
        })
      };

      const mockOutput = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // closeイベントを即座に発火
            setTimeout(callback, 0);
          }
        })
      };

      jest.doMock('archiver', () => jest.fn(() => mockArchive));
      jest.doMock('fs', () => ({
        createWriteStream: jest.fn(() => mockOutput)
      }));

      // Act
      const result = await service.archiveOldFiles();

      // Assert
      expect(result.archivedFileCount).toBe(2);
      expect(result.archiveSize).toBe(1024 * 1024);
      expect(result.archiveFilePath).toContain('archive_');
    });

    it('アーカイブ対象のファイルがない場合は何もしないこと', async () => {
      // Arrange
      fileRepository.findOldFiles.mockResolvedValue([]);

      // Act
      const result = await service.archiveOldFiles();

      // Assert
      expect(result.archivedFileCount).toBe(0);
      expect(result.archiveSize).toBe(0);
      expect(result.archiveFilePath).toBe('');
    });
  });

  describe('createBackup', () => {
    it('バックアップを正常に作成できること', async () => {
      // Arrange
      const activeFiles = [
        { ...mockFile, id: 'active-file-1' },
        { ...mockFile, id: 'active-file-2' }
      ];

      fileRepository.find.mockResolvedValue(activeFiles as File[]);

      // fs.mkdirとfs.accessのモック
      jest.doMock('fs/promises', () => ({
        mkdir: jest.fn().mockResolvedValue(undefined),
        access: jest.fn().mockRejectedValue(new Error('File not found')), // バックアップファイルが存在しない
        readdir: jest.fn().mockResolvedValue([]),
      }));

      // archiverのモック（archiveOldFilesと同様）
      const mockArchive = {
        pointer: jest.fn().mockReturnValue(2 * 1024 * 1024), // 2MB
        file: jest.fn(),
        finalize: jest.fn(),
        pipe: jest.fn(),
        on: jest.fn()
      };

      const mockOutput = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
        })
      };

      jest.doMock('archiver', () => jest.fn(() => mockArchive));
      jest.doMock('fs', () => ({
        createWriteStream: jest.fn(() => mockOutput)
      }));

      // Act
      const result = await service.createBackup();

      // Assert
      expect(result.fileCount).toBe(2);
      expect(result.backupSize).toBe(2 * 1024 * 1024);
      expect(result.backupFilePath).toContain('backup_');
    });

    it('既存のバックアップファイルがある場合はスキップすること', async () => {
      // Arrange
      fileRepository.find.mockResolvedValue([]);

      // fs.accessが成功（ファイルが存在）
      jest.doMock('fs/promises', () => ({
        mkdir: jest.fn().mockResolvedValue(undefined),
        access: jest.fn().mockResolvedValue(undefined),
        stat: jest.fn().mockResolvedValue({ size: 1024 * 1024 }),
      }));

      // Act
      const result = await service.createBackup();

      // Assert
      expect(result.fileCount).toBe(0);
      expect(result.backupSize).toBe(1024 * 1024);
    });

    it('バックアップ対象のファイルがない場合は空のバックアップを作成すること', async () => {
      // Arrange
      fileRepository.find.mockResolvedValue([]);

      jest.doMock('fs/promises', () => ({
        mkdir: jest.fn().mockResolvedValue(undefined),
        access: jest.fn().mockRejectedValue(new Error('File not found')),
        readdir: jest.fn().mockResolvedValue([]),
      }));

      // Act
      const result = await service.createBackup();

      // Assert
      expect(result.fileCount).toBe(0);
      expect(result.backupSize).toBe(0);
      expect(result.backupFilePath).toBe('');
    });
  });

  describe('generateStorageReport', () => {
    it('ストレージレポートを正常に生成できること', async () => {
      // Arrange
      const mockStats = {
        totalFiles: 100,
        totalSize: 50 * 1024 * 1024 * 1024, // 50GB
        byApplication: [],
        byMimeType: [
          { mimeType: 'image/jpeg', fileCount: 50, totalSize: 200 * 1024 * 1024 } // 200MB
        ],
        byScanResult: [],
        byMonth: []
      };

      const mockByApp = [
        {
          appId: 'app-1',
          appName: 'App 1',
          usedSize: 25 * 1024 * 1024 * 1024,
          fileCount: 50
        }
      ];

      fileRepository.getFileStatistics.mockResolvedValue(mockStats);
      fileRepository.getStorageUsageByApp.mockResolvedValue(mockByApp);

      // Act
      const result = await service.generateStorageReport();

      // Assert
      expect(result.storageUsage).toBeDefined();
      expect(result.fileStatistics).toBeDefined();
      expect(result.physicalUsage).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('使用量が80%を超えた場合に推奨事項を含むこと', async () => {
      // Arrange
      const mockStats = {
        totalFiles: 100,
        totalSize: 85 * 1024 * 1024 * 1024, // 85GB (85%)
        byApplication: [],
        byMimeType: [],
        byScanResult: [],
        byMonth: []
      };

      fileRepository.getFileStatistics.mockResolvedValue(mockStats);
      fileRepository.getStorageUsageByApp.mockResolvedValue([]);

      // Act
      const result = await service.generateStorageReport();

      // Assert
      expect(result.recommendations).toContain(
        expect.stringContaining('ストレージ使用量が80%を超えています')
      );
    });

    it('大きな画像ファイルがある場合に推奨事項を含むこと', async () => {
      // Arrange
      const mockStats = {
        totalFiles: 100,
        totalSize: 50 * 1024 * 1024 * 1024,
        byApplication: [],
        byMimeType: [
          { 
            mimeType: 'image/jpeg', 
            fileCount: 100, 
            totalSize: 150 * 1024 * 1024 // 150MB (100MB超)
          }
        ],
        byScanResult: [],
        byMonth: []
      };

      fileRepository.getFileStatistics.mockResolvedValue(mockStats);
      fileRepository.getStorageUsageByApp.mockResolvedValue([]);

      // Act
      const result = await service.generateStorageReport();

      // Assert
      expect(result.recommendations).toContain(
        expect.stringContaining('画像ファイルが大きな容量を占めています')
      );
    });
  });
});