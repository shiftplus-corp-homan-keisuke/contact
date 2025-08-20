import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template, TemplateVariable, TemplateUsage } from '../entities';
import { TemplatesRepository } from '../repositories';
import { TemplateMacroService } from './template-macro.service';
import {
    CreateTemplateRequest,
    UpdateTemplateRequest,
    TemplateFilters,
    TemplateUsageStats,
    TeamTemplateStats,
} from '../types';
import { PaginatedResult } from '../../../common/types';

/**
 * テンプレート管理サービス
 * テンプレートのCRUD操作と管理機能を提供
 */
@Injectable()
export class TemplatesService {
    constructor(
        private readonly templatesRepository: TemplatesRepository,
        private readonly macroService: TemplateMacroService,
        @InjectRepository(TemplateVariable)
        private readonly variableRepository: Repository<TemplateVariable>,
        @InjectRepository(TemplateUsage)
        private readonly usageRepository: Repository<TemplateUsage>,
    ) { }

    /**
     * テンプレートを作成
     */
    async createTemplate(
        templateData: CreateTemplateRequest,
        userId: string,
    ): Promise<Template> {
        try {
            // テンプレート作成（variablesを除外）
            const { variables, ...templateCreateData } = templateData;
            const template = await this.templatesRepository.create({
                ...templateCreateData,
                createdBy: userId,
                isShared: templateData.isShared || false,
            });

            // 変数がある場合は作成
            if (templateData.variables && templateData.variables.length > 0) {
                const variables = templateData.variables.map((variable: any, index) => ({
                    name: variable.name,
                    type: variable.type,
                    description: variable.description,
                    defaultValue: variable.defaultValue,
                    required: variable.required,
                    options: variable.options,
                    templateId: template.id,
                    orderIndex: variable.orderIndex || index,
                }));

                await this.variableRepository.save(variables);
            }

            return await this.templatesRepository.findById(template.id);
        } catch (error) {
            throw new BadRequestException('テンプレートの作成に失敗しました');
        }
    }

    /**
     * テンプレートを取得
     */
    async getTemplate(id: string, userId?: string): Promise<Template> {
        const template = await this.templatesRepository.findById(id);

        if (!template) {
            throw new NotFoundException('テンプレートが見つかりません');
        }

        // アクセス権限チェック
        if (!template.isShared && template.createdBy !== userId) {
            throw new ForbiddenException('このテンプレートにアクセスする権限がありません');
        }

        return template;
    }

    /**
     * テンプレートを更新
     */
    async updateTemplate(
        id: string,
        updateData: UpdateTemplateRequest,
        userId: string,
    ): Promise<Template> {
        const template = await this.templatesRepository.findById(id);

        if (!template) {
            throw new NotFoundException('テンプレートが見つかりません');
        }

        // 編集権限チェック
        if (template.createdBy !== userId) {
            throw new ForbiddenException('このテンプレートを編集する権限がありません');
        }

        try {
            // 変数の更新
            if (updateData.variables) {
                // 既存の変数を削除
                await this.variableRepository.delete({ templateId: id });

                // 新しい変数を作成
                if (updateData.variables.length > 0) {
                    const variables = updateData.variables.map((variable: any, index) => ({
                        name: variable.name,
                        type: variable.type,
                        description: variable.description,
                        defaultValue: variable.defaultValue,
                        required: variable.required,
                        options: variable.options,
                        templateId: id,
                        orderIndex: variable.orderIndex || index,
                    }));

                    await this.variableRepository.save(variables);
                }
            }

            // テンプレート本体の更新
            const { variables, ...templateUpdateData } = updateData;
            return await this.templatesRepository.update(id, templateUpdateData);
        } catch (error) {
            throw new BadRequestException('テンプレートの更新に失敗しました');
        }
    }

