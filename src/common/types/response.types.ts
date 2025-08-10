/**
 * 回答関連の型定義
 * 要件: 2.1, 2.3, 2.4 (問い合わせ・回答管理機能)
 */

export interface Response {
  id: string;
  inquiryId: string;
  userId: string;
  content: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResponseData {
  content: string;
  isPublic?: boolean;
}

export interface ResponseUpdate {
  content?: string;
  isPublic?: boolean;
}

export interface ResponseDetail extends Response {
  user: {
    id: string;
    name: string;
    email: string;
  };
  inquiry: {
    id: string;
    title: string;
  };
  history: ResponseHistory[];
}

export interface ResponseHistory {
  id: string;
  responseId: string;
  oldContent?: string;
  newContent: string;
  changedBy: string;
  changedAt: Date;
}

export interface CreateResponseRequest {
  inquiryId: string;
  content: string;
  isPublic?: boolean;
}

export interface UpdateResponseRequest {
  content?: string;
  isPublic?: boolean;
}

// 回答テンプレート関連
export interface ResponseTemplate {
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
  name: string;
  description: string;
  defaultValue?: string;
  required: boolean;
}

export interface TemplateSuggestion {
  template: ResponseTemplate;
  relevanceScore: number;
  reason: string;
}