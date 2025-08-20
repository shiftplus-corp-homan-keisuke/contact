/**
 * 回答モジュール
 * 要件2.1: 問い合わせと回答の関連付け機能
 * 要件2.3: 回答の追加・更新・履歴管理機能
 * 要件2.4: 時系列での履歴表示機能
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// エンティティ
import {
    Response,
    ResponseHistory
} from './entities';

// 他モジュールのエンティティ
import { Inquiry } from '../inquiries/entities/inquiry.entity';

// サービス
import { ResponsesService } from './services';

// コントローラー
import { ResponsesController, InquiryResponsesController } from './controllers';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Response,
            ResponseHistory,
            Inquiry
        ])
    ],
    controllers: [
        ResponsesController,
        InquiryResponsesController
    ],
    providers: [
        ResponsesService
    ],
    exports: [
        ResponsesService,
        TypeOrmModule
    ]
})
export class ResponsesModule { }