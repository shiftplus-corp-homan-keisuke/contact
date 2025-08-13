/**
 * 問い合わせモジュール
 * 要件: 1.1, 1.2, 1.3 (問い合わせ管理機能)
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InquiryController } from './controllers/inquiry.controller';
import { InquiryService } from './services/inquiry.service';
import { InquiryRepository } from './repositories/inquiry.repository';
import { Inquiry } from '../../common/entities/inquiry.entity';
import { InquiryStatusHistory } from '../../common/entities/inquiry-status-history.entity';
import { Application } from '../../common/entities/application.entity';
import { User } from '../users/entities/user.entity';
import { File } from '../../common/entities/file.entity';

// 他モジュールからのインポート（循環依存を避けるためforwardRefを使用）
import { SearchModule } from '../search/search.module';
import { NotificationsModule } from '../notifications/notifications.module';

// 共通リポジトリのインポート
import { ApplicationRepository } from '../../common/repositories/base.repository';
import { UserRepository } from '../users/repositories/user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inquiry,
      InquiryStatusHistory,
      Application,
      User,
      File,
    ]),
    forwardRef(() => SearchModule), // 循環依存を避けるためforwardRefを使用
    forwardRef(() => NotificationsModule), // 通知機能のため
  ],
  controllers: [InquiryController],
  providers: [
    InquiryService,
    InquiryRepository,
    ApplicationRepository,
    UserRepository,
  ],
  exports: [
    InquiryService,
    InquiryRepository,
  ],
})
export class InquiriesModule {}