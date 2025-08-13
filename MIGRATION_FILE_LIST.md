# 移行対象ファイル詳細リスト

## 移行ファイル分類

### 1. 認証・ユーザー管理モジュール

#### Auth Module (src/modules/auth/)

**Controllers**
- `src/common/controllers/auth.controller.ts` → `src/modules/auth/controllers/auth.controller.ts`

**Services**
- `src/common/services/auth.service.ts` → `src/modules/auth/services/auth.service.ts`

**Guards**
- `src/common/guards/jwt-auth.guard.ts` → `src/modules/auth/guards/jwt-auth.guard.ts`
- `src/common/guards/local-auth.guard.ts` → `src/modules/auth/guards/local-auth.guard.ts`

**Strategies**
- `src/common/strategies/jwt.strategy.ts` → `src/modules/auth/strategies/jwt.strategy.ts`
- `src/common/strategies/local.strategy.ts` → `src/modules/auth/strategies/local.strategy.ts`
- `src/common/strategies/api-key.strategy.ts` → `src/modules/auth/strategies/api-key.strategy.ts`

**Entities**
- `src/common/entities/auth-attempt.entity.ts` → `src/modules/auth/entities/auth-attempt.entity.ts`

**DTOs**
- `src/common/dto/auth.dto.ts` → `src/modules/auth/dto/auth.dto.ts`

**Tests**
- `src/common/__tests__/auth.service.spec.ts` → `src/modules/auth/__tests__/auth.service.spec.ts`
- `src/common/__tests__/auth-integration.spec.ts` → `src/modules/auth/__tests__/auth-integration.spec.ts`

**Module**
- `src/common/modules/auth.module.ts` → `src/modules/auth/auth.module.ts`

#### Users Module (src/modules/users/)

**Controllers**
- `src/common/controllers/role.controller.ts` → `src/modules/users/controllers/roles.controller.ts`

**Services**
- `src/common/services/role.service.ts` → `src/modules/users/services/roles.service.ts`
- `src/common/services/permission.service.ts` → `src/modules/users/services/permissions.service.ts`

**Guards**
- `src/common/guards/roles.guard.ts` → `src/modules/users/guards/roles.guard.ts`

**Entities**
- `src/common/entities/user.entity.ts` → `src/modules/users/entities/user.entity.ts`
- `src/common/entities/role.entity.ts` → `src/modules/users/entities/role.entity.ts`
- `src/common/entities/user-history.entity.ts` → `src/modules/users/entities/user-history.entity.ts`

**DTOs**
- `src/common/dto/role.dto.ts` → `src/modules/users/dto/role.dto.ts`

**Repositories**
- `src/common/repositories/user.repository.ts` → `src/modules/users/repositories/users.repository.ts`

**Validators**
- `src/common/validators/user.validators.ts` → `src/modules/users/validators/user.validators.ts`

**Types**
- `src/common/types/user.types.ts` → `src/modules/users/types/user.types.ts`
- `src/common/types/role.types.ts` → `src/modules/users/types/role.types.ts`

### 2. 問い合わせ・回答管理モジュール

#### Inquiries Module (src/modules/inquiries/)

**Controllers**
- `src/common/controllers/inquiry.controller.ts` → `src/modules/inquiries/controllers/inquiries.controller.ts`
- `src/common/controllers/workflow.controller.ts` → `src/modules/inquiries/controllers/workflow.controller.ts`

**Services**
- `src/common/services/inquiry.service.ts` → `src/modules/inquiries/services/inquiries.service.ts`
- `src/common/services/workflow.service.ts` → `src/modules/inquiries/services/workflow.service.ts`

**Entities**
- `src/common/entities/inquiry.entity.ts` → `src/modules/inquiries/entities/inquiry.entity.ts`
- `src/common/entities/inquiry-status-history.entity.ts` → `src/modules/inquiries/entities/inquiry-status-history.entity.ts`
- `src/common/entities/application.entity.ts` → `src/modules/inquiries/entities/application.entity.ts`

**DTOs**
- `src/common/dto/inquiry.dto.ts` → `src/modules/inquiries/dto/inquiry.dto.ts`
- `src/common/dto/workflow.dto.ts` → `src/modules/inquiries/dto/workflow.dto.ts`

**Repositories**
- `src/common/repositories/inquiry.repository.ts` → `src/modules/inquiries/repositories/inquiries.repository.ts`

