import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { File } from '../entities/file.entity';
import { FileAccessLog } from '../entities/file-access-log.entity';
import { FileService } from '../services/file.service';
import { FileSecurityService } from '../services/file-security.service';
import { FileStorageService } from '../services/file-storage.service';
import { FileController } from '../controllers/file.controller';
import { FileSecurityController } from '../controllers/file-security.controller';
import { FileStorageController } from '../controllers/file-storage.controller';
import { FileRepository } from '../repositories/file.repository';

/**
 * ファイル管理モジュール
 * ファイルのアップロード、ダウンロード、管理機能を提供
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([File, FileAccessLog]),
    ConfigModule,
    ScheduleModule.forRoot(),
    MulterModule.register({
      dest: './uploads', // 一時的なアップロード先
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5, // 同時アップロード可能ファイル数
      },
    }),
  ],
  controllers: [FileController, FileSecurityController, FileStorageController],
  providers: [
    FileService,
    FileSecurityService,
    FileStorageService,
    FileRepository,
  ],
  exports: [
    FileService,
    FileSecurityService,
    FileStorageService,
    FileRepository,
  ],
})
export class FileModule {}