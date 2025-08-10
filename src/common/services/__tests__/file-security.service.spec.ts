import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileSecurityService } from '../file-security.service';
import { FileAccessLog } from '../../entities/file-access-log.entity';
import { File } from '../../entities/file.entity';
import { FileScanResult, FileAccessPermission } from '../../types/file.types';

describe('FileSecurityService', () => {
  let service: FileSecurityService;
  let fileAccessLogRepository: jest.Mocked<Repository<FileAccessLog>>;
  let fileRepository: jest.Mocked<Repository<File>>;
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
    isScanned: false,
    scanResult: FileScanResult.PENDING,
    scannedAt: null,
    isDeleted: false,
    inquiry: {
      id: 'inquiry-id',
      assignedTo: 'assigned-user-id'
    } as any
  };

  beforeEach(async () => {
    const mockFileAccessLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      })),
    };

    const mockFileRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      })),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileSecurityService,
        {
          provide: getRepositoryToken(FileAccessLog),
          useValue: mockFileAccessLogRepository,
        },
        {
          provide: getRepositoryToken(File),
          useValue: mockFileRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileSecurityService>(FileSecurityService);
    fileAccessLogRepository = module.get(getRepositoryToken(FileAccessLog));
    fileRepository = module.get(getRepositoryToken(File));
    configService = module.get(ConfigService);

    // ConfigServiceのモック設定
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        FILE_MAX_SIZE: 10 * 1024 * 1024,
      };
      return config[key] || defaultValue;
    });
  });

  describe('scanFile', () => {
    it('正常なファイルをクリーンと判定すること', async () => {
      // Arrange
      fileRepository.findOne.mockResolvedValue(mockFile as File);
      fileRepository.update.mockResolvedValue(undefined as any);

      // Act
      const result = await service.scanFile('test-file-id');

      // Assert
      expect(result).toBe(FileScanResult.CLEAN);
      expect(fileRepository.update).toHaveBeenCalledWith('test-file-id', {
        scanResult: FileScanResult.CLEAN,
        scannedAt: expect.any(Date),
        isScanned: true,
      });
    });

    it('危険な拡張子のファイルを疑わしいと判定すること', async () => {
      // Arrange
      const dangerousFile = {
        ...mockFile,
        originalFilename: 'virus.exe',
        mimeType: 'application/x-executable'
      };
      fileRepository.findOne.mockResolvedValue(dangerousFile as File);
      fileRepository.update.mockResolvedValue(undefined as any);

      // Act
      const result = await service.scanFile('test-file-id');

      // Assert
      expect(result).toBe(FileScanResult.SUSPICIOUS);
    });

    it('疑わしいファイル名パターンを検出すること', async () => {
      // Arrange
      const suspiciousFile = {
        ...mockFile,
        originalFilename: 'virus_malware.pdf'
      };
      fileRepository.findOne.mockResolvedValue(suspiciousFile as File);
      fileRepository.update.mockResolvedValue(undefined as any);

      // Act
      const result = await service.scanFile('test-file-id');

      // Assert
      expect(result).toBe(FileScanResult.SUSPICIOUS);
    });

    it('ファイルが見つからない場合はエラーを投げること', async () => {
      // Arrange
      fileRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      const result = await service.scanFile('non-existent-id');
      expect(result).toBe(FileScanResult.SUSPICIOUS);
    });

    it('空ファイルを疑わしいと判定すること', async () => {
      // Arrange
      const emptyFile = {
        ...mockFile,
        size: 0
      };
      fileRepository.findOne.mockResolvedValue(emptyFile as File);
      fileRepository.update.mockResolvedValue(undefined as any);

      // Act
      const result = await service.scanFile('test-file-id');

      // Assert
      expect(result).toBe(FileScanResult.SUSPICIOUS);
    });

    it('MIMEタイプと拡張子の不整合を検出すること', async () => {
      // Arrange
      const mismatchFile = {
        ...mockFile,
        originalFilename: 'document.pdf',
        mimeType: 'image/jpeg' // PDFファイルなのにJPEGのMIMEタイプ
      };
      fileRepository.findOne.mockResolvedValue(mismatchFile as File);
      fileRepository.update.mockResolvedValue(undefined as any);

      // Act
      const result = await service.scanFile('test-file-id');

      // Assert
      expect(result).toBe(FileScanResult.SUSPICIOUS);
    });
  });

  describe('checkFileAccess', () => {
    it('ファイルの所有者はアクセス可能であること', async () => {
      // Arrange
      fileRepository.findOne.mockResolvedValue({
        ...mockFile,
        uploadedBy: 'user-id',
        scanResult: FileScanResult.CLEAN
      } as File);

      // Act
      const result = await service.checkFileAccess('test-file-id', 'user-id', FileAccessPermission.READ);

      // Assert
      expect(result).toBe(true);
    });

    it('感染したファイルへのアクセスは拒否されること', async () => {
      // Arrange
      fileRepository.findOne.mockResolvedValue({
        ...mockFile,
        uploadedBy: 'user-id',
        scanResult: FileScanResult.INFECTED
      } as File);

      // Act
      const result = await service.checkFileAccess('test-file-id', 'user-id', FileAccessPermission.READ);

      // Assert
      expect(result).toBe(false);
    });

    it('削除されたファイルへのアクセスは拒否されること', async () => {
      // Arrange
      fileRepository.findOne.mockResolvedValue({
        ...mockFile,
        isDeleted: true
      } as File);

      // Act
      const result = await service.checkFileAccess('test-file-id', 'user-id', FileAccessPermission.READ);

      // Assert
      expect(result).toBe(false);
    });

    it('存在しないファイルへのアクセスは拒否されること', async () => {
      // Arrange
      fileRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkFileAccess('non-existent-id', 'user-id', FileAccessPermission.READ);

      // Assert
      expect(result).toBe(false);
    });

    it('問い合わせの担当者は削除以外のアクセスが可能であること', async () => {
      // Arrange
      fileRepository.findOne.mockResolvedValue({
        ...mockFile,
        uploadedBy: 'other-user',
        scanResult: FileScanResult.CLEAN,
        inquiry: {
          assignedTo: 'user-id'
        }
      } as File);

      // Act
      const readResult = await service.checkFileAccess('test-file-id', 'user-id', FileAccessPermission.READ);
      const deleteResult = await service.checkFileAccess('test-file-id', 'user-id', FileAccessPermission.DELETE);

      // Assert
      expect(readResult).toBe(true);
      expect(deleteResult).toBe(false);
    });
  });

  describe('logFileAccess', () => {
    it('ファイルアクセスログを記録できること', async () => {
      // Arrange
      const mockAccessLog = {
        fileId: 'test-file-id',
        userId: 'user-id',
        action: 'download',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: true,
        accessedAt: expect.any(Date)
      };
      fileAccessLogRepository.create.mockReturnValue(mockAccessLog as FileAccessLog);
      fileAccessLogRepository.save.mockResolvedValue(mockAccessLog as FileAccessLog);

      // Act
      await service.logFileAccess(
        'test-file-id',
        'user-id',
        'download',
        '192.168.1.1',
        'Mozilla/5.0',
        true
      );

      // Assert
      expect(fileAccessLogRepository.create).toHaveBeenCalledWith({
        fileId: 'test-file-id',
        userId: 'user-id',
        action: 'download',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: true,
        error: undefined,
        accessedAt: expect.any(Date)
      });
      expect(fileAccessLogRepository.save).toHaveBeenCalled();
    });

    it('失敗したアクセスログも記録できること', async () => {
      // Arrange
      const mockAccessLog = {
        fileId: 'test-file-id',
        userId: 'user-id',
        action: 'download',
        success: false,
        error: 'アクセス拒否',
        accessedAt: expect.any(Date)
      };
      fileAccessLogRepository.create.mockReturnValue(mockAccessLog as FileAccessLog);
      fileAccessLogRepository.save.mockResolvedValue(mockAccessLog as FileAccessLog);

      // Act
      await service.logFileAccess(
        'test-file-id',
        'user-id',
        'download',
        undefined,
        undefined,
        false,
        'アクセス拒否'
      );

      // Assert
      expect(fileAccessLogRepository.create).toHaveBeenCalledWith({
        fileId: 'test-file-id',
        userId: 'user-id',
        action: 'download',
        ipAddress: undefined,
        userAgent: undefined,
        success: false,
        error: 'アクセス拒否',
        accessedAt: expect.any(Date)
      });
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('短時間での大量ダウンロードを検出すること', async () => {
      // Arrange
      fileAccessLogRepository.count.mockResolvedValueOnce(60); // ダウンロード数
      fileAccessLogRepository.count.mockResolvedValueOnce(5);  // 失敗数

      // Act
      const result = await service.detectSuspiciousActivity('user-id', 60);

      // Assert
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toBe('短時間での大量ダウンロード');
      expect(result.details.downloadCount).toBe(60);
    });

    it('連続したアクセス失敗を検出すること', async () => {
      // Arrange
      fileAccessLogRepository.count.mockResolvedValueOnce(10); // ダウンロード数
      fileAccessLogRepository.count.mockResolvedValueOnce(15); // 失敗数

      // Act
      const result = await service.detectSuspiciousActivity('user-id', 60);

      // Assert
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toBe('連続したアクセス失敗');
      expect(result.details.failedAttempts).toBe(15);
    });

    it('正常なアクティビティは疑わしくないと判定すること', async () => {
      // Arrange
      fileAccessLogRepository.count.mockResolvedValueOnce(10); // ダウンロード数
      fileAccessLogRepository.count.mockResolvedValueOnce(2);  // 失敗数

      // Act
      const result = await service.detectSuspiciousActivity('user-id', 60);

      // Assert
      expect(result.isSuspicious).toBe(false);
    });
  });

  describe('getFileAccessStatistics', () => {
    it('ファイルアクセス統計を取得できること', async () => {
      // Arrange
      fileAccessLogRepository.count
        .mockResolvedValueOnce(100) // 総アクセス数
        .mockResolvedValueOnce(80)  // ダウンロード数
        .mockResolvedValueOnce(20); // 閲覧数

      fileAccessLogRepository.findOne.mockResolvedValue({
        accessedAt: new Date('2024-01-01T12:00:00Z')
      } as FileAccessLog);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { userId: 'user-1', accessCount: '50' },
          { userId: 'user-2', accessCount: '30' }
        ])
      };
      fileAccessLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getFileAccessStatistics('test-file-id');

      // Assert
      expect(result.totalAccess).toBe(100);
      expect(result.downloadCount).toBe(80);
      expect(result.viewCount).toBe(20);
      expect(result.lastAccessed).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(result.topUsers).toHaveLength(2);
      expect(result.topUsers[0]).toEqual({ userId: 'user-1', accessCount: 50 });
    });
  });

  describe('generateSecurityReport', () => {
    it('セキュリティレポートを生成できること', async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalScans: '100',
          cleanFiles: '85',
          infectedFiles: '5',
          suspiciousFiles: '10'
        })
      };
      fileRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      fileAccessLogRepository.count.mockResolvedValue(25); // アクセス違反数

      // Act
      const result = await service.generateSecurityReport(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Assert
      expect(result.totalScans).toBe(100);
      expect(result.cleanFiles).toBe(85);
      expect(result.infectedFiles).toBe(5);
      expect(result.suspiciousFiles).toBe(10);
      expect(result.accessViolations).toBe(25);
    });
  });
});