**Validators**
- `src/common/validators/inquiry.validators.ts` → `src/modules/inquiries/validators/inquiry.validators.ts`

**Types**
- `src/common/types/inquiry.types.ts` → `src/modules/inquiries/types/inquiry.types.ts`

**Tests**
- `src/common/services/__tests__/workflow.service.spec.ts` → `src/modules/inquiries/__tests__/workflow.service.spec.ts`

**Module**
- `src/common/modules/inquiry.module.ts` → `src/modules/inquiries/inquiries.module.ts`
- `src/common/modules/workflow.module.ts` → `src/modules/inquiries/workflow.module.ts` (統合)

#### Responses Module (src/modules/responses/)

**Controllers**
- `src/common/controllers/response.controller.ts` → `src/modules/responses/controllers/responses.controller.ts`

**Services**
- `src/common/services/response.service.ts` → `src/modules/responses/services/responses.service.ts`

**Entities**
- `src/common/entities/response.entity.ts` → `src/modules/responses/entities/response.entity.ts`
- `src/common/entities/response-history.entity.ts` → `src/modules/responses/entities/response-history.entity.ts`

**DTOs**
- `src/common/dto/response.dto.ts` → `src/modules/responses/dto/response.dto.ts`

**Validators**
- `src/common/validators/response.validators.ts` → `src/modules/responses/validators/response.validators.ts`

**Types**
- `src/common/types/response.types.ts` → `src/modules/responses/types/response.types.ts`

**Module**
- `src/common/modules/response.module.ts` → `src/modules/responses/responses.module.ts`

### 3. 検索・FAQ・通知モジュール

#### Search Module (src/modules/search/)

**Services**
- `src/common/services/vector.service.ts` → `src/modules/search/services/vector.service.ts`
- `src/common/services/hybrid-search.service.ts` → `src/modules/search/services/hybrid-search.service.ts`
- `src/common/services/search.service.ts` → `src/modules/search/services/search.service.ts`

**DTOs**
- `src/common/dto/search.dto.ts` → `src/modules/search/dto/search.dto.ts`

**Tests**
- `src/common/services/__tests__/vector.service.spec.ts` → `src/modules/search/__tests__/vector.service.spec.ts`

#### FAQs Module (src/modules/faqs/)

**Controllers**
- `src/common/controllers/faq.controller.ts` → `src/modules/faqs/controllers/faqs.controller.ts`
- `src/common/controllers/faq-site.controller.ts` → `src/modules/faqs/controllers/faq-site.controller.ts`

**Services**
- `src/common/services/faq.service.ts` → `src/modules/faqs/services/faqs.service.ts`
- `src/common/services/faq-clustering.service.ts` → `src/modules/faqs/services/faq-clustering.service.ts`
- `src/common/services/faq-site.service.ts` → `src/modules/faqs/services/faq-site.service.ts`

**Entities**
- `src/common/entities/faq.entity.ts` → `src/modules/faqs/entities/faq.entity.ts`

**DTOs**
- `src/common/dto/faq.dto.ts` → `src/modules/faqs/dto/faq.dto.ts`

**Repositories**
- `src/common/repositories/faq.repository.ts` → `src/modules/faqs/repositories/faqs.repository.ts`

**Validators**
- `src/common/validators/faq.validators.ts` → `src/modules/faqs/validators/faq.validators.ts`

**Types**
- `src/common/types/faq.types.ts` → `src/modules/faqs/types/faq.types.ts`

**Modules**
- `src/common/modules/faq.module.ts` → `src/modules/faqs/faqs.module.ts`
- `src/common/modules/faq-site.module.ts` → `src/modules/faqs/faq-site.module.ts` (統合)

#### Notifications Module (src/modules/notifications/)

**Controllers**
- `src/common/controllers/notification.controller.ts` → `src/modules/notifications/controllers/notifications.controller.ts`

**Services**
- `src/common/services/notification.service.ts` → `src/modules/notifications/services/notifications.service.ts`
- `src/common/services/notification-rule.service.ts` → `src/modules/notifications/services/notification-rule.service.ts`
- `src/common/services/notification-rule-engine.service.ts` → `src/modules/notifications/services/notification-rule-engine.service.ts`
- `src/common/services/notification-history.service.ts` → `src/modules/notifications/services/notification-history.service.ts`
- `src/common/services/notification-template.service.ts` → `src/modules/notifications/services/notification-template.service.ts`
- `src/common/services/realtime-notification.service.ts` → `src/modules/notifications/services/realtime-notification.service.ts`
- `src/common/services/slack-notification.service.ts` → `src/modules/notifications/services/slack-notification.service.ts`
- `src/common/services/teams-notification.service.ts` → `src/modules/notifications/services/teams-notification.service.ts`

