/**
 * FAQ関連の型定義
 * 要件: 6.1, 6.2, 6.3, 6.4 (FAQ生成機能)
 */

export interface FAQ {
  id: string;
  appId: string;
  question: string;
  answer: string;
  category?: string;
  tags: string[];
  orderIndex: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFAQRequest {
  appId: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface UpdateFAQRequest {
  question?: string;
  answer?: string;
  category?: string;
  tags?: string[];
  orderIndex?: number;
  isPublished?: boolean;
}

export interface FAQFilters {
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  searchQuery?: string;
}

// FAQ自動生成関連
export interface FAQGenerationOptions {
  minClusterSize: number;
  maxClusters: number;
  similarityThreshold: number;
  dateRange?: DateRange;
  categories?: string[];
}

export interface FAQCluster {
  id: string;
  inquiries: string[];
  representativeQuestion: string;
  suggestedAnswer: string;
  category?: string;
  confidence: number;
}

export interface FAQAnalytics {
  totalFAQs: number;
  publishedFAQs: number;
  categoryBreakdown: CategoryStats[];
  popularFAQs: PopularFAQ[];
  usageStats: FAQUsageStats;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export interface PopularFAQ {
  faq: FAQ;
  viewCount: number;
  helpfulVotes: number;
  lastViewed: Date;
}

export interface FAQUsageStats {
  totalViews: number;
  averageHelpfulness: number;
  topSearchTerms: string[];
  conversionRate: number; // FAQ閲覧から問い合わせ回避率
}

// FAQ公開サイト関連
export interface FAQSite {
  appId: string;
  url: string;
  lastPublished: Date;
  faqCount: number;
  isActive: boolean;
}

export interface FAQSiteConfig {
  appId: string;
  title: string;
  description?: string;
  theme: 'light' | 'dark' | 'auto';
  categories: string[];
  customCSS?: string;
}

import { DateRange } from './inquiry.types';