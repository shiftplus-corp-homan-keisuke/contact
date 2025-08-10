/**
 * エンティティの統合エクスポート
 * 要件: 1.2, 2.1, 4.1 (データベースエンティティとマイグレーション)
 */

// コアエンティティ
import { User } from './user.entity';
import { Role } from './role.entity';
import { Application } from './application.entity';
import { Inquiry } from './inquiry.entity';
import { Response } from './response.entity';
import { FAQ } from './faq.entity';

// 履歴エンティティ
import { UserHistory } from './user-history.entity';
import { InquiryStatusHistory } from './inquiry-status-history.entity';
import { ResponseHistory } from './response-history.entity';

// 認証・API関連エンティティ
import { ApiKey } from './api-key.entity';
import { RateLimitTracking } from './rate-limit-tracking.entity';
import { AuthAttempt } from './auth-attempt.entity';

// テンプレート関連エンティティ
import { Template } from './template.entity';
import { TemplateVariable } from './template-variable.entity';
import { TemplateUsage } from './template-usage.entity';

// ファイル管理エンティティ
import { File } from './file.entity';
import { FileAccessLog } from './file-access-log.entity';

// エクスポート
export {
  User,
  Role,
  Application,
  Inquiry,
  Response,
  FAQ,
  UserHistory,
  InquiryStatusHistory,
  ResponseHistory,
  ApiKey,
  RateLimitTracking,
  AuthAttempt,
  Template,
  TemplateVariable,
  TemplateUsage,
  File,
  FileAccessLog,
};

// 全エンティティの配列（TypeORM設定用）
export const entities = [
  User,
  Role,
  Application,
  Inquiry,
  Response,
  FAQ,
  UserHistory,
  InquiryStatusHistory,
  ResponseHistory,
  ApiKey,
  RateLimitTracking,
  AuthAttempt,
  Template,
  TemplateVariable,
  TemplateUsage,
  File,
  FileAccessLog,
];