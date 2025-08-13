/**
 * ワークフローモジュール
 * 要件: 2.2, 2.3 (状態管理とワークフロー機能)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from '../controllers/workflow.controller';
import { WorkflowService } from '../services/workflow.service';
import { Inquiry } from '../entities/inquiry.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';
import { User } from '../../modules/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inquiry,
      InquiryStatusHistory,
      User,
    ]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}