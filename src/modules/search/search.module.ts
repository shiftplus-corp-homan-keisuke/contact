/**
 * 検索モジュール
 * 要件: 8.1, 8.2, 8.3, 8.4, 3.1, 3.2 (検索・フィルタリング機能とベクトル検索機能)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// エンティティ
import { Inquiry } from '../../common/entities/inquiry.entity';
import { Response } from '../../common/entities/response.entity';
import { FAQ } from '../../common/entities/faq.entity';

// サービス
import { VectorService } from './services/vector.service';
import { HybridSearchService } from './services/hybrid-search.service';

// 共通サービス（他モジュールから使用される可能性があるため）
// import { SearchService } from '../../common/services/search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, Response, FAQ]),
    ConfigModule,
  ],
  providers: [
    VectorService,
    HybridSearchService,
    // SearchService,
  ],
  exports: [
    VectorService,
    HybridSearchService,
    // SearchService,
  ],
})
export class SearchModule {}