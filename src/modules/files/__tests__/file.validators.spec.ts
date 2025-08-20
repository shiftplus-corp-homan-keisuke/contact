import { FileValidator } from '../validators/file.validators';

describe('FileValidator', () => {
    let validator: FileValidator;

    beforeEach(() => {
        validator = new FileValidator();
    });

    describe('validateFile', () => {
        it('正常なファイルの場合、バリデーションが成功すること', () => {
            // Arrange
            const content = Buffer.from('test content');

            // Act
            const result = validator.validateFile(
                'test.txt',
                'text/plain',
                content.length,
                content
            );

            // Assert
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('ファイル名が空の場合、エラーが発生すること', () => {
            // Act
            const result = validator.validateFile('', 'text/plain', 1024);

            // Assert
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('ファイル名が指定されていません');
        });

        it('ファイル名が長すぎる場合、エラーが発生すること', () => {
            // Arrange
            const longFilename = 'a'.repeat(256) + '.txt';

            // Act
            const result = validator.validateFile(longFilename, 'text/plain', 1024);

            // Assert
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('ファイル名が長すぎます（255文字以内）');
        });

        it('危険な文字が含まれる場合、エラーが発生すること', () => {
            // Act
            const result = validator.validateFile('test<>.txt', 'text/plain', 1024);

            // Assert
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('ファイル名に使用できない文字が含まれています');
        });

        it('実行可能ファイルの場合、エラーが発生すること', () => {
            // Act
            const result = validator.validateFile('malware.exe', 'application/octet-stream', 1024);

            // Assert
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('実行可能ファイル（.exe）はアップロードできません');
        });

        it('サポートされていないMIMEタイプの場合、エラーが発生すること', () => {
            // Act
            const result = validator.validateFile('test.unknown', 'application/unknown', 1024);

            // Assert
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('サポートされていないファイルタイプです: application/unknown');
        });

        it('ファイルサイズが大きすぎる場合、エラーが発生すること', () => {
            // Arrange
            const largeSize = 100 * 1024 * 1024; // 100MB

            // Act
            const result = validator.validateFile('test.txt', 'text/plain', largeSize);

            // Assert
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('ファイルサイズが大きすぎます'))).toBe(true);
        });

        it('大きなファイルの場合、警告が発生すること', () => {
            // Arrange
            const largeSize = 20 * 1024 * 1024; // 20MB

            // Act
            const result = validator.validateFile('test.txt', 'text/plain', largeSize);

            // Assert
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('大きなファイルです。アップロードに時間がかかる場合があります');
        });

        it('不明なファイルタイプの場合、警告が発生すること', () => {
            // Arrange
            const content = Buffer.from('binary content');

            // Act
            const result = validator.validateFile(
                'test.dat',
                'application/octet-stream',
                content.length,
                content
            );

            // Assert
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('ファイルタイプを自動判定できませんでした');
        });
    });

    describe('normalizeFilename', () => {
        it('危険な文字をアンダースコアに置換すること', () => {
            // Act
            const result = validator.normalizeFilename('test<>file.txt');

            // Assert
            expect(result).toBe('test_file.txt');
        });

        it('連続するアンダースコアを単一にすること', () => {
            // Act
            const result = validator.normalizeFilename('test___file.txt');

            // Assert
            expect(result).toBe('test_file.txt');
        });

        it('先頭・末尾のアンダースコアを除去すること', () => {
            // Act
            const result = validator.normalizeFilename('_test_file_.txt');

            // Assert
            expect(result).toBe('test_file_.txt');
        });

        it('空になった場合、デフォルト名を返すこと', () => {
            // Act
            const result = validator.normalizeFilename('___');

            // Assert
            expect(result).toBe('unnamed_file');
        });
    });

    describe('getRecommendedExtension', () => {
        it('MIMEタイプから適切な拡張子を取得できること', () => {
            // Act & Assert
            expect(validator.getRecommendedExtension('image/jpeg')).toBe('.jpg');
            expect(validator.getRecommendedExtension('application/pdf')).toBe('.pdf');
            expect(validator.getRecommendedExtension('text/plain')).toBe('.txt');
        });

        it('未知のMIMEタイプの場合、空文字を返すこと', () => {
            // Act
            const result = validator.getRecommendedExtension('application/unknown');

            // Assert
            expect(result).toBe('');
        });
    });

    describe('getAllowedMimeTypes', () => {
        it('許可されているMIMEタイプの一覧を取得できること', () => {
            // Act
            const result = validator.getAllowedMimeTypes();

            // Assert
            expect(result).toContain('text/plain');
            expect(result).toContain('image/jpeg');
            expect(result).toContain('application/pdf');
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('getMaxFileSize', () => {
        it('最大ファイルサイズを取得できること', () => {
            // Act
            const result = validator.getMaxFileSize();

            // Assert
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });
    });
});