/**
 * FAQモジュール
 * 要件: 6.1, 6.2, 6.3, 6.4 (FAQ管理システムの実装)
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// エンティティ
import { FAQ } from '../../common/entities/faq.entity';
import { Application } from '../../common/entities/application.entity';
import { Inquiry } from '../../common/entities/inquiry.entity';
import { Response } from '../../common/entities/response.entity';

// サービス
import { FAQService } from './services/faq.service';
import { FAQClusteringService } from './services/faq-clustering.service';

// リポジトリ
import { FAQRepository } from '../../common/repositories/faq.repository';

// 他モジュールからのインポート（循環依存を避けるためforwardRefを使用）
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FAQ, Application, Inquiry, Response]),
    forwardRef(() => SearchModule), // VectorServiceを使用するため
  ],
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
export class FAQsModule {}