/**
 * 予測分析モジュール
 * 要件: 9.3 (予測分析機能の実装)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PredictionService } from '../../modules/analytics/services/prediction.service';
import { PredictionController } from '../controllers/prediction.controller';
import { Inquiry } from '../entities/inquiry.entity';
import { Response } from '../entities/response.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Application } from '../entities/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inquiry,
      Response,
      User,
      Application
    ])
  ],
  controllers: [PredictionController],
  providers: [PredictionService],
  exports: [PredictionService]
})
export class PredictionModule {}