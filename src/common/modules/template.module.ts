/**
 * テンプレートモジュール
 * 要件: 10.1, 10.2, 10.3 (テンプレート管理システム)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from '../entities/template.entity';
import { TemplateVariable } from '../entities/template-variable.entity';
import { TemplateUsage } from '../entities/template-usage.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Application } from '../entities/application.entity';
import { TemplateController } from '../controllers/template.controller';
import { TemplateService } from '../../modules/templates/services/template.service';
import { TemplateRepository } from '../repositories/template.repository';
import { HybridSearchService } from '../services/hybrid-search.service';
import { TemplateSuggestionService } from '../../modules/templates/services/template-suggestion.service';
import { TemplateMacroService } from '../services/template-macro.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Template,
      TemplateVariable,
      TemplateUsage,
      User,
      Application,
    ]),
  ],
  controllers: [TemplateController],
  providers: [
    TemplateService,
    TemplateRepository,
    HybridSearchService,
    TemplateSuggestionService,
    TemplateMacroService,
  ],
  exports: [
    TemplateService,
    TemplateRepository,
  ],
})
export class TemplateModule {}