/**
 * 問い合わせモジュール
 * 要件1: 問い合わせ登録機能
 * 要件2: 問い合わせ・回答管理機能
 * 要件8: 検索・フィルタリング機能
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// エンティティ
import {
    Inquiry,
    InquiryStatusHistory,
    Application
} from './entities';

// 他モジュールのエンティティ
import { Response } from '../responses/entities/response.entity';

// サービス
import { InquiriesService, WorkflowService } from './services';

// コントローラー
import { InquiriesController, WorkflowController } from './controllers';

// 検索モジュール
import { SearchModule } from '../search/search.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Inquiry,
            InquiryStatusHistory,
            Application,
            Response
        ]),
        SearchModule
    ],
    controllers: [
        InquiriesController,
        WorkflowController
    ],
    providers: [
        InquiriesService,
        WorkflowService
    ],
    exports: [
        InquiriesService,
        WorkflowService,
        TypeOrmModule
    ]
})
export class InquiriesModule { }