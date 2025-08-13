# プロジェクト構造分析レポート

## 現状分析

### 現在の構造の問題点

1. **混在した責任**: `src/common`ディレクトリに全ての機能が混在
2. **不適切な命名**: `common`は共通機能を示すべきだが、実際は全機能を含む
3. **依存関係の複雑化**: 全てのファイルが同一ディレクトリにあるため依存関係が不明確
4. **スケーラビリティの問題**: 新機能追加時の影響範囲が不明確

### 現在のファイル分類

#### 認証・ユーザー管理関連
- **Controllers**: `auth.controller.ts`, `role.controller.ts`
- **Services**: `auth.service.ts`, `role.service.ts`, `permission.service.ts`
- **Entities**: `user.entity.ts`, `role.entity.ts`, `auth-attempt.entity.ts`, `user-history.entity.ts`
- **Guards**: `jwt-auth.guard.ts`, `local-auth.guard.ts`, `roles.guard.ts`
- **Strategies**: `jwt.strategy.ts`, `local.strategy.ts`
- **DTOs**: `auth.dto.ts`, `role.dto.ts`

#### 問い合わせ・回答管理関連
- **Controllers**: `inquiry.controller.ts`, `response.controller.ts`, `workflow.controller.ts`
- **Services**: `inquiry.service.ts`, `response.service.ts`, `workflow.service.ts`
- **Entities**: `inquiry.entity.ts`, `response.entity.ts`, `inquiry-status-history.entity.ts`, `response-history.entity.ts`
- **DTOs**: `inquiry.dto.ts`, `response.dto.ts`, `workflow.dto.ts`
- **Repositories**: `inquiry.repository.ts`

#### 検索・FAQ・通知関連
- **Controllers**: `faq.controller.ts`, `faq-site.controller.ts`, `notification.controller.ts`
- **Services**: `faq.service.ts`, `faq-clustering.service.ts`, `faq-site.service.ts`, `vector.service.ts`, `hybrid-search.service.ts`, `search.service.ts`, `notification.service.ts`
- **Entities**: `faq.entity.ts`, `notification-rule.entity.ts`, `notification-log.entity.ts`
- **Gateways**: `notification.gateway.ts`

#### 分析・テンプレート・ファイル管理関連
- **Controllers**: `analytics.controller.ts`, `prediction.controller.ts`, `template.controller.ts`, `file.controller.ts`
- **Services**: `analytics.service.ts`, `prediction.service.ts`, `template.service.ts`, `file.service.ts`
- **Entities**: `template.entity.ts`, `template-usage.entity.ts`, `file.entity.ts`

#### 真の共通機能
- **Guards**: `permissions.guard.ts` (全モジュール共通)
- **Decorators**: `current-user.decorator.ts` (全コントローラー共通)
- **Filters**: `global-exception.filter.ts` (グローバル設定)
- **Interceptors**: `logging.interceptor.ts` (グローバル設定)
- **Utils**: `date.util.ts`, `id-generator.util.ts`, `validation.utils.ts`
- **Types**: 共通型定義
- **Constants**: アプリケーション定数

## NestJSベストプラクティス準拠の新構造設計

### 推奨構造

```
src/
├── app.module.ts
├── main.ts
├── health-check.ts
├── config/                    # 設定ファイル
│   ├── database.config.ts
│   └── logger.config.ts
├── common/                    # 真の共通機能のみ
│   ├── constants/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── types/
│   ├── utils/
│   └── validators/
├── modules/                   # 機能別モジュール
│   ├── auth/                  # 認証・認可
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── dto/
│   │   ├── __tests__/
│   │   └── auth.module.ts
│   ├── users/                 # ユーザー管理
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   ├── repositories/
│   │   ├── dto/
│   │   ├── __tests__/
│   │   └── users.module.ts
│   ├── inquiries/             # 問い合わせ管理
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   ├── repositories/
│   │   ├── dto/
│   │   ├── __tests__/
│   │   └── inquiries.module.ts
│   ├── responses/             # 回答管理
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   ├── dto/
│   │   ├── __tests__/
│   │   └── responses.module.ts
│   ├── search/                # 検索機能
│   │   ├── services/
│   │   ├── dto/
│   │   ├── __tests__/
│   │   └── search.module.ts
│   ├── faqs/                  # FAQ管理
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   ├── dto/
│   │   ├── __tests__/
│   │   └── faqs.module.ts
│   ├── notifications/         # 通知システム
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── gateways/
│   │   ├── entities/
│   │   ├── dto/
│   │   ├── __tests__/
│   │   └── notifications.module.ts
│   ├── analytics/             # 分析機能
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   ├── __tests__/
│   │   └── analytics.module.ts
│   ├── templates/             # テンプレート管理
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   ├── repositories/
│   │   ├── dto/
│   │   ├── __tests__/
│   │   └── templates.module.ts
│   └── files/                 # ファイル管理
│       ├── controllers/
│       ├── services/
│       ├── entities/
│       ├── repositories/
│       ├── dto/
│       ├── __tests__/
│       └── files.module.ts
├── database/
│   ├── migrations/
│   └── seeds/
└── migrations/                # TypeORM migrations
```

