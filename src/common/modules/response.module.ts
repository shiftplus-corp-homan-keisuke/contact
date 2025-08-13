/**
 * 回答モジュール
 * 要件: 2.1, 2.3, 2.4 (回答管理機能)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponseController } from '../controllers/response.controller';
import { ResponseService } from '../services/response.service';
import { Response } from '../entities/response.entity';
import { ResponseHistory } from '../entities/response-history.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { User } from '../../modules/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Response,
      ResponseHistory,
      Inquiry,
      User,
    ]),
  ],
  controllers: [ResponseController],
  providers: [ResponseService],
  exports: [ResponseService],
})
export class ResponseModule {}