**Gateways**
- `src/common/gateways/notification.gateway.ts` → `src/modules/notifications/gateways/notifications.gateway.ts`

**Entities**
- `src/common/entities/notification-rule.entity.ts` → `src/modules/notifications/entities/notification-rule.entity.ts`
- `src/common/entities/notification-log.entity.ts` → `src/modules/notifications/entities/notification-log.entity.ts`
- `src/common/entities/user-notification-settings.entity.ts` → `src/modules/notifications/entities/user-notification-settings.entity.ts`

**DTOs**
- `src/common/dto/notification.dto.ts` → `src/modules/notifications/dto/notification.dto.ts`

**Types**
- `src/common/types/notification.types.ts` → `src/modules/notifications/types/notification.types.ts`

**Tests**
- `src/common/gateways/__tests__/notification.gateway.spec.ts` → `src/modules/notifications/__tests__/notifications.gateway.spec.ts`

**Module**
- `src/common/modules/notification.module.ts` → `src/modules/notifications/notifications.module.ts`

### 4. 分析・テンプレート・ファイル管理モジュール

#### Analytics Module (src/modules/analytics/)

**Controllers**
- `src/common/controllers/analytics.controller.ts` → `src/modules/analytics/controllers/analytics.controller.ts`
- `src/common/controllers/prediction.controller.ts` → `src/modules/analytics/controllers/prediction.controller.ts`

**Services**
- `src/common/services/analytics.service.ts` → `src/modules/analytics/services/analytics.service.ts`
- `src/common/services/prediction.service.ts` → `src/modules/analytics/services/prediction.service.ts`

**Gateways**
- `src/common/gateways/analytics.gateway.ts` → `src/modules/analytics/gateways/analytics.gateway.ts`

**DTOs**
- `src/common/dto/analytics.dto.ts` → `src/modules/analytics/dto/analytics.dto.ts`

**Modules**
- `src/common/modules/analytics.module.ts` → `src/modules/analytics/analytics.module.ts`
- `src/common/modules/prediction.module.ts` → `src/modules/analytics/prediction.module.ts` (統合)

#### Templates Module (src/modules/templates/)

**Controllers**
- `src/common/controllers/template.controller.ts` → `src/modules/templates/controllers/templates.controller.ts`

**Services**
- `src/common/services/template.service.ts` → `src/modules/templates/services/templates.service.ts`
- `src/common/services/template-suggestion.service.ts` → `src/modules/templates/services/template-suggestion.service.ts`
- `src/common/services/template-macro.service.ts` → `src/modules/templates/services/template-macro.service.ts`

**Entities**
- `src/common/entities/template.entity.ts` → `src/modules/templates/entities/template.entity.ts`
- `src/common/entities/template-usage.entity.ts` → `src/modules/templates/entities/template-usage.entity.ts`
- `src/common/entities/template-variable.entity.ts` → `src/modules/templates/entities/template-variable.entity.ts`

**DTOs**
- `src/common/dto/template.dto.ts` → `src/modules/templates/dto/template.dto.ts`

**Repositories**
- `src/common/repositories/template.repository.ts` → `src/modules/templates/repositories/templates.repository.ts`

**Types**
- `src/common/types/template.types.ts` → `src/modules/templates/types/template.types.ts`

**Tests**
- `src/common/services/__tests__/template.service.spec.ts` → `src/modules/templates/__tests__/templates.service.spec.ts`

**Module**
- `src/common/modules/template.module.ts` → `src/modules/templates/templates.module.ts`

#### Files Module (src/modules/files/)

**Controllers**
- `src/common/controllers/file.controller.ts` → `src/modules/files/controllers/files.controller.ts`
- `src/common/controllers/file-security.controller.ts` → `src/modules/files/controllers/file-security.controller.ts`
- `src/common/controllers/file-storage.controller.ts` → `src/modules/files/controllers/file-storage.controller.ts`

**Services**
- `src/common/services/file.service.ts` → `src/modules/files/services/files.service.ts`
- `src/common/services/file-storage.service.ts` → `src/modules/files/services/file-storage.service.ts`
- `src/common/services/file-security.service.ts` → `src/modules/files/services/file-security.service.ts`

