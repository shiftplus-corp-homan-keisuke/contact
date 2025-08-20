/**
 * テンプレート管理システムの型定義
 */

export interface Template {
    id: string;
    name: string;
    category: string;
    content: string;
    variables: TemplateVariable[];
    tags: string[];
    isShared: boolean;
    usageCount: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TemplateVariable {
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';
    description?: string;
    defaultValue?: string;
    required: boolean;
    options?: string[]; // select型の場合の選択肢
}

export interface CreateTemplateRequest {
    name: string;
    category: string;
    content: string;
    variables?: TemplateVariable[];
    tags?: string[];
    isShared?: boolean;
}

export interface UpdateTemplateRequest {
    name?: string;
    category?: string;
    content?: string;
    variables?: TemplateVariable[];
    tags?: string[];
    isShared?: boolean;
}

export interface TemplateFilters {
    category?: string;
    tags?: string[];
    isShared?: boolean;
    createdBy?: string;
    searchQuery?: string;
}

export interface TemplateSuggestion {
    template: Template;
    score: number;
    reason: string;
}

export interface TemplateUsageStats {
    templateId: string;
    totalUsage: number;
    monthlyUsage: number;
    averageRating: number;
    lastUsed: Date;
    topUsers: Array<{
        userId: string;
        userName: string;
        usageCount: number;
    }>;
}

export interface TeamTemplateStats {
    teamId: string;
    totalTemplates: number;
    sharedTemplates: number;
    totalUsage: number;
    topTemplates: Array<{
        template: Template;
        usageCount: number;
    }>;
    categoryBreakdown: Array<{
        category: string;
        count: number;
        usage: number;
    }>;
}

export interface Macro {
    id: string;
    name: string;
    description: string;
    content: string;
    variables: Record<string, string>;
    createdBy: string;
    createdAt: Date;
}

export interface CreateMacroRequest {
    name: string;
    description: string;
    content: string;
    variables: Record<string, string>;
}

export interface ExpandMacroRequest {
    macroId: string;
    variables: Record<string, string>;
}