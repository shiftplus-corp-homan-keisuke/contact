/**
 * 型定義の統合エクスポート
 * 要件: 2.1, 3.3, 1.2 (コアデータモデルインターフェースと型定義)
 */

// ユーザー関連の型
export * from './user.types';
export * from './role.types';

// アプリケーション関連の型
export * from './application.types';

// 問い合わせ関連の型
export * from './inquiry.types';
export * from './response.types';

// FAQ関連の型
export * from './faq.types';

// ファイル関連の型
export * from './file.types';

// 共通型定義
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ページネーション共通型
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 検索関連の共通型
export interface SearchOptions {
  query?: string;
  filters?: Record<string, any>;
  pagination?: PaginationOptions;
}

// 日付範囲の共通型
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ファイル関連の型
export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface FileUploadRequest {
  filename: string;
  content: Buffer;
  mimeType: string;
  metadata?: Record<string, any>;
}

// 通知関連の型
export interface NotificationRequest {
  type: 'email' | 'slack' | 'teams' | 'webhook';
  recipients: string[];
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

// 分析関連の型
export interface AnalyticsFilters {
  appId?: string;
  dateRange?: DateRange;
  category?: string;
  status?: string[];
  assignedTo?: string;
}

export interface StatisticsData {
  label: string;
  value: number;
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
}

// エラーハンドリング関連の型
export interface ErrorLog {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;
  message: string;
  stack?: string;
  userId?: string;
  requestId: string;
  metadata?: Record<string, any>;
}

// 設定関連の型
export interface SystemConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  email: EmailConfig;
  file: FileConfig;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface FileConfig {
  maxSize: number;
  allowedTypes: string[];
  uploadPath: string;
}