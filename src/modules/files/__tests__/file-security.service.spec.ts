import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FileSecurityService } from '../services/file-security.service';
import { FilesRepository } from '../repositories/files.repository';

describe('FileSecurityService', () => {
    let service: FileSecurityService;
    let repository: jest.Mocked<FilesRepository>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const mockFile = {
        id: 'test-file-id',
        filename: 'test_file.txt',
        originalName: 'test file.txt',
        filePath: '/uploads/test_file.txt',
        mimeType: 'text/plain',
        size: 1024,
        fileHash: 'test-hash',
        inquiryId: 'test-inquiry-id',
        uploadedBy: 'test-user-id',
        isScanned: false,
        scanResult: 'pending' as const,
        scanDetails: null,
        scannedAt: null,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        inquiry: null,
        uploader: null,
        deleter: null,
    };

    beforeEach(async () => {
        const mockRepository = {
            findById: jest.fn(),
            update: jest.fn(),
            logAccess: jest.fn(),
        };

        const mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FileSecurityService,
                {
                    provide: FilesRepository,
                    useValue: mockRepository,
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                            switch (key) {
                                case 'VIRUS_SCAN_ENABLED':
                                    return true;
                                case 'QUARANTINE_PATH':
                                    return './quarantine';
                                default:
                                    return defaultValue;
                            }
                        }),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<FileSecurityService>(FileSecurityService);
        repository = module.get(FilesRepository);
        eventEmitter = module.get(EventEmitter2);
    });

    describe('checkFileAccess', () => {
        it('感染ファイルへのアクセスを拒否すること', async () => {
            // Arrange
            const infectedFile = { ...mockFile, scanResult: 'infected' as const };
            repository.findById.mockResolvedValue(infectedFile);
            repository.logAccess.mockResolvedValue({} as any);

            // Act
            const result = await service.checkFileAccess('test-file-id', 'test-user-id', 'read');

            // Assert
            expect(result).toBe(false);
            expect(repository.logAccess).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileId: 'test-file-id',
                    userId: 'test-user-id',
                    action: 'download',
                    success: false,
                    failureReason: '感染ファイルへのアクセスが拒否されました',
                })
            );
        });

        it('削除されたファイルへのアクセスを拒否すること', async () => {
            // Arrange
            const deletedFile = { ...mockFile, isDeleted: true };
            repository.findById.mockResolvedValue(deletedFile);

            // Act
            const result = await service.checkFileAccess('test-file-id', 'test-user-id', 'read');

            // Assert
            expect(result).toBe(false);
        });

        it('アップロード者のアクセスを許可すること', async () => {
            // Arrange
            const cleanFile = { ...mockFile, scanResult: 'clean' as const };
            repository.findById.mockResolvedValue(cleanFile);

            // Act
            const result = await service.checkFileAccess('test-file-id', 'test-user-id', 'read');

            // Assert
            expect(result).toBe(true);
        });

        it('存在しないファイルへのアクセスを拒否すること', async () => {
            // Arrange
            repository.findById.mockResolvedValue(null);

            // Act
            const result = await service.checkFileAccess('non-existent-id', 'test-user-id', 'read');

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('rescanFile', () => {
        it('存在しないファイルの再スキャンでエラーが発生すること', async () => {
            // Arrange
            repository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(service.rescanFile('non-existent-id', 'test-user-id'))
                .rejects.toThrow('ファイルが見つかりません');
        });
    });

    describe('handleFileUploaded', () => {
        it('ウイルススキャンが無効の場合、ファイルを安全としてマークすること', async () => {
            // Arrange
            const serviceWithDisabledScan = new FileSecurityService(
                repository,
                {
                    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                        switch (key) {
                            case 'VIRUS_SCAN_ENABLED':
                                return false;
                            case 'QUARANTINE_PATH':
                                return './quarantine';
                            default:
                                return defaultValue;
                        }
                    }),
                } as any,
                eventEmitter,
            );

            repository.update.mockResolvedValue(mockFile);

            // Act
            await serviceWithDisabledScan.handleFileUploaded({
                fileId: 'test-file-id',
                filePath: '/uploads/test_file.txt',
                mimeType: 'text/plain',
            });

            // Assert
            expect(repository.update).toHaveBeenCalledWith('test-file-id', {
                isScanned: true,
                scanResult: 'clean',
                scanDetails: 'スキャンが無効のため、安全とみなされました',
                scannedAt: expect.any(Date),
            });
        });
    });

    describe('getSecurityStatistics', () => {
        it('セキュリティ統計を取得できること', async () => {
            // Act
            const result = await service.getSecurityStatistics();

            // Assert
            expect(result).toEqual({
                totalScanned: 0,
                cleanFiles: 0,
                infectedFiles: 0,
                suspiciousFiles: 0,
                errorFiles: 0,
                quarantinedFiles: 0,
            });
        });
    });
});