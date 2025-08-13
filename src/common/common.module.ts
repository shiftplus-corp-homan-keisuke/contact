import { Module } from '@nestjs/common';

import { ApiKeyModule } from './modules/api-key.module';
import { InquiryModule } from './modules/inquiry.module';
import { ResponseModule } from './modules/response.module';
import { WorkflowModule } from './modules/workflow.module';
import { FAQModule } from './modules/faq.module';
import { FAQSiteModule } from './modules/faq-site.module';
import { NotificationModule } from './modules/notification.module';
import { SlaModule } from './modules/sla.module';

import { UsersModule } from '../modules/users/users.module';

@Module({
  imports: [
    UsersModule,
    ApiKeyModule,
    InquiryModule,
    ResponseModule,
    WorkflowModule,
    FAQModule,
    FAQSiteModule,
    NotificationModule,
    SlaModule,
  ],
  providers: [],
  exports: [
    UsersModule,
    ApiKeyModule,
    InquiryModule,
    ResponseModule,
    WorkflowModule,
    FAQModule,
    FAQSiteModule,
    NotificationModule,
    SlaModule,
  ],
})
export class CommonModule {}