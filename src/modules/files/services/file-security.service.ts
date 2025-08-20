import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { FilesRepository } from '../repositories';
import { FileScanResult } from '../types';

/**
 * ファイルセキュリティサービス
 * ウイルススキャン、アクセス権限制御、セキュリティログ機能を提供
 */
@Injectable()
export class FileSecurityService {
    private readonly logger = new Logger(FileSecurityService.name);
    private readonly virusScanEnabled: boolean;
    private readonly quarantinePath: string;

    constructor(
        private readonly filesRepository: FilesRepository,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.virusScanEnabled = this.configService.get<boolean>('VIRUS_SCAN_ENABLED', true);
        this.quarantinePath = this.configService.get<string>('QUARANTINE_PATH', './quarantine');
        this.ensureQuarantineDirectory();
    }

    /**
     * ファイルアップロード時のイベントハンドラー
     */
    @OnEvent('file.uploaded')
    async handleFileUploaded(event: { fileId: string; filePath: string; mimeType: string }): Promise<void> {
        if (!this.virusScanEnabled) {
            this.logger.log(`ウイルススキャンが無効のため、ファイル ${event.fileId} のスキャンをスキップします`);
            await this.markFileAsClean(event.fileId);
            return;
        }

        this.logger.log(`ファイル ${event.fileId} のウイルススキャンを開始します`);

        try {
            const scanResult = await this.scanFile(event.fileId, event.filePath);
            await this.processScanResult(event.fileId, scanResult);
        } catch (error) {
            this.logger.error(`ファイル ${event.fileId} のスキャン中にエラーが発生しました:`, error);
            await this.markFileAsScanError(event.fileId, error.message);
        }
    }

    /**
     * ファイルのウイルススキャンを実行
     */
    async scanFile(fileId: string, filePath: string): Promise<FileScanResult> {
        const startTime = Date.now();

        try {
            // ファイルの存在確認
            await fs.access(filePath);

            // ファイルハッシュを計算（整合性チェック）
            const fileBuffer = await fs.readFile(filePath);
            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

            // 実際のウイルススキャン（ここではシミュレーション）
            const scanResult = await this.performVirusScan(fileBuffer, filePath);

            const scanTime = Date.now() - startTime;
            this.logger.log(`ファイル ${fileId} のスキャンが完了しました (${scanTime}ms)`);

            // アクセスログを記録
            await this.filesRepository.logAccess({
                fileId,
                userId: null,
                action: 'scan',
                success: true,
                metadata: {
                    scanTime,
                    fileHash,
                    scanResult: scanResult.result,
                },
            });

            return {
                fileId,
                result: scanResult.result,
                details: scanResult.details,
                scannedAt: new Date(),
                threats: scanResult.threats,
            };

        } catch (error) {
            const scanTime = Date.now() - startTime;

            // エラーログを記録
            await this.filesRepository.logAccess({
                fileId,
                userId: null,
                action: 'scan',
                success: false,
                failureReason: error.message,
                metadata: { scanTime },
            });

            throw error;
        }
    }

    /**
     * 実際のウイルススキャン処理（シミュレーション）
     * 実際の実装では、ClamAVやWindows Defenderなどの外部スキャナーを使用
     */
    private async performVirusScan(
        fileBuffer: Buffer,
        filePath: string
    ): Promise<{ result: 'clean' | 'infected' | 'suspicious'; details?: string; threats?: string[] }> {
        // ファイルサイズチェック
        if (fileBuffer.length === 0) {
            return {
                result: 'suspicious',
                details: 'ファイルサイズが0バイトです',
            };
        }

        // 既知の危険なパターンをチェック（シミュレーション）
        const dangerousPatterns = [
            Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'), // EICAR テストファイル
            Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR'), // EICAR パターン
        ];

        for (const pattern of dangerousPatterns) {
            if (fileBuffer.includes(pattern)) {
                return {
                    result: 'infected',
                    details: 'テストウイルスが検出されました',
                    threats: ['EICAR-Test-File'],
                };
            }
        }

        // 実行可能ファイルの詳細チェック
        if (this.isExecutableFile(filePath)) {
            // PE ヘッダーチェック（Windows実行ファイル）
            if (fileBuffer.length > 2 && fileBuffer[0] === 0x4D && fileBuffer[1] === 0x5A) {
                return {
                    result: 'suspicious',
                    details: 'Windows実行ファイルが検出されました',
                };
            }

            // ELF ヘッダーチェック（Linux実行ファイル）
            if (fileBuffer.length > 4 &&
                fileBuffer[0] === 0x7F &&
                fileBuffer[1] === 0x45 &&
                fileBuffer[2] === 0x4C &&
                fileBuffer[3] === 0x46) {
                return {
                    result: 'suspicious',
                    details: 'Linux実行ファイルが検出されました',
                };
            }
        }

        // スクリプトファイルの危険なコマンドチェック
        if (this.isScriptFile(filePath)) {
            const content = fileBuffer.toString('utf8');
            const dangerousCommands = [
                'rm -rf',
                'del /f /q',
                'format c:',
                'shutdown',
                'eval(',
                'exec(',
                'system(',
                'shell_exec(',
            ];

            const foundCommands = dangerousCommands.filter(cmd =>
                content.toLowerCase().includes(cmd.toLowerCase())
            );

            if (foundCommands.length > 0) {
                return {
                    result: 'suspicious',
                    details: `危険なコマンドが検出されました: ${foundCommands.join(', ')}`,
                };
            }
        }

        // 通常のファイルは安全とみなす
        return {
            result: 'clean',
            details: 'ウイルスは検出されませんでした',
        };
    }

