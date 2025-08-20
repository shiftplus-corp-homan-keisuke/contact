import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { File, FileAccessLog } from './entities';
import { FilesController, FileSecurityController, FileStorageController } from './controllers';
import { FilesService, FileSecurityService, FileStorageService } from './services';
import { FilesRepository } from './repositories';
import { FileValidator } from './validators';

/**
 * ファイル管理モジュール
 * ファイルのアップロード、ダウンロード、管理機能を提供
 */
@Module({
    imports: [
        // TypeORMエンティティの登録
        TypeOrmModule.forFeature([File, FileAccessLog]),

        // スケジュール機能
        ScheduleModule.forRoot(),

        // Multerの設定（ファイルアップロード用）
        MulterModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                limits: {
                    fileSize: configService.get<number>('MAX_FILE_SIZE', 50 * 1024 * 1024), // 50MB
                    files: 10, // 最大10ファイル
                },
                fileFilter: (req, file, callback) => {
                    // ファイルフィルターは後でバリデーターで行うため、ここでは全て許可
                    callback(null, true);
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [FilesController, FileSecurityController, FileStorageController],
    providers: [
        FilesService,
        FileSecurityService,
        FileStorageService,
        FilesRepository,
        FileValidator,
    ],
    exports: [
        FilesService,
        FileSecurityService,
        FileStorageService,
        FilesRepository,
        FileValidator,
    ],
})
export class FilesModule { }