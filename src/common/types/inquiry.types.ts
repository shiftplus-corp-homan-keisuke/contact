/**
 * 問い合わせ関連の型定義
 * 要件: 1.1, 1.3, 1.4, 2.2, 2.3 (問い合わせ登録・管理機能)
 */

export interface Inquiry {
  id: string;
  appId: string;
  title: string;
  content: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  category?: string;
  customerEmail?: string;
  customerName?: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInquiryRequest {
  title: string;
  content: string;
  appId: string;
  customerEmail?: string;
  customerName?: string;
  category?: string;
  priority?: InquiryPriority;
}

export interface UpdateInquiryRequest {
  title?: string;
  content?: string;
  category?: string;
  priority?: InquiryPriority;
  assignedTo?: string;
}

export interface InquiryDetail extends Inquiry {
  application: {
    id: string;
    name: string;
  };
  assignedUser?: {
    id: string;
    name: string;
    email: string;
  };
  responses: Response[];
  statusHistory: StatusHistory[];
}

// 問い合わせ状態の定義
export enum InquiryStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

// 優先度の定義
export enum InquiryPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// 検索・フィルタリング用の型
export interface InquiryFilters {
  appId?: string;
  status?: InquiryStatus[];
  category?: string[];
  assignedTo?: string;
  dateRange?: DateRange;
  priority?: InquiryPriority[];
  customerEmail?: string;
}

export interface SearchCriteria {
  query?: string;
  filters?: InquiryFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ページネーション結果
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 状態履歴
export interface StatusHistory {
  id: string;
  inquiryId: string;
  oldStatus?: InquiryStatus;
  newStatus: InquiryStatus;
  changedBy: string;
  comment?: string;
  changedAt: Date;
}

// バリデーション結果
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}