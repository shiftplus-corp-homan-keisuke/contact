/**
 * 回答モジュール
 * 要件: 2.1, 2.2, 2.3 (回答管理機能)
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponseController } from './controllers/response.controller';
import { ResponseService } from './services/response.service';
import { ResponseRepository } from './repositories/response.repository';
import { Response } from '../../common/entities/response.entity';
import { ResponseHistory } from '../../common/entities/response-history.entity';
import { Inquiry } from '../../common/entities/inquiry.entity';
import { User } from '../users/entities/user.entity';
import { Template } from '../../common/entities/template.entity';
import { File } from '../../common/entities/file.entity';

// 他モジュールからのインポート（循環依存を避けるためforwardRefを使用）
import { InquiriesModule } from '../inquiries/inquiries.module';
import { TemplatesModule } from '../templates/templates.module';
import { NotificationsModule } from '../notifications/notifications.module';

// 他モジュールのリポジトリのインポート
import { UserRepository } from '../users/repositories/user.repository';
import { TemplateRepository } from '../../common/repositories/template.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Response,
      ResponseHistory,
      Inquiry,
      User,
      Template,
      File,
    ]),
    forwardRef(() => InquiriesModule), // 問い合わせとの関連のため
    forwardRef(() => TemplatesModule), // テンプレート機能のため
    forwardRef(() => NotificationsModule), // 通知機能のため
  ],
  controllers: [ResponseController],
  providers: [
    ResponseService,
    ResponseRepository,
    UserRepository,
    TemplateRepository,
  ],
  exports: [
    ResponseService,
    ResponseRepository,
  ],
})
export class ResponsesModule {}