import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilesService } from '../services/files.service';
import { FilesRepository } from '../repositories/files.repository';
import { FileValidator } from '../validators/file.validators';
import { FileUploadRequest } from '../types';

describe('FilesService', () => {
    let service: FilesService;
    let repository: jest.Mocked<FilesRepository>;
    let validator: jest.Mocked<FileValidator>;
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
            create: jest.fn(),
            findById: jest.fn(),
            findByHash: jest.fn(),
            findByInquiryId: jest.fn(),
            findWithFilters: jest.fn(),
            softDelete: jest.fn(),
            logAccess: jest.fn(),
            getFileStatistics: jest.fn(),
        };

        const mockValidator = {
            validateFile: jest.fn(),
            normalizeFilename: jest.fn(),
        };

        const mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FilesService,
                {
                    provide: FilesRepository,
                    useValue: mockRepository,
                },
                {
                    provide: FileValidator,
                    useValue: mockValidator,
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('./uploads'),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<FilesService>(FilesService);
        repository = module.get(FilesRepository);
        validator = module.get(FileValidator);
        eventEmitter = module.get(EventEmitter2);
    });

    describe('uploadFile', () => {
        const uploadRequest: FileUploadRequest = {
            filename: 'test_file.txt',
            originalName: 'test file.txt',
            buffer: Buffer.from('test content'),
            mimeType: 'text/plain',
            size: 12,
            inquiryId: 'test-inquiry-id',
            uploadedBy: 'test-user-id',
        };

        it('正常なファイルアップロードが成功すること', async () => {
            // Arrange
            validator.validateFile.mockReturnValue({
                isValid: true,
                errors: [],
            });
            validator.normalizeFilename.mockReturnValue('test_file.txt');
            repository.findByHash.mockResolvedValue(null);
            repository.create.mockResolvedValue(mockFile);
            repository.logAccess.mockResolvedValue({} as any);

            // Act
            const result = await service.uploadFile(uploadRequest);

            // Assert
            expect(result).toBeDefined();
            expect(result.id).toBe(mockFile.id);
            expect(result.originalName).toBe(mockFile.originalName);
            expect(validator.validateFile).toHaveBeenCalledWith(
                uploadRequest.originalName,
                uploadRequest.mimeType,
                uploadRequest.size,
                uploadRequest.buffer
            );
            expect(repository.create).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith('file.uploaded', expect.any(Object));
        });

        it('バリデーションエラーの場合、BadRequestExceptionが発生すること', async () => {
            // Arrange
            validator.validateFile.mockReturnValue({
                isValid: false,
                errors: ['ファイルサイズが大きすぎます'],
            });

            // Act & Assert
            await expect(service.uploadFile(uploadRequest)).rejects.toThrow(BadRequestException);
            expect(repository.create).not.toHaveBeenCalled();
        });

        it('重複ファイルの場合、既存ファイルのメタデータを返すこと', async () => {
            // Arrange
            validator.validateFile.mockReturnValue({
                isValid: true,
                errors: [],
            });
            repository.findByHash.mockResolvedValue(mockFile);
            repository.logAccess.mockResolvedValue({} as any);

            // Act
            const result = await service.uploadFile(uploadRequest);

            // Assert
            expect(result.id).toBe(mockFile.id);
            expect(repository.create).not.toHaveBeenCalled();
            expect(repository.logAccess).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileId: mockFile.id,
                    action: 'upload',
                    metadata: { duplicate: true },
                })
            );
        });
    });

    describe('downloadFile', () => {
        it('存在しないファイルの場合、NotFoundExceptionが発生すること', async () => {
            // Arrange
            repository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(service.downloadFile('non-existent-id')).rejects.toThrow(NotFoundException);
        });

        it('感染ファイルの場合、ForbiddenExceptionが発生すること', async () => {
            // Arrange
            const infectedFile = { ...mockFile, scanResult: 'infected' as const };
            repository.findById.mockResolvedValue(infectedFile);

            // Act & Assert
            await expect(service.downloadFile('infected-file-id')).rejects.toThrow();
        });
    });

    describe('getFileMetadata', () => {
        it('正常にファイルメタデータを取得できること', async () => {
            // Arrange
            repository.findById.mockResolvedValue(mockFile);
            repository.logAccess.mockResolvedValue({} as any);

            // Act
            const result = await service.getFileMetadata('test-file-id', 'test-user-id');

            // Assert
            expect(result).toBeDefined();
            expect(result.id).toBe(mockFile.id);
            expect(result.originalName).toBe(mockFile.originalName);
            expect(repository.logAccess).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileId: mockFile.id,
                    action: 'view',
                    success: true,
                })
            );
        });

        it('存在しないファイルの場合、NotFoundExceptionが発生すること', async () => {
            // Arrange
            repository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(service.getFileMetadata('non-existent-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getFilesByInquiry', () => {
        it('問い合わせに関連するファイル一覧を取得できること', async () => {
            // Arrange
            const files = [mockFile];
            repository.findByInquiryId.mockResolvedValue(files);
            repository.logAccess.mockResolvedValue({} as any);

            // Act
            const result = await service.getFilesByInquiry('test-inquiry-id', 'test-user-id');

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(mockFile.id);
            expect(repository.logAccess).toHaveBeenCalled();
        });
    });

    describe('deleteFile', () => {
        it('正常にファイルを削除できること', async () => {
            // Arrange
            repository.findById.mockResolvedValue(mockFile);
            repository.softDelete.mockResolvedValue(true);
            repository.logAccess.mockResolvedValue({} as any);

            // Act
            await service.deleteFile('test-file-id', 'test-user-id', 'テスト削除');

            // Assert
            expect(repository.softDelete).toHaveBeenCalledWith('test-file-id', 'test-user-id', 'テスト削除');
            expect(eventEmitter.emit).toHaveBeenCalledWith('file.deleted', expect.any(Object));
        });

        it('存在しないファイルの場合、NotFoundExceptionが発生すること', async () => {
            // Arrange
            repository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(service.deleteFile('non-existent-id', 'test-user-id')).rejects.toThrow(NotFoundException);
        });
    });
});