    /**
     * テンプレートを削除
     */
    async deleteTemplate(id: string, userId: string): Promise<void> {
        const template = await this.templatesRepository.findById(id);

        if (!template) {
            throw new NotFoundException('テンプレートが見つかりません');
        }

        // 削除権限チェック
        if (template.createdBy !== userId) {
            throw new ForbiddenException('このテンプレートを削除する権限がありません');
        }

        await this.templatesRepository.delete(id);
    }

    /**
     * テンプレート一覧を取得
     */
    async getTemplates(
        filters: TemplateFilters,
        page: number = 1,
        limit: number = 20,
        userId?: string,
    ): Promise<PaginatedResult<Template>> {
        // ユーザーがアクセス可能なテンプレートのみを取得
        const accessFilters = { ...filters };

        if (userId && !filters.isShared) {
            // 自分のテンプレートまたは共有テンプレートのみ
            // この条件はリポジトリ側で処理
        }

        return await this.templatesRepository.findWithFilters(
            accessFilters,
            page,
            limit,
        );
    }

    /**
     * カテゴリ別テンプレート一覧を取得
     */
    async getTemplatesByCategory(
        category: string,
        userId?: string,
    ): Promise<Template[]> {
        const filters: TemplateFilters = { category };
        const result = await this.templatesRepository.findWithFilters(filters, 1, 1000);

        // アクセス権限フィルタリング
        return result.items.filter(template =>
            template.isShared || template.createdBy === userId
        );
    }

    /**
     * 人気テンプレートを取得
     */
    async getPopularTemplates(
        userId?: string,
        limit: number = 10,
    ): Promise<Template[]> {
        const templates = await this.templatesRepository.getPopularTemplates(limit);

        // アクセス権限フィルタリング
        return templates.filter(template =>
            template.isShared || template.createdBy === userId
        );
    }

    /**
     * ユーザーのテンプレートを取得
     */
    async getUserTemplates(
        userId: string,
        includeShared: boolean = true,
    ): Promise<Template[]> {
        return await this.templatesRepository.findByUserId(userId, includeShared);
    }

    /**
     * テンプレート使用を記録
     */
    async recordTemplateUsage(
        templateId: string,
        userId: string,
        inquiryId?: string,
        rating?: number,
        feedback?: string,
        usedVariables?: Record<string, string>,
        usedMacros?: string[],
        expandedContent?: string,
    ): Promise<void> {
        // テンプレートの存在確認
        const template = await this.templatesRepository.findById(templateId);
        if (!template) {
            throw new NotFoundException('テンプレートが見つかりません');
        }

        // 使用履歴を記録
        const usage = this.usageRepository.create({
            templateId,
            userId,
            inquiryId,
            rating,
            feedback,
            usedVariables: usedVariables || {},
            usedMacros: usedMacros || [],
            expandedContent,
        });

        await this.usageRepository.save(usage);

        // 使用回数を増加
        await this.templatesRepository.incrementUsageCount(templateId);
    }

    /**
     * 拡張テンプレート使用記録（マクロ使用込み）
     */
    async recordTemplateUsageWithMacros(
        templateId: string,
        userId: string,
        variableValues: Record<string, string> = {},
        macroVariables: Record<string, Record<string, string>> = {},
        inquiryId?: string,
        rating?: number,
        feedback?: string,
    ): Promise<string> {
        // テンプレートを展開
        const expandedContent = await this.expandTemplateWithMacros(
            templateId,
            userId,
            variableValues,
            macroVariables,
        );

        // 使用されたマクロを検出
        const template = await this.getTemplate(templateId, userId);
        const macroPattern = /\{\{macro:([^}]+)\}\}/g;
        const usedMacros = [...template.content.matchAll(macroPattern)]
            .map(match => match[1].trim());

        // 使用履歴を記録
        await this.recordTemplateUsage(
            templateId,
            userId,
            inquiryId,
            rating,
            feedback,
            variableValues,
            usedMacros,
            expandedContent,
        );

