/**
 * FAQ公開サイトモジュール
 * 要件: 6.3, 6.4 (FAQ公開システムの実装)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FAQ } from '../entities/faq.entity';
import { Application } from '../entities/application.entity';
import { FAQSiteService } from '../services/faq-site.service';
import { FAQSiteController } from '../controllers/faq-site.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FAQ, Application]),
  ],
  controllers: [FAQSiteController],
  providers: [
    FAQSiteService,
  ],
  exports: [
    FAQSiteService,
  ],
})
export class FAQSiteModule {}