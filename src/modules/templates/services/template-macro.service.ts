import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Macro } from '../entities/macro.entity';
import { MacroUsage } from '../entities/macro-usage.entity';

/**
 * マクロ管理サービス
 * マクロの作成、更新、削除、実行を管理
 */
@Injectable()
export class TemplateMacroService {
    constructor(
        @InjectRepository(Macro)
        private readonly macroRepository: Repository<Macro>,
        @InjectRepository(MacroUsage)
        private readonly macroUsageRepository: Repository<MacroUsage>,
    ) { }

    /**
     * マクロを作成
     */
    async createMacro(
        name: string,
        content: string,
        variables: Record<string, string>,
        createdBy: string,
        description?: string,
        isShared = false,
    ): Promise<Macro> {
        // 同名のマクロが既に存在するかチェック
        const existingMacro = await this.macroRepository.findOne({
            where: { name, createdBy },
        });

        if (existingMacro) {
            throw new BadRequestException('同名のマクロが既に存在します');
        }

        const macro = this.macroRepository.create({
            name,
            content,
            variables,
            description,
            isShared,
            createdBy,
        });

        return await this.macroRepository.save(macro);
    }

    /**
     * マクロを更新
     */
    async updateMacro(
        id: string,
        userId: string,
        updates: Partial<{
            name: string;
            content: string;
            variables: Record<string, string>;
            description: string;
            isShared: boolean;
        }>,
    ): Promise<Macro> {
        const macro = await this.macroRepository.findOne({
            where: { id },
        });

        if (!macro) {
            throw new NotFoundException('マクロが見つかりません');
        }

        // 作成者のみが更新可能
        if (macro.createdBy !== userId) {
            throw new ForbiddenException('このマクロを更新する権限がありません');
        }

        Object.assign(macro, updates);
        return await this.macroRepository.save(macro);
    }

    /**
     * マクロを削除
     */
    async deleteMacro(id: string, userId: string): Promise<void> {
        const macro = await this.macroRepository.findOne({
            where: { id },
        });

        if (!macro) {
            throw new NotFoundException('マクロが見つかりません');
        }

        // 作成者のみが削除可能
        if (macro.createdBy !== userId) {
            throw new ForbiddenException('このマクロを削除する権限がありません');
        }

        await this.macroRepository.remove(macro);
    }

    /**
     * ユーザーのマクロ一覧を取得
     */
    async getUserMacros(userId: string): Promise<Macro[]> {
        return await this.macroRepository.find({
            where: [
                { createdBy: userId },
                { isShared: true },
            ],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * マクロを実行（変数を展開）
     */
    async executeMacro(
        id: string,
        userId: string,
        variableValues: Record<string, string>,
    ): Promise<string> {
        const macro = await this.macroRepository.findOne({
            where: { id },
        });

        if (!macro) {
            throw new NotFoundException('マクロが見つかりません');
        }

        // アクセス権限チェック
        if (!macro.isShared && macro.createdBy !== userId) {
            throw new ForbiddenException('このマクロにアクセスする権限がありません');
        }

        // 変数を展開
        const expandedContent = this.expandVariables(macro.content, variableValues);

        // 使用統計を記録
        await this.recordMacroUsage(id, userId, variableValues, expandedContent);

        // 使用回数を更新
        await this.macroRepository.update(id, {
            usageCount: () => 'usage_count + 1',
        });

        return expandedContent;
    }

    /**
     * マクロの詳細を取得
     */
    async getMacroById(id: string, userId: string): Promise<Macro> {
        const macro = await this.macroRepository.findOne({
            where: { id },
            relations: ['creator'],
        });

        if (!macro) {
            throw new NotFoundException('マクロが見つかりません');
        }

        // アクセス権限チェック
        if (!macro.isShared && macro.createdBy !== userId) {
            throw new ForbiddenException('このマクロにアクセスする権限がありません');
        }

        return macro;
    }

    /**
     * 変数を展開する内部メソッド
     */
    private expandVariables(
        content: string,
        variableValues: Record<string, string>,
    ): string {
        let expandedContent = content;

        // {{variable_name}} 形式の変数を置換
        for (const [key, value] of Object.entries(variableValues)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            expandedContent = expandedContent.replace(regex, value || '');
        }

        return expandedContent;
    }

    /**
     * マクロ使用統計を記録
     */
    private async recordMacroUsage(
        macroId: string,
        userId: string,
        expandedVariables: Record<string, string>,
        expandedContent: string,
    ): Promise<void> {
        const usage = this.macroUsageRepository.create({
            macroId,
            userId,
            expandedVariables,
            expandedContent,
        });

        await this.macroUsageRepository.save(usage);
    }

    /**
     * マクロの使用統計を取得
     */
    async getMacroUsageStats(macroId: string, userId: string): Promise<{
        totalUsage: number;
        recentUsage: MacroUsage[];
    }> {
        const macro = await this.getMacroById(macroId, userId);

        const totalUsage = await this.macroUsageRepository.count({
            where: { macroId },
        });

        const recentUsage = await this.macroUsageRepository.find({
            where: { macroId },
            order: { usedAt: 'DESC' },
            take: 10,
            relations: ['user'],
        });

        return {
            totalUsage,
            recentUsage,
        };
    }

    /**
     * 人気のマクロを取得
     */
    async getPopularMacros(limit = 10): Promise<Macro[]> {
        return await this.macroRepository.find({
            where: { isShared: true },
            order: { usageCount: 'DESC' },
            take: limit,
        });
    }
}