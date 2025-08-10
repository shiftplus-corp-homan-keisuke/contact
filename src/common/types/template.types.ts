/**
 * テンプレート関連の型定義
 * 要件: 10.1, 10.2, 10.3 (テンプレート管理システム)
 */

export enum TemplateVariableType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  TEXTAREA = 'textarea',
  EMAIL = 'email',
  URL = 'url'
}

export enum TemplateUsageContext {
  RESPONSE = 'response',
  EMAIL = 'email',
  CHAT = 'chat',
  SMS = 'sms',
  NOTIFICATION = 'notification'
}

export interface TemplateVariableDefinition {
  name: string;
  type: TemplateVariableType;
  description?: string;
  defaultValue?: string;
  isRequired: boolean;
  options?: any;
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'url';
  value?: any;
  message?: string;
}

export interface TemplateProcessingResult {
  content: string;
  variables: Record<string, any>;
  errors?: TemplateError[];
}

export interface TemplateError {
  variable: string;
  message: string;
  type: 'missing' | 'validation' | 'processing';
}

export interface TemplateSuggestion {
  templateId: string;
  templateName: string;
  category: string;
  relevanceScore: number;
  matchedKeywords: string[];
  usageCount: number;
  effectivenessScore?: number;
}

export interface TemplateStatistics {
  totalUsage: number;
  averageEffectiveness: number;
  popularVariables: VariableUsageStats[];
  usageByContext: Record<TemplateUsageContext, number>;
  usageByUser: UserUsageStats[];
  usageTrend: UsageTrendData[];
}

export interface VariableUsageStats {
  variableName: string;
  usageCount: number;
  averageValue: string;
  popularValues: string[];
}

export interface UserUsageStats {
  userId: string;
  userName: string;
  usageCount: number;
  averageEffectiveness: number;
}

export interface UsageTrendData {
  date: string;
  usageCount: number;
  effectivenessScore: number;
}

export interface MacroDefinition {
  name: string;
  description: string;
  template: string;
  variables: TemplateVariableDefinition[];
  category: string;
  isGlobal: boolean;
}

export interface MacroExpansionResult {
  expandedContent: string;
  usedVariables: Record<string, any>;
  errors?: TemplateError[];
}

export interface TemplateSearchFilters {
  category?: string;
  tags?: string[];
  appId?: string;
  createdBy?: string;
  isShared?: boolean;
  isActive?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface TemplateAnalytics {
  templateId: string;
  templateName: string;
  totalUsage: number;
  uniqueUsers: number;
  averageEffectiveness: number;
  lastUsed: Date;
  popularContexts: TemplateUsageContext[];
  conversionRate: number; // 使用後の問題解決率
}