## 移行対象ファイルの分類

### 1. 認証・ユーザー管理モジュール (auth, users)

#### 移行対象ファイル
```
src/common/controllers/auth.controller.ts → src/modules/auth/controllers/
src/common/controllers/role.controller.ts → src/modules/users/controllers/
src/common/services/auth.service.ts → src/modules/auth/services/
src/common/services/role.service.ts → src/modules/users/services/
src/common/services/permission.service.ts → src/modules/users/services/
src/common/strategies/jwt.strategy.ts → src/modules/auth/strategies/
src/common/strategies/local.strategy.ts → src/modules/auth/strategies/
src/common/guards/jwt-auth.guard.ts → src/modules/auth/guards/
src/common/guards/local-auth.guard.ts → src/modules/auth/guards/
src/common/guards/roles.guard.ts → src/modules/users/guards/
src/common/entities/user.entity.ts → src/modules/users/entities/
src/common/entities/role.entity.ts → src/modules/users/entities/
src/common/entities/auth-attempt.entity.ts → src/modules/auth/entities/
src/common/entities/user-history.entity.ts → src/modules/users/entities/
src/common/dto/auth.dto.ts → src/modules/auth/dto/
src/common/dto/role.dto.ts → src/modules/users/dto/
src/common/repositories/user.repository.ts → src/modules/users/repositories/
```

### 2. 問い合わせ・回答管理モジュール (inquiries, responses)

#### 移行対象ファイル
```
src/common/controllers/inquiry.controller.ts → src/modules/inquiries/controllers/
src/common/controllers/response.controller.ts → src/modules/responses/controllers/
src/common/controllers/workflow.controller.ts → src/modules/inquiries/controllers/
src/common/services/inquiry.service.ts → src/modules/inquiries/services/
src/common/services/response.service.ts → src/modules/responses/services/
src/common/services/workflow.service.ts → src/modules/inquiries/services/
src/common/entities/inquiry.entity.ts → src/modules/inquiries/entities/
src/common/entities/response.entity.ts → src/modules/responses/entities/
src/common/entities/inquiry-status-history.entity.ts → src/modules/inquiries/entities/
src/common/entities/response-history.entity.ts → src/modules/responses/entities/
src/common/dto/inquiry.dto.ts → src/modules/inquiries/dto/
src/common/dto/response.dto.ts → src/modules/responses/dto/
src/common/dto/workflow.dto.ts → src/modules/inquiries/dto/
src/common/repositories/inquiry.repository.ts → src/modules/inquiries/repositories/
```

### 3. 検索・FAQ・通知モジュール (search, faqs, notifications)

#### 移行対象ファイル
```
src/common/services/vector.service.ts → src/modules/search/services/
src/common/services/hybrid-search.service.ts → src/modules/search/services/
src/common/services/search.service.ts → src/modules/search/services/
src/common/controllers/faq.controller.ts → src/modules/faqs/controllers/
src/common/controllers/faq-site.controller.ts → src/modules/faqs/controllers/
src/common/services/faq.service.ts → src/modules/faqs/services/
src/common/services/faq-clustering.service.ts → src/modules/faqs/services/
src/common/services/faq-site.service.ts → src/modules/faqs/services/
src/common/entities/faq.entity.ts → src/modules/faqs/entities/
src/common/dto/faq.dto.ts → src/modules/faqs/dto/
src/common/repositories/faq.repository.ts → src/modules/faqs/repositories/
src/common/controllers/notification.controller.ts → src/modules/notifications/controllers/
src/common/services/notification.service.ts → src/modules/notifications/services/
src/common/gateways/notification.gateway.ts → src/modules/notifications/gateways/
```

