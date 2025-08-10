import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth.module';
import { ApiKeyModule } from './modules/api-key.module';
import { InquiryModule } from './modules/inquiry.module';
import { ResponseModule } from './modules/response.module';
import { WorkflowModule } from './modules/workflow.module';
import { FAQModule } from './modules/faq.module';
import { FAQSiteModule } from './modules/faq-site.module';
import { NotificationModule } from './modules/notification.module';
import { SlaModule } from './modules/sla.module';
import { AnalyticsModule } from './modules/analytics.module';
import { PredictionModule } from './modules/prediction.module';
import { TemplateModule } from './modules/template.module';
import { FileModule } from './modules/file.module';

@Module({
  imports: [
    AuthModule,
    ApiKeyModule,
    InquiryModule,
    ResponseModule,
    WorkflowModule,
    FAQModule,
    FAQSiteModule,
    NotificationModule,
    SlaModule,
    AnalyticsModule,
    PredictionModule,
    TemplateModule,
    FileModule,
  ],
  providers: [],
  exports: [
    AuthModule,
    ApiKeyModule,
    InquiryModule,
    ResponseModule,
    WorkflowModule,
    FAQModule,
    FAQSiteModule,
    NotificationModule,
    SlaModule,
    AnalyticsModule,
    PredictionModule,
    TemplateModule,
    FileModule,
  ],
})
export class CommonModule {}