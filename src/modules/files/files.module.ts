import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { FileService } from './services/file.service';
import { FileStorageService } from './services/file-storage.service';
import { File } from '../../common/entities/file.entity';
import { FileRepository } from '../../common/repositories/file.repository';

/**
 * ファイル管理モジュール
 * 要件: 11.1, 11.2, 11.3 (ファイル管理システムの実装)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    FileService,
    FileStorageService,
    FileRepository,
  ],
  exports: [
    FileService,
    FileStorageService,
  ],
})
export class FilesModule {}