### 4. 分析・テンプレート・ファイル管理モジュール

#### 移行対象ファイル
```
src/common/controllers/analytics.controller.ts → src/modules/analytics/controllers/
src/common/controllers/prediction.controller.ts → src/modules/analytics/controllers/
src/common/services/analytics.service.ts → src/modules/analytics/services/
src/common/services/prediction.service.ts → src/modules/analytics/services/
src/common/controllers/template.controller.ts → src/modules/templates/controllers/
src/common/services/template.service.ts → src/modules/templates/services/
src/common/services/template-suggestion.service.ts → src/modules/templates/services/
src/common/services/template-macro.service.ts → src/modules/templates/services/
src/common/entities/template.entity.ts → src/modules/templates/entities/
src/common/entities/template-usage.entity.ts → src/modules/templates/entities/
src/common/entities/template-variable.entity.ts → src/modules/templates/entities/
src/common/dto/template.dto.ts → src/modules/templates/dto/
src/common/repositories/template.repository.ts → src/modules/templates/repositories/
src/common/controllers/file.controller.ts → src/modules/files/controllers/
src/common/services/file.service.ts → src/modules/files/services/
src/common/services/file-storage.service.ts → src/modules/files/services/
src/common/services/file-security.service.ts → src/modules/files/services/
src/common/entities/file.entity.ts → src/modules/files/entities/
src/common/dto/file.dto.ts → src/modules/files/dto/
src/common/repositories/file.repository.ts → src/modules/files/repositories/
```

### 5. 真の共通機能 (common)

#### 残留ファイル
```
src/common/guards/permissions.guard.ts (全モジュール共通)
src/common/decorators/current-user.decorator.ts (全コントローラー共通)
src/common/filters/global-exception.filter.ts (グローバル設定)
src/common/interceptors/logging.interceptor.ts (グローバル設定)
src/common/utils/ (全ユーティリティ)
src/common/types/ (共通型定義)
src/common/constants/ (アプリケーション定数)
src/common/validators/ (共通バリデーター)
```

## 依存関係マップ

### 主要な依存関係
1. **Auth Module** → Users Module (ユーザー情報取得)
2. **Inquiries Module** → Users Module (担当者情報)
3. **Responses Module** → Inquiries Module (問い合わせ関連付け)
4. **Notifications Module** → Users Module (通知先ユーザー)
5. **Analytics Module** → Inquiries Module, Responses Module (分析データ)
6. **Search Module** → Inquiries Module, FAQs Module (検索対象)
7. **Templates Module** → Users Module (テンプレート作成者)
8. **Files Module** → Inquiries Module (ファイル関連付け)

### 循環依存の回避策
- **共通インターフェース**: 共通の型定義を`common/types`に配置
- **イベント駆動**: モジュール間の直接依存を避け、イベントベースの通信を使用
- **サービス注入**: 必要な場合のみ他モジュールのサービスを注入

## 移行戦略

### フェーズ1: 準備作業
1. 新しいディレクトリ構造の作成
2. 共通機能の特定と分離
3. 依存関係の分析と整理

### フェーズ2: モジュール別移行
1. 認証・ユーザー管理モジュール
2. 問い合わせ・回答管理モジュール
3. 検索・FAQ・通知モジュール
4. 分析・テンプレート・ファイル管理モジュール

### フェーズ3: 統合とテスト
1. app.module.tsの更新
2. インポートパスの一括更新
3. テスト実行と修正
4. ドキュメント更新

## 期待される効果

### 保守性向上
- **明確な責任分離**: 各モジュールが単一の責任を持つ
- **独立したテスト**: モジュール単位でのテストが容易
- **コード理解の向上**: 機能別の整理により理解しやすい

### スケーラビリティ確保
- **並行開発**: チーム別にモジュール開発が可能
- **機能追加**: 新機能を独立したモジュールとして追加
- **部分デプロイ**: 必要に応じてモジュール単位でのデプロイ

### 開発効率向上
- **コード再利用**: 共通機能の明確化により再利用が促進
- **影響範囲の限定**: 変更時の影響範囲が明確
- **デバッグの効率化**: 問題の特定が容易