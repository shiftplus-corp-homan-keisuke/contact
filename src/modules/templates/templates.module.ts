import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateService } from './services/template.service';
import { TemplateSuggestionService } from './services/template-suggestion.service';
import { Template } from '../../common/entities/template.entity';
import { TemplateVariable } from '../../common/entities/template-variable.entity';
import { TemplateUsage } from '../../common/entities/template-usage.entity';
import { User } from '../users/entities/user.entity';
import { Application } from '../../common/entities/application.entity';
import { Inquiry } from '../../common/entities/inquiry.entity';
import { TemplateRepository } from '../../common/repositories/template.repository';
import { HybridSearchService } from '../../common/services/hybrid-search.service';
import { TemplateMacroService } from '../../common/services/template-macro.service';

/**
 * テンプレートモジュール
 * 要件: 10.1, 10.2, 10.3 (テンプレート管理システムの実装)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Template,
      TemplateVariable,
      TemplateUsage,
      User,
      Application,
      Inquiry,
    ]),
  ],
  providers: [
    TemplateService,
    TemplateSuggestionService,
    TemplateRepository,
    HybridSearchService,
    TemplateMacroService,
  ],
  exports: [
    TemplateService,
    TemplateSuggestionService,
  ],
})
export class TemplatesModule {}