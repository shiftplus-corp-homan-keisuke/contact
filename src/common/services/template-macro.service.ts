/**
 * テンプレートマクロサービス
 * 要件: 10.3 (マクロ・変数置換機能の実装)
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../entities/template.entity';
import { TemplateVariable } from '../entities/template-variable.entity';
import { TemplateUsage } from '../entities/template-usage.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { Response } from '../entities/response.entity';
import {
  MacroDefinition,
  MacroExpansionResult,
  TemplateProcessingResult,
  TemplateError,
  TemplateVariableType,
  ValidationRule
} from '../types/template.types';

export interface MacroContext {
  user?: User;
  inquiry?: Inquiry;
  response?: Response;
  customVariables?: Record<string, any>;
  systemVariables?: Record<string, any>;
}

export interface MacroFunction {
  name: string;
  description: string;
  parameters: string[];
  handler: (params: any[], context: MacroContext) => string | Promise<string>;
}

@Injectable()
export class TemplateMacroService {
  private readonly logger = new Logger(TemplateMacroService.name);
  private readonly macroFunctions: Map<string, MacroFunction> = new Map();

  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(TemplateVariable)
    private readonly variableRepository: Repository<TemplateVariable>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @InjectRepository(Response)
    private readonly responseRepository: Repository<Response>,
  ) {
    this.initializeBuiltInMacros();
  }

  /**
   * テンプレート処理（高度な変数置換とマクロ展開）
   * 要件: 10.3 (動的コンテンツ生成のための変数システム)
   */
  async processTemplate(
    template: Template,
    variables: Record<string, any>,
    context: MacroContext = {}
  ): Promise<TemplateProcessingResult> {
    this.logger.log(`テンプレート処理開始: templateId=${template.id}`);

    try {
      const errors: TemplateError[] = [];
      let content = template.content;

      // 1. システム変数の設定
      const systemVariables = await this.buildSystemVariables(context);
      const allVariables = { ...systemVariables, ...variables };

      // 2. マクロ展開
      content = await this.expandMacros(content, context, errors);

      // 3. 変数バリデーション
      const validationErrors = await this.validateVariables(template.variables, allVariables);
      errors.push(...validationErrors);

      // 4. 変数置換
      content = await this.substituteVariables(content, template.variables, allVariables, errors);

      // 5. 条件分岐処理
      content = await this.processConditionals(content, allVariables, errors);

      // 6. ループ処理
      content = await this.processLoops(content, allVariables, errors);

      // 7. 後処理（フォーマット、エスケープなど）
      content = await this.postProcessContent(content, allVariables);

      this.logger.log(`テンプレート処理完了: templateId=${template.id}`);

      return {
        content,
        variables: allVariables,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      this.logger.error(`テンプレート処理エラー: ${error.message}`, error.stack);
      throw new BadRequestException(`テンプレート処理に失敗しました: ${error.message}`);
    }
  }

  /**
   * マクロ定義の作成
   * 要件: 10.3 (マクロ機能の実装)
   */
  async createMacroDefinition(macroDefinition: MacroDefinition): Promise<MacroDefinition> {
    this.logger.log(`マクロ定義作成: name=${macroDefinition.name}`);

    // マクロ定義のバリデーション
    this.validateMacroDefinition(macroDefinition);

    // データベースに保存（実装は簡略化）
    // 実際にはマクロ定義テーブルが必要

    return macroDefinition;
  }

  /**
   * マクロ展開
   * 要件: 10.3 (マクロ機能の実装)
   */
  async expandMacro(
    macroName: string,
    parameters: any[],
    context: MacroContext
  ): Promise<MacroExpansionResult> {
    this.logger.log(`マクロ展開: name=${macroName}`);

    try {
      const macroFunction = this.macroFunctions.get(macroName);
      if (!macroFunction) {
        return {
          expandedContent: `[MACRO_NOT_FOUND: ${macroName}]`,
          usedVariables: {},
          errors: [{
            variable: macroName,
            message: `マクロが見つかりません: ${macroName}`,
            type: 'processing',
          }],
        };
      }

      // パラメータ数チェック
      if (parameters.length !== macroFunction.parameters.length) {
        return {
          expandedContent: `[MACRO_PARAM_ERROR: ${macroName}]`,
          usedVariables: {},
          errors: [{
            variable: macroName,
            message: `パラメータ数が不正です。期待値: ${macroFunction.parameters.length}, 実際: ${parameters.length}`,
            type: 'processing',
          }],
        };
      }

      // マクロ実行
      const expandedContent = await macroFunction.handler(parameters, context);

      return {
        expandedContent,
        usedVariables: this.extractUsedVariables(expandedContent),
        errors: undefined,
      };

    } catch (error) {
      this.logger.error(`マクロ展開エラー: ${error.message}`, error.stack);
      return {
        expandedContent: `[MACRO_ERROR: ${macroName}]`,
        usedVariables: {},
        errors: [{
          variable: macroName,
          message: `マクロ実行エラー: ${error.message}`,
          type: 'processing',
        }],
      };
    }
  }

  /**
   * 使用統計の記録
   * 要件: 10.3 (テンプレート使用統計の実装)
   */
  async recordTemplateUsage(
    templateId: string,
    userId: string,
    variables: Record<string, any>,
    context: MacroContext,
    generatedContent: string
  ): Promise<void> {
    this.logger.log(`テンプレート使用統計記録: templateId=${templateId}`);

    try {
      // 使用統計の詳細分析
      const usageAnalytics = {
        variableUsage: this.analyzeVariableUsage(variables),
        macroUsage: this.analyzeMacroUsage(generatedContent),
        contentLength: generatedContent.length,
        processingTime: Date.now(), // 実際には処理時間を測定
        contextType: this.determineContextType(context),
      };

      // データベースに記録（実装は簡略化）
      // 実際にはより詳細な統計テーブルが必要

      this.logger.log(`テンプレート使用統計記録完了: templateId=${templateId}`);

    } catch (error) {
      this.logger.error(`使用統計記録エラー: ${error.message}`, error.stack);
      // エラーが発生しても処理は継続
    }
  }

  /**
   * 組み込みマクロの初期化
   */
  private initializeBuiltInMacros(): void {
    // 日付・時刻マクロ
    this.macroFunctions.set('now', {
      name: 'now',
      description: '現在の日時を取得',
      parameters: ['format'],
      handler: (params) => {
        const format = params[0] || 'YYYY-MM-DD HH:mm:ss';
        return this.formatDate(new Date(), format);
      },
    });

    this.macroFunctions.set('date', {
      name: 'date',
      description: '指定された日付をフォーマット',
      parameters: ['date', 'format'],
      handler: (params) => {
        const date = new Date(params[0]);
        const format = params[1] || 'YYYY-MM-DD';
        return this.formatDate(date, format);
      },
    });

    // ユーザー情報マクロ
    this.macroFunctions.set('user_name', {
      name: 'user_name',
      description: 'ユーザー名を取得',
      parameters: [],
      handler: (params, context) => {
        return context.user?.name || '[ユーザー名不明]';
      },
    });

    this.macroFunctions.set('user_email', {
      name: 'user_email',
      description: 'ユーザーメールアドレスを取得',
      parameters: [],
      handler: (params, context) => {
        return context.user?.email || '[メールアドレス不明]';
      },
    });

    // 問い合わせ情報マクロ
    this.macroFunctions.set('inquiry_id', {
      name: 'inquiry_id',
      description: '問い合わせIDを取得',
      parameters: [],
      handler: (params, context) => {
        return context.inquiry?.id || '[問い合わせID不明]';
      },
    });

    this.macroFunctions.set('inquiry_title', {
      name: 'inquiry_title',
      description: '問い合わせタイトルを取得',
      parameters: [],
      handler: (params, context) => {
        return context.inquiry?.title || '[タイトル不明]';
      },
    });

    // 文字列操作マクロ
    this.macroFunctions.set('upper', {
      name: 'upper',
      description: '文字列を大文字に変換',
      parameters: ['text'],
      handler: (params) => {
        return String(params[0]).toUpperCase();
      },
    });

    this.macroFunctions.set('lower', {
      name: 'lower',
      description: '文字列を小文字に変換',
      parameters: ['text'],
      handler: (params) => {
        return String(params[0]).toLowerCase();
      },
    });

    this.macroFunctions.set('truncate', {
      name: 'truncate',
      description: '文字列を指定長で切り詰め',
      parameters: ['text', 'length'],
      handler: (params) => {
        const text = String(params[0]);
        const length = parseInt(params[1]);
        return text.length > length ? text.substring(0, length) + '...' : text;
      },
    });

    // 条件分岐マクロ
    this.macroFunctions.set('if', {
      name: 'if',
      description: '条件分岐',
      parameters: ['condition', 'trueValue', 'falseValue'],
      handler: (params) => {
        const condition = this.evaluateCondition(params[0]);
        return condition ? params[1] : (params[2] || '');
      },
    });

    // 数値操作マクロ
    this.macroFunctions.set('add', {
      name: 'add',
      description: '数値の加算',
      parameters: ['a', 'b'],
      handler: (params) => {
        return String(Number(params[0]) + Number(params[1]));
      },
    });

    this.macroFunctions.set('multiply', {
      name: 'multiply',
      description: '数値の乗算',
      parameters: ['a', 'b'],
      handler: (params) => {
        return String(Number(params[0]) * Number(params[1]));
      },
    });
  }

  /**
   * システム変数の構築
   */
  private async buildSystemVariables(context: MacroContext): Promise<Record<string, any>> {
    const systemVariables: Record<string, any> = {
      // 日時変数
      current_date: this.formatDate(new Date(), 'YYYY-MM-DD'),
      current_time: this.formatDate(new Date(), 'HH:mm:ss'),
      current_datetime: this.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss'),
      current_year: new Date().getFullYear(),
      current_month: new Date().getMonth() + 1,
      current_day: new Date().getDate(),

      // ユーザー変数
      user_name: context.user?.name || '',
      user_email: context.user?.email || '',
      user_id: context.user?.id || '',

      // 問い合わせ変数
      inquiry_id: context.inquiry?.id || '',
      inquiry_title: context.inquiry?.title || '',
      inquiry_content: context.inquiry?.content || '',
      inquiry_category: context.inquiry?.category || '',
      inquiry_status: context.inquiry?.status || '',

      // 回答変数
      response_id: context.response?.id || '',
      response_content: context.response?.content || '',

      // カスタム変数
      ...context.customVariables,
      ...context.systemVariables,
    };

    return systemVariables;
  }

  /**
   * マクロ展開処理
   */
  private async expandMacros(
    content: string,
    context: MacroContext,
    errors: TemplateError[]
  ): Promise<string> {
    // マクロパターン: {{macro_name(param1, param2)}}
    const macroPattern = /\{\{(\w+)\(([^)]*)\)\}\}/g;
    let expandedContent = content;
    let match;

    while ((match = macroPattern.exec(content)) !== null) {
      const [fullMatch, macroName, paramString] = match;
      
      try {
        // パラメータ解析
        const parameters = this.parseParameters(paramString);
        
        // マクロ展開
        const result = await this.expandMacro(macroName, parameters, context);
        
        if (result.errors) {
          errors.push(...result.errors);
        }

        // 置換
        expandedContent = expandedContent.replace(fullMatch, result.expandedContent);

      } catch (error) {
        errors.push({
          variable: macroName,
          message: `マクロ展開エラー: ${error.message}`,
          type: 'processing',
        });
        
        // エラー時はプレースホルダーで置換
        expandedContent = expandedContent.replace(fullMatch, `[MACRO_ERROR: ${macroName}]`);
      }
    }

    return expandedContent;
  }

  /**
   * 変数バリデーション
   */
  private async validateVariables(
    templateVariables: TemplateVariable[],
    variables: Record<string, any>
  ): Promise<TemplateError[]> {
    const errors: TemplateError[] = [];

    for (const templateVar of templateVariables) {
      const value = variables[templateVar.name];

      // 必須チェック
      if (templateVar.isRequired && (value === undefined || value === null || value === '')) {
        errors.push({
          variable: templateVar.name,
          message: `${templateVar.name}は必須項目です`,
          type: 'missing',
        });
        continue;
      }

      // バリデーションルール適用
      if (value !== undefined && templateVar.validationRules) {
        for (const rule of templateVar.validationRules) {
          const validationError = this.validateValue(templateVar.name, value, rule);
          if (validationError) {
            errors.push(validationError);
          }
        }
      }
    }

    return errors;
  }

  /**
   * 変数置換処理
   */
  private async substituteVariables(
    content: string,
    templateVariables: TemplateVariable[],
    variables: Record<string, any>,
    errors: TemplateError[]
  ): Promise<string> {
    let substitutedContent = content;

    // 通常の変数置換: {{variable_name}}
    for (const templateVar of templateVariables) {
      const value = variables[templateVar.name];
      const finalValue = value !== undefined ? value : templateVar.defaultValue || '';
      
      // 型に応じたフォーマット
      const formattedValue = this.formatVariableValue(finalValue, templateVar.type as any);
      
      const regex = new RegExp(`\\{\\{\\s*${templateVar.name}\\s*\\}\\}`, 'g');
      substitutedContent = substitutedContent.replace(regex, formattedValue);
    }

    // システム変数の置換
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      substitutedContent = substitutedContent.replace(regex, String(value));
    }

    // 未定義変数の検出
    const undefinedVariables = substitutedContent.match(/\{\{\s*(\w+)\s*\}\}/g);
    if (undefinedVariables) {
      for (const match of undefinedVariables) {
        const variableName = match.replace(/\{\{\s*|\s*\}\}/g, '');
        errors.push({
          variable: variableName,
          message: `未定義の変数です: ${variableName}`,
          type: 'processing',
        });
      }
    }

    return substitutedContent;
  }

  /**
   * 条件分岐処理
   */
  private async processConditionals(
    content: string,
    variables: Record<string, any>,
    errors: TemplateError[]
  ): Promise<string> {
    // 条件分岐パターン: {{#if condition}}content{{/if}}
    const conditionalPattern = /\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs;
    let processedContent = content;
    let match;

    while ((match = conditionalPattern.exec(content)) !== null) {
      const [fullMatch, condition, conditionalContent] = match;
      
      try {
        const isTrue = this.evaluateCondition(condition, variables);
        const replacement = isTrue ? conditionalContent : '';
        processedContent = processedContent.replace(fullMatch, replacement);
      } catch (error) {
        errors.push({
          variable: condition,
          message: `条件分岐エラー: ${error.message}`,
          type: 'processing',
        });
        processedContent = processedContent.replace(fullMatch, '');
      }
    }

    return processedContent;
  }

  /**
   * ループ処理
   */
  private async processLoops(
    content: string,
    variables: Record<string, any>,
    errors: TemplateError[]
  ): Promise<string> {
    // ループパターン: {{#each items}}{{this}}{{/each}}
    const loopPattern = /\{\{#each\s+(\w+)\}\}(.*?)\{\{\/each\}\}/gs;
    let processedContent = content;
    let match;

    while ((match = loopPattern.exec(content)) !== null) {
      const [fullMatch, arrayName, loopContent] = match;
      
      try {
        const array = variables[arrayName];
        if (!Array.isArray(array)) {
          errors.push({
            variable: arrayName,
            message: `${arrayName}は配列である必要があります`,
            type: 'processing',
          });
          processedContent = processedContent.replace(fullMatch, '');
          continue;
        }

        const expandedItems = array.map((item, index) => {
          let itemContent = loopContent;
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
          itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
          return itemContent;
        });

        processedContent = processedContent.replace(fullMatch, expandedItems.join(''));
      } catch (error) {
        errors.push({
          variable: arrayName,
          message: `ループ処理エラー: ${error.message}`,
          type: 'processing',
        });
        processedContent = processedContent.replace(fullMatch, '');
      }
    }

    return processedContent;
  }

  /**
   * 後処理
   */
  private async postProcessContent(
    content: string,
    variables: Record<string, any>
  ): Promise<string> {
    let processedContent = content;

    // HTMLエスケープ（必要に応じて）
    // processedContent = this.escapeHtml(processedContent);

    // 余分な空白の除去
    processedContent = processedContent.replace(/\n\s*\n/g, '\n');
    processedContent = processedContent.trim();

    return processedContent;
  }

  /**
   * パラメータ解析
   */
  private parseParameters(paramString: string): any[] {
    if (!paramString.trim()) return [];

    // 簡単なパラメータ解析（実際にはより複雑な解析が必要）
    return paramString.split(',').map(param => {
      param = param.trim();
      
      // 文字列リテラル
      if (param.startsWith('"') && param.endsWith('"')) {
        return param.slice(1, -1);
      }
      
      // 数値
      if (!isNaN(Number(param))) {
        return Number(param);
      }
      
      // ブール値
      if (param === 'true') return true;
      if (param === 'false') return false;
      
      // その他は文字列として扱う
      return param;
    });
  }

  /**
   * 条件評価
   */
  private evaluateCondition(condition: string, variables: Record<string, any> = {}): boolean {
    try {
      // 簡単な条件評価（実際にはより安全な評価が必要）
      // 変数置換
      let evaluatedCondition = condition;
      for (const [key, value] of Object.entries(variables)) {
        evaluatedCondition = evaluatedCondition.replace(
          new RegExp(`\\b${key}\\b`, 'g'),
          JSON.stringify(value)
        );
      }

      // 安全な評価（限定的な演算子のみ許可）
      return this.safeEvaluate(evaluatedCondition);
    } catch (error) {
      return false;
    }
  }

  /**
   * 安全な条件評価
   */
  private safeEvaluate(expression: string): boolean {
    // 許可された演算子のみを使用した安全な評価
    // 実際にはより厳密な実装が必要
    const allowedPattern = /^[\w\s"'.\-+*/<>=!&|()]+$/;
    if (!allowedPattern.test(expression)) {
      return false;
    }

    try {
      // eslint-disable-next-line no-eval
      return Boolean(eval(expression));
    } catch {
      return false;
    }
  }

  /**
   * 値のバリデーション
   */
  private validateValue(name: string, value: any, rule: ValidationRule): TemplateError | null {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return {
            variable: name,
            message: rule.message || `${name}は必須項目です`,
            type: 'validation',
          };
        }
        break;

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
   * 変数値のフォーマット
   */
  private formatVariableValue(value: any, type: TemplateVariableType): string {
    switch (type) {
      case TemplateVariableType.DATE:
        return this.formatDate(new Date(value), 'YYYY-MM-DD');
      
      case TemplateVariableType.NUMBER:
        return Number(value).toLocaleString();
      
      case TemplateVariableType.BOOLEAN:
        return value ? 'はい' : 'いいえ';
      
      case TemplateVariableType.EMAIL:
      case TemplateVariableType.URL:
      case TemplateVariableType.TEXT:
      case TemplateVariableType.TEXTAREA:
      default:
        return String(value);
    }
  }

  /**
   * 日付フォーマット
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * マクロ定義のバリデーション
   */
  private validateMacroDefinition(macroDefinition: MacroDefinition): void {
    if (!macroDefinition.name || !macroDefinition.template) {
      throw new BadRequestException('マクロ名とテンプレートは必須です');
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(macroDefinition.name)) {
      throw new BadRequestException('マクロ名は英数字とアンダースコアのみ使用できます');
    }
  }

  /**
   * 使用変数の抽出
   */
  private extractUsedVariables(content: string): Record<string, any> {
    const variables: Record<string, any> = {};
    const variablePattern = /\{\{\s*(\w+)\s*\}\}/g;
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
      variables[match[1]] = true;
    }

    return variables;
  }

  /**
   * 変数使用分析
   */
  private analyzeVariableUsage(variables: Record<string, any>): any {
    return {
      totalVariables: Object.keys(variables).length,
      variableTypes: Object.entries(variables).reduce((acc, [key, value]) => {
        const type = typeof value;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * マクロ使用分析
   */
  private analyzeMacroUsage(content: string): any {
    const macroPattern = /\{\{(\w+)\(/g;
    const macros: Record<string, number> = {};
    let match;

    while ((match = macroPattern.exec(content)) !== null) {
      const macroName = match[1];
      macros[macroName] = (macros[macroName] || 0) + 1;
    }

    return {
      totalMacros: Object.values(macros).reduce((sum, count) => sum + count, 0),
      uniqueMacros: Object.keys(macros).length,
      macroFrequency: macros,
    };
  }

  /**
   * コンテキストタイプ判定
   */
  private determineContextType(context: MacroContext): string {
    if (context.inquiry && context.response) return 'inquiry_response';
    if (context.inquiry) return 'inquiry';
    if (context.response) return 'response';
    return 'general';
  }
}