**Entities**
- `src/common/entities/file.entity.ts` → `src/modules/files/entities/file.entity.ts`
- `src/common/entities/file-access-log.entity.ts` → `src/modules/files/entities/file-access-log.entity.ts`

**DTOs**
- `src/common/dto/file.dto.ts` → `src/modules/files/dto/file.dto.ts`

**Repositories**
- `src/common/repositories/file.repository.ts` → `src/modules/files/repositories/files.repository.ts`

**Types**
- `src/common/types/file.types.ts` → `src/modules/files/types/file.types.ts`

**Module**
- `src/common/modules/file.module.ts` → `src/modules/files/files.module.ts`

#### API Keys Module (src/modules/api-keys/)

**Controllers**
- `src/common/controllers/api-key.controller.ts` → `src/modules/api-keys/controllers/api-keys.controller.ts`
- `src/common/controllers/security-monitoring.controller.ts` → `src/modules/api-keys/controllers/security-monitoring.controller.ts`

**Services**
- `src/common/services/api-key.service.ts` → `src/modules/api-keys/services/api-keys.service.ts`
- `src/common/services/rate-limit.service.ts` → `src/modules/api-keys/services/rate-limit.service.ts`
- `src/common/services/security-monitoring.service.ts` → `src/modules/api-keys/services/security-monitoring.service.ts`

**Entities**
- `src/common/entities/api-key.entity.ts` → `src/modules/api-keys/entities/api-key.entity.ts`
- `src/common/entities/rate-limit-tracking.entity.ts` → `src/modules/api-keys/entities/rate-limit-tracking.entity.ts`

**Guards**
- `src/common/guards/api-key-auth.guard.ts` → `src/modules/api-keys/guards/api-key-auth.guard.ts`
- `src/common/guards/rate-limit.guard.ts` → `src/modules/api-keys/guards/rate-limit.guard.ts`

**Decorators**
- `src/common/decorators/api-key-auth.decorator.ts` → `src/modules/api-keys/decorators/api-key-auth.decorator.ts`
- `src/common/decorators/api-key-context.decorator.ts` → `src/modules/api-keys/decorators/api-key-context.decorator.ts`

**DTOs**
- `src/common/dto/api-key.dto.ts` → `src/modules/api-keys/dto/api-key.dto.ts`

**Examples**
- `src/common/examples/api-key-usage.example.ts` → `src/modules/api-keys/examples/api-key-usage.example.ts`

**Module**
- `src/common/modules/api-key.module.ts` → `src/modules/api-keys/api-keys.module.ts`

### 5. SLA・エスカレーション・履歴管理モジュール

#### SLA Module (src/modules/sla/)

**Controllers**
- `src/common/controllers/sla.controller.ts` → `src/modules/sla/controllers/sla.controller.ts`

**Services**
- `src/common/services/sla-monitoring.service.ts` → `src/modules/sla/services/sla-monitoring.service.ts`
- `src/common/services/escalation.service.ts` → `src/modules/sla/services/escalation.service.ts`

**Entities**
- `src/common/entities/sla-config.entity.ts` → `src/modules/sla/entities/sla-config.entity.ts`
- `src/common/entities/sla-violation.entity.ts` → `src/modules/sla/entities/sla-violation.entity.ts`

**DTOs**
- `src/common/dto/sla.dto.ts` → `src/modules/sla/dto/sla.dto.ts`

**Tests**
- `src/common/__tests__/sla-monitoring.service.spec.ts` → `src/modules/sla/__tests__/sla-monitoring.service.spec.ts`
- `src/common/__tests__/escalation.service.spec.ts` → `src/modules/sla/__tests__/escalation.service.spec.ts`

**Module**
- `src/common/modules/sla.module.ts` → `src/modules/sla/sla.module.ts`

#### History Module (src/modules/history/)

**Controllers**
- `src/common/controllers/history.controller.ts` → `src/modules/history/controllers/history.controller.ts`

**Services**
- `src/common/services/history.service.ts` → `src/modules/history/services/history.service.ts`

**Interceptors**
- `src/common/interceptors/history-tracking.interceptor.ts` → `src/modules/history/interceptors/history-tracking.interceptor.ts`

**Decorators**
- `src/common/decorators/track-history.decorator.ts` → `src/modules/history/decorators/track-history.decorator.ts`

