import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from '../services/file-storage.service';
import { FilesRepository } from '../repositories/files.repository';

describe('FileStorageService', () => {
    let service: FileStorageService;
    let repository: jest.Mocked<FilesRepository>;

    const mockExpiredFile = {
        id: 'expired-file-id',
        filename: 'expired_file.txt',
        originalName: 'expired file.txt',
        filePath: '/uploads/expired_file.txt',
        mimeType: 'text/plain',
        size: 1024,
        fileHash: 'expired-hash',
        inquiryId: 'test-inquiry-id',
        uploadedBy: 'test-user-id',
        isScanned: true,
        scanResult: 'clean' as const,
        scanDetails: null,
        scannedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        metadata: null,
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100日前
        updatedAt: new Date(),
        inquiry: null,
        uploader: null,
        deleter: null,
    };

    beforeEach(async () => {
        const mockRepository = {
            calculateStorageUsage: jest.fn(),
            findExpiredFiles: jest.fn(),
            hardDelete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FileStorageService,
                {
                    provide: FilesRepository,
                    useValue: mockRepository,
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                            switch (key) {
                                case 'UPLOAD_PATH':
                                    return './test-uploads';
                                case 'ARCHIVE_PATH':
                                    return './test-archive';
                                case 'BACKUP_PATH':
                                    return './test-backup';
                                case 'MAX_STORAGE_SIZE':
                                    return 1024 * 1024 * 1024; // 1GB
                                case 'AUTO_CLEANUP_ENABLED':
                                    return true;
                                case 'FILE_RETENTION_DAYS':
                                    return 90;
                                default:
                                    return defaultValue;
                            }
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<FileStorageService>(FileStorageService);
        repository = module.get(FilesRepository);
    });

    describe('calculateStorageUsage', () => {
        it('ストレージ使用量を正常に計算できること', async () => {
            // Arrange
            const mockDbUsage = {
                totalFiles: 10,
                totalSize: 1024 * 1024, // 1MB
                sizeByType: { 'text/plain': 512 * 1024, 'image/jpeg': 512 * 1024 },
                filesByType: { 'text/plain': 5, 'image/jpeg': 5 },
            };
            repository.calculateStorageUsage.mockResolvedValue(mockDbUsage);

            // Act
            const result = await service.calculateStorageUsage();

            // Assert
            expect(result).toBeDefined();
            expect(result.totalFiles).toBe(10);
            expect(result.sizeByType).toEqual(mockDbUsage.sizeByType);
            expect(result.filesByType).toEqual(mockDbUsage.filesByType);
            expect(result.lastUpdated).toBeInstanceOf(Date);
        });

        it('アプリIDを指定してストレージ使用量を計算できること', async () => {
            // Arrange
            const appId = 'test-app-id';
            const mockDbUsage = {
                totalFiles: 5,
                totalSize: 512 * 1024,
                sizeByType: { 'text/plain': 512 * 1024 },
                filesByType: { 'text/plain': 5 },
            };
            repository.calculateStorageUsage.mockResolvedValue(mockDbUsage);

            // Act
            const result = await service.calculateStorageUsage(appId);

            // Assert
            expect(result.appId).toBe(appId);
            expect(repository.calculateStorageUsage).toHaveBeenCalledWith(appId);
        });
    });

    describe('cleanupExpiredFiles', () => {
        it('期限切れファイルを正常にクリーンアップできること', async () => {
            // Arrange
            const expiredFiles = [mockExpiredFile];
            repository.findExpiredFiles.mockResolvedValue(expiredFiles);
            repository.hardDelete.mockResolvedValue(true);

            // Act
            const result = await service.cleanupExpiredFiles(90, true); // ドライラン

            // Assert
            expect(result).toBeDefined();
            expect(result.deletedFiles).toBe(1);
            expect(result.freedSpace).toBe(1024);
            expect(result.errors).toHaveLength(0);
            expect(result.processedAt).toBeInstanceOf(Date);
        });

        it('スキャン結果でフィルタリングしてクリーンアップできること', async () => {
            // Arrange
            const cleanFile = { ...mockExpiredFile, scanResult: 'clean' as const };
            const infectedFile = { ...mockExpiredFile, id: 'infected-file', scanResult: 'infected' as const };
            repository.findExpiredFiles.mockResolvedValue([cleanFile, infectedFile]);
            repository.hardDelete.mockResolvedValue(true);

            // Act
            const result = await service.cleanupExpiredFiles(90, true, ['clean']);

            // Assert
            expect(result.deletedFiles).toBe(1); // cleanファイルのみ
            expect(repository.findExpiredFiles).toHaveBeenCalledWith(90);
        });

        it('期限切れファイルが存在しない場合、何も削除しないこと', async () => {
            // Arrange
            repository.findExpiredFiles.mockResolvedValue([]);

            // Act
            const result = await service.cleanupExpiredFiles(90, true);

            // Assert
            expect(result.deletedFiles).toBe(0);
            expect(result.freedSpace).toBe(0);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('performHealthCheck', () => {
        it('健全性チェックを正常に実行できること', async () => {
            // Arrange
            const mockUsage = {
                totalFiles: 10,
                totalSize: 100 * 1024 * 1024, // 100MB (10%使用)
                sizeByType: {},
                filesByType: {},
                lastUpdated: new Date(),
            };
            repository.calculateStorageUsage.mockResolvedValue({
                totalFiles: mockUsage.totalFiles,
                totalSize: mockUsage.totalSize,
                sizeByType: mockUsage.sizeByType,
                filesByType: mockUsage.filesByType,
            });

            // Act
            const result = await service.performHealthCheck();

            // Assert
            expect(result).toBeDefined();
            expect(result.status).toBe('healthy');
            expect(result.usage.totalFiles).toBe(10);
            expect(result.issues).toHaveLength(0);
            expect(result.recommendations).toHaveLength(0);
        });

        it('ストレージ使用量が80%を超えている場合、警告ステータスを返すこと', async () => {
            // Arrange
            const mockUsage = {
                totalFiles: 100,
                totalSize: 850 * 1024 * 1024, // 850MB (85%使用)
                sizeByType: {},
                filesByType: {},
                lastUpdated: new Date(),
            };
            repository.calculateStorageUsage.mockResolvedValue({
                totalFiles: mockUsage.totalFiles,
                totalSize: mockUsage.totalSize,
                sizeByType: mockUsage.sizeByType,
                filesByType: mockUsage.filesByType,
            });

            // calculateStorageUsageメソッドをスパイして実際のファイルサイズ計算をモック
            jest.spyOn(service, 'calculateStorageUsage').mockResolvedValue({
                totalFiles: mockUsage.totalFiles,
                totalSize: mockUsage.totalSize,
                sizeByType: mockUsage.sizeByType,
                filesByType: mockUsage.filesByType,
                lastUpdated: mockUsage.lastUpdated,
            });

            // Act
            const result = await service.performHealthCheck();

            // Assert
            expect(result.status).toBe('warning');
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.recommendations.length).toBeGreaterThan(0);
        });

        it('ストレージ使用量が95%を超えている場合、クリティカルステータスを返すこと', async () => {
            // Arrange
            const mockUsage = {
                totalFiles: 100,
                totalSize: 980 * 1024 * 1024, // 980MB (98%使用)
                sizeByType: {},
                filesByType: {},
                lastUpdated: new Date(),
            };
            repository.calculateStorageUsage.mockResolvedValue({
                totalFiles: mockUsage.totalFiles,
                totalSize: mockUsage.totalSize,
                sizeByType: mockUsage.sizeByType,
                filesByType: mockUsage.filesByType,
            });

            // calculateStorageUsageメソッドをスパイして実際のファイルサイズ計算をモック
            jest.spyOn(service, 'calculateStorageUsage').mockResolvedValue({
                totalFiles: mockUsage.totalFiles,
                totalSize: mockUsage.totalSize,
                sizeByType: mockUsage.sizeByType,
                filesByType: mockUsage.filesByType,
                lastUpdated: mockUsage.lastUpdated,
            });

            // Act
            const result = await service.performHealthCheck();

            // Assert
            expect(result.status).toBe('critical');
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('findDuplicateFiles', () => {
        it('重複ファイル検出機能が実装されていること', async () => {
            // Act
            const result = await service.findDuplicateFiles();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            // 現在は空の配列を返すが、将来的に実装される
        });
    });
});