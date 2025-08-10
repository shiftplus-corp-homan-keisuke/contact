/**
 * FAQモジュール
 * 要件: 6.3, 6.4 (FAQ管理機能)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FAQ } from '../entities/faq.entity';
import { Application } from '../entities/application.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { Response } from '../entities/response.entity';
import { FAQService } from '../services/faq.service';
import { FAQClusteringService } from '../services/faq-clustering.service';
import { FAQController } from '../controllers/faq.controller';
import { FAQRepository } from '../repositories/faq.repository';
import { InquiryModule } from './inquiry.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FAQ, Application, Inquiry, Response]),
    InquiryModule,
  ],
  controllers: [FAQController],
  providers: [
    FAQService,
    FAQClusteringService,
    FAQRepository,
  ],
  exports: [
    FAQService,
    FAQClusteringService,
    FAQRepository,
  ],
})
export class FAQModule {}