        return expandedContent;
    }

    /**
     * テンプレート使用統計を取得
     */
    async getTemplateUsageStats(templateId: string): Promise<TemplateUsageStats> {
        const template = await this.templatesRepository.findById(templateId);
        if (!template) {
            throw new NotFoundException('テンプレートが見つかりません');
        }

        // 基本統計
        const totalUsage = await this.usageRepository.count({
            where: { templateId },
        });

        // 月間使用数
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const monthlyUsage = await this.usageRepository.count({
            where: {
                templateId,
                usedAt: { $gte: oneMonthAgo } as any,
            },
        });

        // 平均評価
        const ratingResult = await this.usageRepository
            .createQueryBuilder('usage')
            .select('AVG(usage.rating)', 'averageRating')
            .where('usage.templateId = :templateId', { templateId })
            .andWhere('usage.rating IS NOT NULL')
            .getRawOne();

        // 最終使用日
        const lastUsageResult = await this.usageRepository
            .createQueryBuilder('usage')
            .select('MAX(usage.usedAt)', 'lastUsed')
            .where('usage.templateId = :templateId', { templateId })
            .getRawOne();

        // トップユーザー
        const topUsers = await this.usageRepository
            .createQueryBuilder('usage')
            .leftJoin('usage.user', 'user')
            .select([
                'usage.userId as userId',
                'user.name as userName',
                'COUNT(*) as usageCount',
            ])
            .where('usage.templateId = :templateId', { templateId })
            .groupBy('usage.userId, user.name')
            .orderBy('usageCount', 'DESC')
            .limit(5)
            .getRawMany();

        return {
            templateId,
            totalUsage,
            monthlyUsage,
            averageRating: parseFloat(ratingResult?.averageRating || '0'),
            lastUsed: lastUsageResult?.lastUsed || null,
            topUsers: topUsers.map(user => ({
                userId: user.userId,
                userName: user.userName,
                usageCount: parseInt(user.usageCount),
            })),
        };
    }

    /**
     * チーム別テンプレート統計を取得
     */
    async getTeamTemplateStats(teamId: string): Promise<TeamTemplateStats> {
        // チームメンバーのテンプレート統計を集計
        // 実装は簡略化（実際にはチーム管理機能が必要）

        const categoryStats = await this.templatesRepository.getCategoryStats();
        const popularTemplates = await this.templatesRepository.getPopularTemplates(10);

        return {
            teamId,
            totalTemplates: categoryStats.reduce((sum, cat) => sum + cat.count, 0),
            sharedTemplates: 0, // 実装省略
            totalUsage: 0, // 実装省略
            topTemplates: popularTemplates.map(template => ({
                template,
                usageCount: template.usageCount,
            })),
            categoryBreakdown: categoryStats.map(stat => ({
                category: stat.category,
                count: stat.count,
                usage: 0, // 実装省略
            })),
        };
    }

    /**
     * テンプレートを共有設定
     */
    async shareTemplate(id: string, userId: string, isShared: boolean): Promise<Template> {
        const template = await this.templatesRepository.findById(id);

        if (!template) {
            throw new NotFoundException('テンプレートが見つかりません');
        }

        if (template.createdBy !== userId) {
            throw new ForbiddenException('このテンプレートを編集する権限がありません');
        }

        return await this.templatesRepository.update(id, { isShared });
    }

    /**
     * テンプレート内のマクロを展開
     */
    async expandTemplateWithMacros(
        templateId: string,
        userId: string,
        variableValues: Record<string, string> = {},
        macroVariables: Record<string, Record<string, string>> = {},
    ): Promise<string> {
        const template = await this.getTemplate(templateId, userId);
        let expandedContent = template.content;

        // マクロパターンを検索: {{macro:macro_name}}
        const macroPattern = /\{\{macro:([^}]+)\}\}/g;
        const macroMatches = [...expandedContent.matchAll(macroPattern)];

        // 各マクロを展開
        for (const match of macroMatches) {
            const macroName = match[1].trim();
            const macroPlaceholder = match[0];

            try {
                // マクロ名でマクロを検索
                const userMacros = await this.macroService.getUserMacros(userId);
                const macro = userMacros.find(m => m.name === macroName);

                if (macro) {
                    // マクロ用の変数値を取得
                    const macroVars = macroVariables[macroName] || {};

                    // マクロを実行
                    const expandedMacro = await this.macroService.executeMacro(
                        macro.id,
                        userId,
                        macroVars,
                    );

                    // テンプレート内のマクロプレースホルダーを置換
                    expandedContent = expandedContent.replace(macroPlaceholder, expandedMacro);
                } else {
                    // マクロが見つからない場合は警告コメントで置換
                    expandedContent = expandedContent.replace(
                        macroPlaceholder,
                        `[マクロ '${macroName}' が見つかりません]`,
                    );
                }
            } catch (error) {
                // マクロ実行エラーの場合はエラーメッセージで置換
                expandedContent = expandedContent.replace(
                    macroPlaceholder,
                    `[マクロ '${macroName}' の実行エラー: ${error.message}]`,
                );
            }
        }

        // 通常の変数を展開
        expandedContent = this.expandVariables(expandedContent, variableValues);

        return expandedContent;
    }

    /**
     * テンプレート変数を展開
     */
    private expandVariables(
        content: string,
        variableValues: Record<string, string>,
    ): string {
        let expandedContent = content;

        // {{variable_name}} 形式の変数を置換（マクロ以外）
        for (const [key, value] of Object.entries(variableValues)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            expandedContent = expandedContent.replace(regex, value || '');
        }

        return expandedContent;
    }

    /**
     * テンプレート内で使用されているマクロを検出
     */
    async detectMacrosInTemplate(templateId: string, userId: string): Promise<{
        macroName: string;
        macroId?: string;
        isAvailable: boolean;
        variables: Record<string, string>;
    }[]> {
        const template = await this.getTemplate(templateId, userId);
        const macroPattern = /\{\{macro:([^}]+)\}\}/g;
        const macroMatches = [...template.content.matchAll(macroPattern)];

        const userMacros = await this.macroService.getUserMacros(userId);
        const detectedMacros: {
            macroName: string;
            macroId?: string;
            isAvailable: boolean;
            variables: Record<string, string>;
        }[] = [];

        for (const match of macroMatches) {
            const macroName = match[1].trim();
            const macro = userMacros.find(m => m.name === macroName);

            detectedMacros.push({
                macroName,
                macroId: macro?.id,
                isAvailable: !!macro,
                variables: macro?.variables || {},
            });
        }

        return detectedMacros;
    }

    /**
     * テンプレートプレビュー（マクロ展開込み）
     */
    async previewTemplate(
        templateId: string,
        userId: string,
        variableValues: Record<string, string> = {},
        macroVariables: Record<string, Record<string, string>> = {},
    ): Promise<{
        originalContent: string;
        expandedContent: string;
        usedMacros: string[];
        missingVariables: string[];
    }> {
        const template = await this.getTemplate(templateId, userId);
        const expandedContent = await this.expandTemplateWithMacros(
            templateId,
            userId,
            variableValues,
            macroVariables,
        );

        // 使用されたマクロを検出
        const macroPattern = /\{\{macro:([^}]+)\}\}/g;
        const usedMacros = [...template.content.matchAll(macroPattern)]
            .map(match => match[1].trim());

        // 未設定の変数を検出
        const variablePattern = /\{\{(?!macro:)([^}]+)\}\}/g;
        const missingVariables = [...expandedContent.matchAll(variablePattern)]
            .map(match => match[1].trim())
            .filter(varName => !variableValues[varName]);

        return {
            originalContent: template.content,
            expandedContent,
            usedMacros: [...new Set(usedMacros)],
            missingVariables: [...new Set(missingVariables)],
        };
    }
}