    /**
     * スキャン結果を処理
     */
    private async processScanResult(fileId: string, scanResult: FileScanResult): Promise<void> {
        // データベースを更新
        await this.filesRepository.update(fileId, {
            isScanned: true,
            scanResult: scanResult.result,
            scanDetails: scanResult.details,
            scannedAt: scanResult.scannedAt,
        });

        // 結果に応じた処理
        switch (scanResult.result) {
            case 'infected':
                await this.quarantineFile(fileId);
                this.eventEmitter.emit('file.infected', { fileId, threats: scanResult.threats });
                break;

            case 'suspicious':
                this.eventEmitter.emit('file.suspicious', { fileId, details: scanResult.details });
                break;

            case 'clean':
                this.eventEmitter.emit('file.clean', { fileId });
                break;
        }

        this.logger.log(`ファイル ${fileId} のスキャン結果: ${scanResult.result}`);
    }

    /**
     * 感染ファイルを隔離
     */
    private async quarantineFile(fileId: string): Promise<void> {
        try {
            const file = await this.filesRepository.findById(fileId);
            if (!file) {
                throw new Error('ファイルが見つかりません');
            }

            const quarantineFilePath = `${this.quarantinePath}/${fileId}_${Date.now()}`;

            // ファイルを隔離ディレクトリに移動
            await fs.rename(file.filePath, quarantineFilePath);

            // データベースのパスを更新
            await this.filesRepository.update(fileId, {
                filePath: quarantineFilePath,
                metadata: {
                    ...file.metadata,
                    quarantined: true,
                    quarantinedAt: new Date().toISOString(),
                },
            });

            this.logger.warn(`感染ファイル ${fileId} を隔離しました: ${quarantineFilePath}`);

        } catch (error) {
            this.logger.error(`ファイル ${fileId} の隔離に失敗しました:`, error);
            throw error;
        }
    }

    /**
     * ファイルを安全としてマーク
     */
    private async markFileAsClean(fileId: string): Promise<void> {
        await this.filesRepository.update(fileId, {
            isScanned: true,
            scanResult: 'clean',
            scanDetails: 'スキャンが無効のため、安全とみなされました',
            scannedAt: new Date(),
        });
    }

    /**
     * ファイルをスキャンエラーとしてマーク
     */
    private async markFileAsScanError(fileId: string, errorMessage: string): Promise<void> {
        await this.filesRepository.update(fileId, {
            isScanned: true,
            scanResult: 'error',
            scanDetails: `スキャンエラー: ${errorMessage}`,
            scannedAt: new Date(),
        });
    }

    /**
     * ファイルアクセス権限をチェック
     */
    async checkFileAccess(fileId: string, userId: string, action: 'read' | 'write' | 'delete'): Promise<boolean> {
        try {
            const file = await this.filesRepository.findById(fileId);
            if (!file) {
                return false;
            }

            // 感染ファイルへのアクセスを禁止
            if (file.scanResult === 'infected') {
                this.logger.warn(`ユーザー ${userId} が感染ファイル ${fileId} へのアクセスを試行しました`);

                // セキュリティログを記録
                const logAction = action === 'read' ? 'download' :
                    action === 'write' ? 'view' :
                        action;

                await this.filesRepository.logAccess({
                    fileId,
                    userId,
                    action: logAction,
                    success: false,
                    failureReason: '感染ファイルへのアクセスが拒否されました',
                });

                return false;
            }

            // 削除されたファイルへのアクセスを禁止
            if (file.isDeleted) {
                return false;
            }

            // アップロード者は常にアクセス可能
            if (file.uploadedBy === userId) {
                return true;
            }

            // その他の権限チェックロジックをここに追加
            // 例: 管理者権限、チーム権限など

            return true;

        } catch (error) {
            this.logger.error(`ファイル ${fileId} のアクセス権限チェック中にエラーが発生しました:`, error);
            return false;
        }
    }

    /**
     * 手動でファイルを再スキャン
     */
    async rescanFile(fileId: string, userId: string): Promise<FileScanResult> {
        const file = await this.filesRepository.findById(fileId);
        if (!file) {
            throw new Error('ファイルが見つかりません');
        }

        this.logger.log(`ユーザー ${userId} がファイル ${fileId} の再スキャンを要求しました`);

        const scanResult = await this.scanFile(fileId, file.filePath);
        await this.processScanResult(fileId, scanResult);

        return scanResult;
    }

    /**
     * 実行可能ファイルかどうかを判定
     */
    private isExecutableFile(filePath: string): boolean {
        const executableExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.msi', '.app', '.deb', '.rpm'];
        const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return executableExtensions.includes(extension);
    }

    /**
     * スクリプトファイルかどうかを判定
     */
    private isScriptFile(filePath: string): boolean {
        const scriptExtensions = ['.js', '.vbs', '.ps1', '.sh', '.py', '.php', '.pl'];
        const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return scriptExtensions.includes(extension);
    }

    /**
     * 隔離ディレクトリの存在確認・作成
     */
    private async ensureQuarantineDirectory(): Promise<void> {
        try {
            await fs.access(this.quarantinePath);
        } catch {
            await fs.mkdir(this.quarantinePath, { recursive: true });
            this.logger.log(`隔離ディレクトリを作成しました: ${this.quarantinePath}`);
        }
    }

    /**
     * セキュリティ統計を取得
     */
    async getSecurityStatistics(): Promise<{
        totalScanned: number;
        cleanFiles: number;
        infectedFiles: number;
        suspiciousFiles: number;
        errorFiles: number;
        quarantinedFiles: number;
    }> {
        // 実装は FilesRepository に統計メソッドを追加する必要があります
        // ここでは基本的な構造のみ示します
        return {
            totalScanned: 0,
            cleanFiles: 0,
            infectedFiles: 0,
            suspiciousFiles: 0,
            errorFiles: 0,
            quarantinedFiles: 0,
        };
    }
}