/**
 * 問い合わせモジュール
 * 要件: 1.1, 1.3, 1.4 (問い合わせ登録・管理機能)
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { InquiryController } from '../controllers/inquiry.controller';
import { InquiryService } from '../services/inquiry.service';
import { SearchService } from '../services/search.service';
import { VectorService } from '../services/vector.service';
import { HybridSearchService } from '../services/hybrid-search.service';
import { AnalyticsModule } from './analytics.module';
import { Inquiry } from '../entities/inquiry.entity';
import { Application } from '../entities/application.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Response } from '../entities/response.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Inquiry,
      Application,
      User,
      Response,
    ]),
    forwardRef(() => AnalyticsModule),
  ],
  controllers: [InquiryController],
  providers: [InquiryService, SearchService, VectorService, HybridSearchService],
  exports: [InquiryService, SearchService, VectorService, HybridSearchService],
})
export class InquiryModule {}