**Module**
- `src/common/modules/history.module.ts` → `src/modules/history/history.module.ts`

### 6. 共通機能（残留ファイル）

#### Common Directory (src/common/)

**Guards** (全モジュール共通)
- `src/common/guards/permissions.guard.ts` → `src/common/guards/permissions.guard.ts` (残留)

**Decorators** (全コントローラー共通)
- `src/common/decorators/current-user.decorator.ts` → `src/common/decorators/current-user.decorator.ts` (残留)
- `src/common/decorators/public.decorator.ts` → `src/common/decorators/public.decorator.ts` (残留)
- `src/common/decorators/permissions.decorator.ts` → `src/common/decorators/permissions.decorator.ts` (残留)
- `src/common/decorators/roles.decorator.ts` → `src/common/decorators/roles.decorator.ts` (残留)
- `src/common/decorators/validation.decorator.ts` → `src/common/decorators/validation.decorator.ts` (残留)

**Filters** (グローバル設定)
- `src/common/filters/global-exception.filter.ts` → `src/common/filters/global-exception.filter.ts` (残留)

**Interceptors** (グローバル設定)
- `src/common/interceptors/logging.interceptor.ts` → `src/common/interceptors/logging.interceptor.ts` (残留)

**Utils** (全ユーティリティ)
- `src/common/utils/date.util.ts` → `src/common/utils/date.util.ts` (残留)
- `src/common/utils/id-generator.util.ts` → `src/common/utils/id-generator.util.ts` (残留)
- `src/common/utils/validation.utils.ts` → `src/common/utils/validation.utils.ts` (残留)

**Types** (共通型定義)
- `src/common/types/index.ts` → `src/common/types/index.ts` (残留)
- `src/common/types/application.types.ts` → `src/common/types/application.types.ts` (残留)

**Constants** (アプリケーション定数)
- `src/common/constants/app.constants.ts` → `src/common/constants/app.constants.ts` (残留)

**DTOs** (共通DTO)
- `src/common/dto/base-response.dto.ts` → `src/common/dto/base-response.dto.ts` (残留)
- `src/common/dto/pagination.dto.ts` → `src/common/dto/pagination.dto.ts` (残留)

**Entities** (共通エンティティ)
- `src/common/entities/base.entity.ts` → `src/common/entities/base.entity.ts` (残留)

**Repositories** (共通リポジトリ)
- `src/common/repositories/base.repository.ts` → `src/common/repositories/base.repository.ts` (残留)

**Validators** (共通バリデーター)
- `src/common/validators/index.ts` → `src/common/validators/index.ts` (残留)

## 削除対象ファイル

### 統合により不要になるファイル
- `src/common/common.module.ts` (各モジュールに分離されるため)
- `src/common/modules/` ディレクトリ全体 (各モジュールに移動)

### 重複により不要になるファイル
- 既に `src/modules/` に存在する同等ファイル

## 移行後の新規作成ファイル

### 各モジュールの index.ts ファイル
- `src/modules/auth/index.ts`
- `src/modules/users/index.ts`
- `src/modules/inquiries/index.ts`
- `src/modules/responses/index.ts`
- `src/modules/search/index.ts`
- `src/modules/faqs/index.ts`
- `src/modules/notifications/index.ts`
- `src/modules/analytics/index.ts`
- `src/modules/templates/index.ts`
- `src/modules/files/index.ts`
- `src/modules/api-keys/index.ts`
- `src/modules/sla/index.ts`
- `src/modules/history/index.ts`

### 各サブディレクトリの index.ts ファイル
- 各モジュール内の controllers/, services/, dto/, types/ 等のディレクトリ

### 統合モジュールファイル
- 複数の小さなモジュールを統合した新しいモジュールファイル

## 移行作業の優先順位

### Phase 1: 基盤モジュール (高優先度)
1. Common の整理
2. Auth Module
3. Users Module

### Phase 2: コアモジュール (中優先度)
4. Inquiries Module
5. Responses Module
6. API Keys Module

### Phase 3: 拡張モジュール (中優先度)
7. Search Module
8. FAQs Module
9. Files Module

### Phase 4: 支援モジュール (低優先度)
10. Notifications Module
11. Templates Module
12. Analytics Module
13. SLA Module
14. History Module

この順序により、依存関係の問題を最小限に抑えながら段階的な移行が可能です。