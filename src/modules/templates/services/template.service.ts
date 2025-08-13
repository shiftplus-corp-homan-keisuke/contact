/**
 * テンプレートサービス
 * 要件: 10.1, 10.2, 10.3 (テンプレート管理システム)
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../../../common/entities/template.entity';
import { TemplateVariable } from '../../../common/entities/template-variable.entity';
import { TemplateUsage } from '../../../common/entities/template-usage.entity';
import { User } from '../../users/entities/user.entity';
import { Application } from '../../../common/entities/application.entity';
import { TemplateRepository, TemplateSearchOptions } from '../../../common/repositories/template.repository';
import { HybridSearchService } from '../../search/services/hybrid-search.service';
import { TemplateSuggestionService } from './template-suggestion.service';
import { TemplateMacroService, MacroContext } from '../../../common/services/template-macro.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  SearchTemplateDto,
  UseTemplateDto,
  TemplateSuggestionDto,
  TemplateEffectivenessDto,
  TemplateResponseDto,
  TemplateUsageResultDto,
  TemplateStatisticsDto
} from '../../../common/dto/template.dto';
import {
  TemplateProcessingResult,
  TemplateSuggestion,
  TemplateStatistics,
  TemplateUsageContext,
  TemplateError,
  TemplateVariableType
} from '../../../common/types/template.types';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly templateRepository: TemplateRepository,
    private readonly hybridSearchService: HybridSearchService,
    private readonly templateSuggestionService: TemplateSuggestionService,
    private readonly templateMacroService: TemplateMacroService,
  ) {}

  /**
   * テンプレート作成
   * 要件: 10.1 (テンプレート管理機能)
   */
  async createTemplate(createTemplateDto: CreateTemplateDto, userId: string): Promise<TemplateResponseDto> {
    this.logger.log(`テンプレート作成開始: name=${createTemplateDto.name}, userId=${userId}`);

    // ユーザー存在確認
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`ユーザーが見つかりません: ${userId}`);
    }

    // アプリケーション存在確認（指定されている場合）
    if (createTemplateDto.appId) {
      const application = await this.applicationRepository.findOne({
        where: { id: createTemplateDto.appId }
      });
      if (!application) {
        throw new NotFoundException(`アプリケーションが見つかりません: ${createTemplateDto.appId}`);
      }
    }

    // テンプレート作成
    const template = await this.templateRepository.create({
      name: createTemplateDto.name,
      content: createTemplateDto.content,
      category: createTemplateDto.category,
      description: createTemplateDto.description,
      appId: createTemplateDto.appId,
      createdBy: userId,
      isShared: createTemplateDto.isShared || false,
      tags: createTemplateDto.tags || [],
    });

    // 変数定義作成
    if (createTemplateDto.variables && createTemplateDto.variables.length > 0) {
      for (const variableDto of createTemplateDto.variables) {
        await this.templateRepository.createVariable({
          templateId: template.id,
          name: variableDto.name,
          type: variableDto.type,
          description: variableDto.description,
          defaultValue: variableDto.defaultValue,
          isRequired: variableDto.isRequired || false,
          options: variableDto.options,
          validationRules: variableDto.validationRules,
        });
      }
    }

    // ベクトル化してベクトルDBに保存
    await this.storeTemplateVector(template);

    this.logger.log(`テンプレート作成完了: id=${template.id}`);
    return await this.getTemplateResponse(template.id);
  }

  /**
   * テンプレート取得
   */
  async getTemplate(id: string, userId: string): Promise<TemplateResponseDto> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`テンプレートが見つかりません: ${id}`);
    }

    // アクセス権限チェック
    await this.checkTemplateAccess(template, userId);

    return this.mapToResponseDto(template);
  }

  /**
   * テンプレート更新
   * 要件: 10.1 (テンプレート管理機能)
   */
  async updateTemplate(id: string, updateTemplateDto: UpdateTemplateDto, userId: string): Promise<TemplateResponseDto> {
    this.logger.log(`テンプレート更新開始: id=${id}, userId=${userId}`);

    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`テンプレートが見つかりません: ${id}`);
    }

    // 更新権限チェック
    await this.checkTemplateEditAccess(template, userId);

    // テンプレート更新
    const updatedTemplate = await this.templateRepository.update(id, updateTemplateDto);

    // ベクトル更新（内容が変更された場合）
    if (updateTemplateDto.content || updateTemplateDto.name) {
      await this.updateTemplateVector(updatedTemplate);
    }

    this.logger.log(`テンプレート更新完了: id=${id}`);
    return this.mapToResponseDto(updatedTemplate);
  }

  /**
   * テンプレート削除
   * 要件: 10.1 (テンプレート管理機能)
   */
  async deleteTemplate(id: string, userId: string): Promise<void> {
    this.logger.log(`テンプレート削除開始: id=${id}, userId=${userId}`);

    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`テンプレートが見つかりません: ${id}`);
    }

    // 削除権限チェック
    await this.checkTemplateEditAccess(template, userId);

    // 論理削除
    await this.templateRepository.softDelete(id);

    this.logger.log(`テンプレート削除完了: id=${id}`);
  }

  /**
   * テンプレート検索
   * 要件: 10.1 (テンプレート管理機能)
   */
  async searchTemplates(searchDto: SearchTemplateDto, userId: string): Promise<{ templates: TemplateResponseDto[]; total: number; page: number; limit: number }> {
    const options: TemplateSearchOptions = {
      query: searchDto.query,
      category: searchDto.category,
      tags: searchDto.tags,
      appId: searchDto.appId,
      createdBy: searchDto.createdBy,
      isShared: searchDto.isShared,
      isActive: searchDto.isActive,
      page: searchDto.page,
      limit: searchDto.limit,
    };

    const { templates, total } = await this.templateRepository.search(options);

    // アクセス可能なテンプレートのみフィルタリング
    const accessibleTemplates = [];
    for (const template of templates) {
      try {
        await this.checkTemplateAccess(template, userId);
        accessibleTemplates.push(this.mapToResponseDto(template));
      } catch (error) {
        // アクセス権限がない場合はスキップ
        continue;
      }
    }

    return {
      templates: accessibleTemplates,
      total: accessibleTemplates.length,
      page: searchDto.page || 1,
      limit: searchDto.limit || 20,
    };
  }

  /**
   * テンプレート使用
   * 要件: 10.3 (マクロ・変数置換機能)
   */
  async useTemplate(useTemplateDto: UseTemplateDto, userId: string): Promise<TemplateUsageResultDto> {
    this.logger.log(`テンプレート使用開始: templateId=${useTemplateDto.templateId}, userId=${userId}`);

    const template = await this.templateRepository.findById(useTemplateDto.templateId);
    if (!template) {
      throw new NotFoundException(`テンプレートが見つかりません: ${useTemplateDto.templateId}`);
    }

    // アクセス権限チェック
    await this.checkTemplateAccess(template, userId);

    // テンプレート処理
    const processingResult = await this.processTemplate(template, useTemplateDto.variables);

    // 使用履歴記録
    const usage = await this.templateRepository.createUsage({
      templateId: template.id,
      usedBy: userId,
      inquiryId: useTemplateDto.inquiryId,
      responseId: useTemplateDto.responseId,
      usageContext: useTemplateDto.context || TemplateUsageContext.RESPONSE,
      variablesUsed: useTemplateDto.variables,
      generatedContent: processingResult.content,
    });

    // 使用回数更新
    await this.templateRepository.incrementUsageCount(template.id);

    this.logger.log(`テンプレート使用完了: templateId=${template.id}, usageId=${usage.id}`);

    return {
      content: processingResult.content,
      variables: processingResult.variables,
      usageId: usage.id,
      errors: processingResult.errors || [],
    };
  }

  /**
   * テンプレート提案
   * 要件: 10.2 (AI支援テンプレート提案)
   */
  async suggestTemplates(suggestionDto: TemplateSuggestionDto, userId: string): Promise<TemplateSuggestion[]> {
    this.logger.log(`テンプレート提案開始: userId=${userId}`);

    return await this.templateSuggestionService.suggestTemplates({
      content: suggestionDto.content,
      category: suggestionDto.category,
      appId: suggestionDto.appId,
      userId: userId,
      limit: suggestionDto.limit,
      includeUsageStats: true,
      contextualBoost: true,
    });
  }

  /**
   * 人気テンプレート取得
   * 要件: 10.2 (使用統計に基づく人気テンプレート表示)
   */
  async getPopularTemplates(limit: number = 10, appId?: string, userId?: string): Promise<TemplateResponseDto[]> {
    const templates = await this.templateRepository.findPopularTemplates(limit * 2, appId);

    const accessibleTemplates = [];
    for (const template of templates) {
      try {
        if (userId) {
          await this.checkTemplateAccess(template, userId);
        }
        accessibleTemplates.push(this.mapToResponseDto(template));
        if (accessibleTemplates.length >= limit) break;
      } catch (error) {
        // アクセス権限がない場合はスキップ
        continue;
      }
    }

    return accessibleTemplates;
  }

  /**
   * テンプレート効果評価
   * 要件: 10.2 (テンプレート効果測定機能)
   */
  async rateTemplateEffectiveness(effectivenessDto: TemplateEffectivenessDto, userId: string): Promise<void> {
    this.logger.log(`テンプレート効果評価開始: usageId=${effectivenessDto.usageId}, rating=${effectivenessDto.rating}`);

    const usage = await this.templateRepository['usageRepository'].findOne({
      where: { id: effectivenessDto.usageId },
      relations: ['template'],
    });

    if (!usage) {
      throw new NotFoundException(`使用履歴が見つかりません: ${effectivenessDto.usageId}`);
    }

    // 評価者権限チェック（使用者本人または管理者）
    if (usage.usedBy !== userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
      });
      if (!user || user.role.name !== 'admin') {
        throw new ForbiddenException('この評価を行う権限がありません');
      }
    }

    // 使用履歴更新
    await this.templateRepository['usageRepository'].update(effectivenessDto.usageId, {
      effectivenessRating: effectivenessDto.rating,
      feedbackComment: effectivenessDto.comment,
    });

    // テンプレートの効果スコア再計算
    await this.recalculateEffectivenessScore(usage.templateId);

    this.logger.log(`テンプレート効果評価完了: usageId=${effectivenessDto.usageId}`);
  }

  /**
   * テンプレート統計取得
   * 要件: 10.3 (テンプレート使用統計)
   */
  async getTemplateStatistics(templateId: string, userId: string): Promise<TemplateStatisticsDto> {
    const template = await this.templateRepository.findById(templateId);
    if (!template) {
      throw new NotFoundException(`テンプレートが見つかりません: ${templateId}`);
    }

    // アクセス権限チェック
    await this.checkTemplateAccess(template, userId);

    // 統計データ取得
    const usageHistory = await this.templateRepository.findUsageHistory(templateId, 1000);
    
    const statistics = this.calculateTemplateStatistics(template, usageHistory);

    return {
      totalUsage: statistics.totalUsage,
      averageEffectiveness: statistics.averageEffectiveness,
      popularVariables: statistics.popularVariables,
      usageByContext: statistics.usageByContext,
      usageByUser: statistics.usageByUser,
      usageTrend: statistics.usageTrend,
    };
  }

  /**
   * 個人化テンプレート推奨
   * 要件: 10.2 (AI支援テンプレート提案)
   */
  async getPersonalizedTemplateRecommendations(
    userId: string,
    limit: number = 5
  ): Promise<TemplateSuggestion[]> {
    return await this.templateSuggestionService.getPersonalizedTemplateRecommendations(userId, limit);
  }

  /**
   * テンプレート効果測定
   * 要件: 10.2 (テンプレート効果測定機能)
   */
  async measureTemplateEffectiveness(templateId: string, userId: string): Promise<any> {
    const template = await this.templateRepository.findById(templateId);
    if (!template) {
      throw new NotFoundException(`テンプレートが見つかりません: ${templateId}`);
    }

    // アクセス権限チェック
    await this.checkTemplateAccess(template, userId);

    return await this.templateSuggestionService.measureTemplateEffectiveness(templateId);
  }

  /**
   * テンプレート処理（高度な変数置換とマクロ展開）
   * 要件: 10.3 (マクロ・変数置換機能)
   */
  private async processTemplate(template: Template, variables: Record<string, any>, context?: MacroContext): Promise<TemplateProcessingResult> {
    // マクロサービスを使用した高度なテンプレート処理
    return await this.templateMacroService.processTemplate(template, variables, context || {});
  }

  /**
   * マクロ展開
   * 要件: 10.3 (マクロ機能の実装)
   */
  async expandMacro(
    macroName: string,
    parameters: any[],
    context: MacroContext,
    userId: string
  ): Promise<any> {
    this.logger.log(`マクロ展開開始: macroName=${macroName}, userId=${userId}`);

    return await this.templateMacroService.expandMacro(macroName, parameters, context);
  }

  /**
   * 使用統計記録
   * 要件: 10.3 (テンプレート使用統計の実装)
   */
  async recordDetailedUsageStatistics(
    templateId: string,
    userId: string,
    variables: Record<string, any>,
    context: MacroContext,
    generatedContent: string
  ): Promise<void> {
    await this.templateMacroService.recordTemplateUsage(
      templateId,
      userId,
      variables,
      context,
      generatedContent
    );
  }

  /**
   * 変数バリデーション
   */
  private validateVariable(name: string, value: any, rule: any): TemplateError | null {
    switch (rule.type) {
      case 'minLength':
        if (String(value).length < rule.value) {
          return {
            variable: name,
            message: rule.message || `${name}は${rule.value}文字以上で入力してください`,
            type: 'validation',
          };
        }
        break;
      case 'maxLength':
        if (String(value).length > rule.value) {
          return {
            variable: name,
            message: rule.message || `${name}は${rule.value}文字以下で入力してください`,
            type: 'validation',
          };
        }
        break;
      case 'pattern':
        if (!new RegExp(rule.value).test(String(value))) {
          return {
            variable: name,
            message: rule.message || `${name}の形式が正しくありません`,
            type: 'validation',
          };
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return {
            variable: name,
            message: rule.message || `${name}は有効なメールアドレスを入力してください`,
            type: 'validation',
          };
        }
        break;
    }
    return null;
  }

  /**
   * テンプレートアクセス権限チェック
   */
  private async checkTemplateAccess(template: Template, userId: string): Promise<void> {
    // 作成者は常にアクセス可能
    if (template.createdBy === userId) {
      return;
    }

    // 共有テンプレートはアクセス可能
    if (template.isShared) {
      return;
    }

    // 管理者は常にアクセス可能
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (user && user.role.name === 'admin') {
      return;
    }

    throw new ForbiddenException('このテンプレートにアクセスする権限がありません');
  }

  /**
   * テンプレート編集権限チェック
   */
  private async checkTemplateEditAccess(template: Template, userId: string): Promise<void> {
    // 作成者は常に編集可能
    if (template.createdBy === userId) {
      return;
    }

    // 管理者は常に編集可能
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (user && user.role.name === 'admin') {
      return;
    }

    throw new ForbiddenException('このテンプレートを編集する権限がありません');
  }

  /**
   * テンプレートベクトル保存
   */
  private async storeTemplateVector(template: Template): Promise<void> {
    try {
      const text = `${template.name} ${template.content} ${template.description || ''}`;
      await this.hybridSearchService.storeVector(
        template.id,
        await this.hybridSearchService.embedText(text),
        {
          id: template.id,
          type: 'template',
          appId: template.appId,
          category: template.category,
          status: 'active',
          createdAt: template.createdAt.toISOString(),
          title: template.name,
        }
      );
    } catch (error) {
      this.logger.error(`テンプレートベクトル保存エラー: ${error.message}`, error.stack);
    }
  }

  /**
   * テンプレートベクトル更新
   */
  private async updateTemplateVector(template: Template): Promise<void> {
    try {
      const text = `${template.name} ${template.content} ${template.description || ''}`;
      await this.hybridSearchService.updateVector(
        template.id,
        await this.hybridSearchService.embedText(text),
        {
          id: template.id,
          type: 'template',
          appId: template.appId,
          category: template.category,
          status: 'active',
          createdAt: template.createdAt.toISOString(),
          title: template.name,
        }
      );
    } catch (error) {
      this.logger.error(`テンプレートベクトル更新エラー: ${error.message}`, error.stack);
    }
  }

  /**
   * マッチしたキーワード抽出
   */
  private extractMatchedKeywords(query: string, content: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    return queryWords.filter(word => 
      word.length > 2 && contentWords.some(contentWord => contentWord.includes(word))
    );
  }

  /**
   * 効果スコア再計算
   */
  private async recalculateEffectivenessScore(templateId: string): Promise<void> {
    const usageHistory = await this.templateRepository.findUsageHistory(templateId, 100);
    const ratings = usageHistory
      .filter(usage => usage.effectivenessRating !== null)
      .map(usage => usage.effectivenessRating);

    if (ratings.length > 0) {
      const averageScore = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      await this.templateRepository.updateEffectivenessScore(templateId, averageScore);
    }
  }

  /**
   * テンプレート統計計算
   */
  private calculateTemplateStatistics(template: Template, usageHistory: TemplateUsage[]): TemplateStatistics {
    // 実装は簡略化
    return {
      totalUsage: template.usageCount,
      averageEffectiveness: template.effectivenessScore || 0,
      popularVariables: [],
      usageByContext: {
        response: 0,
        email: 0,
        chat: 0,
        sms: 0,
        notification: 0,
      },
      usageByUser: [],
      usageTrend: [],
    };
  }

  /**
   * レスポンスDTO変換
   */
  private mapToResponseDto(template: Template): TemplateResponseDto {
    return {
      id: template.id,
      name: template.name,
      content: template.content,
      category: template.category || '',
      description: template.description || '',
      appId: template.appId || '',
      createdBy: template.createdBy,
      isShared: template.isShared,
      isActive: template.isActive,
      usageCount: template.usageCount,
      effectivenessScore: template.effectivenessScore || 0,
      tags: template.tags || [],
      lastUsedAt: template.lastUsedAt,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      variables: template.variables?.map(v => ({
        name: v.name,
        type: v.type as any,
        description: v.description,
        defaultValue: v.defaultValue,
        isRequired: v.isRequired,
        options: v.options,
        validationRules: v.validationRules,
      })) || [],
    };
  }

  /**
   * テンプレートレスポンス取得
   */
  private async getTemplateResponse(id: string): Promise<TemplateResponseDto> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`テンプレートが見つかりません: ${id}`);
    }
    return this.mapToResponseDto(template);
  }
}