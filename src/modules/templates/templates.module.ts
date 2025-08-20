import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    Template,
    TemplateVariable,
    TemplateUsage,
    Macro,
    MacroUsage
} from './entities';
import {
    TemplatesController,
    TemplateSuggestionController,
    MacroController
} from './controllers';
import {
    TemplatesService,
    TemplateSuggestionService,
    TemplateMacroService
} from './services';
import { TemplatesRepository } from './repositories';

/**
 * テンプレート管理モジュール
 * テンプレートの作成、編集、共有機能とマクロ機能を提供
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Template,
            TemplateVariable,
            TemplateUsage,
            Macro,
            MacroUsage,
        ]),
    ],
    controllers: [
        TemplatesController,
        TemplateSuggestionController,
        MacroController,
    ],
    providers: [
        TemplatesService,
        TemplateSuggestionService,
        TemplateMacroService,
        TemplatesRepository,
    ],
    exports: [
        TemplatesService,
        TemplateSuggestionService,
        TemplateMacroService,
        TemplatesRepository,
    ],
})
export class TemplatesModule { }