# NestJSベストプラクティス準拠の新プロジェクト構造

## 設計原則

### 1. 単一責任の原則
- 各モジュールは単一の業務領域に責任を持つ
- ファイルは特定の機能に集中する

### 2. 依存関係の最小化
- モジュール間の依存関係を最小限に抑える
- 循環依存を避ける設計

### 3. 再利用性の向上
- 共通機能は適切に分離
- インターフェースベースの設計

### 4. テスタビリティの確保
- 各モジュールが独立してテスト可能
- モックとスタブの容易な作成

## 新しいディレクトリ構造

```
src/
├── app.module.ts                    # アプリケーションのルートモジュール
├── main.ts                          # アプリケーションエントリーポイント
├── health-check.ts                  # ヘルスチェック機能
│
├── config/                          # 設定ファイル
│   ├── database.config.ts           # データベース設定
│   ├── logger.config.ts             # ロガー設定
│   ├── redis.config.ts              # Redis設定
│   ├── openai.config.ts             # OpenAI API設定
│   └── index.ts                     # 設定のバレルエクスポート
│
├── common/                          # 真の共通機能のみ
│   ├── constants/                   # アプリケーション定数
│   │   ├── app.constants.ts
│   │   ├── error.constants.ts
│   │   └── index.ts
│   ├── decorators/                  # 共通デコレーター
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   ├── validation.decorator.ts
│   │   └── index.ts
│   ├── filters/                     # グローバルフィルター
│   │   ├── global-exception.filter.ts
│   │   └── index.ts
│   ├── guards/                      # 共通ガード
│   │   ├── permissions.guard.ts
│   │   └── index.ts
│   ├── interceptors/                # グローバルインターセプター
│   │   ├── logging.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   └── index.ts
│   ├── types/                       # 共通型定義
│   │   ├── base.types.ts
│   │   ├── pagination.types.ts
│   │   ├── response.types.ts
│   │   └── index.ts
│   ├── utils/                       # 共通ユーティリティ
│   │   ├── date.util.ts
│   │   ├── id-generator.util.ts
│   │   ├── validation.utils.ts
│   │   └── index.ts
│   ├── dto/                         # 共通DTO
│   │   ├── base-response.dto.ts
│   │   ├── pagination.dto.ts
│   │   └── index.ts
│   └── entities/                    # 共通エンティティ
│       ├── base.entity.ts
│       └── index.ts
│
├── modules/                         # 機能別モジュール
│   │
│   ├── auth/                        # 認証・認可モジュール
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── index.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── local-auth.guard.ts
│   │   │   └── index.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── local.strategy.ts
│   │   │   ├── api-key.strategy.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── auth.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── index.ts
│   │   ├── entities/
│   │   │   ├── auth-attempt.entity.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── auth.types.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── auth.controller.spec.ts
│   │   │   └── auth-integration.spec.ts
│   │   └── auth.module.ts
│   │
│   ├── users/                       # ユーザー管理モジュール
│   │   ├── controllers/
│   │   │   ├── users.controller.ts
│   │   │   ├── roles.controller.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── users.service.ts
│   │   │   ├── roles.service.ts
│   │   │   ├── permissions.service.ts
│   │   │   └── index.ts
│   │   ├── repositories/
│   │   │   ├── users.repository.ts
│   │   │   └── index.ts
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   ├── role.entity.ts
│   │   │   ├── user-history.entity.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   ├── role.dto.ts
│   │   │   └── index.ts
│   │   ├── guards/
│   │   │   ├── roles.guard.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── user.types.ts
│   │   │   ├── role.types.ts
│   │   │   └── index.ts
│   │   ├── validators/
│   │   │   ├── user.validators.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── users.service.spec.ts
│   │   │   ├── roles.service.spec.ts
│   │   │   └── users-integration.spec.ts
│   │   └── users.module.ts
│   │
│   ├── inquiries/                   # 問い合わせ管理モジュール
│   │   ├── controllers/
│   │   │   ├── inquiries.controller.ts
│   │   │   ├── workflow.controller.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── inquiries.service.ts
│   │   │   ├── workflow.service.ts
│   │   │   └── index.ts
│   │   ├── repositories/
│   │   │   ├── inquiries.repository.ts
│   │   │   └── index.ts
│   │   ├── entities/
│   │   │   ├── inquiry.entity.ts
│   │   │   ├── inquiry-status-history.entity.ts
│   │   │   ├── application.entity.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── create-inquiry.dto.ts
│   │   │   ├── update-inquiry.dto.ts
│   │   │   ├── search-inquiry.dto.ts
│   │   │   ├── workflow.dto.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── inquiry.types.ts
│   │   │   └── index.ts
│   │   ├── validators/
│   │   │   ├── inquiry.validators.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── inquiries.service.spec.ts
│   │   │   ├── workflow.service.spec.ts
│   │   │   └── inquiries-integration.spec.ts
│   │   └── inquiries.module.ts
│   │
│   ├── responses/                   # 回答管理モジュール
│   │   ├── controllers/
│   │   │   ├── responses.controller.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── responses.service.ts
│   │   │   └── index.ts
│   │   ├── entities/
│   │   │   ├── response.entity.ts
│   │   │   ├── response-history.entity.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── create-response.dto.ts
│   │   │   ├── update-response.dto.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── response.types.ts
│   │   │   └── index.ts
│   │   ├── validators/
│   │   │   ├── response.validators.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── responses.service.spec.ts
│   │   │   └── responses-integration.spec.ts
│   │   └── responses.module.ts
│   │
│   ├── search/                      # 検索機能モジュール
│   │   ├── services/
│   │   │   ├── search.service.ts
│   │   │   ├── vector.service.ts
│   │   │   ├── hybrid-search.service.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── search.dto.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── search.types.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── search.service.spec.ts
│   │   │   ├── vector.service.spec.ts
│   │   │   └── hybrid-search.service.spec.ts
│   │   └── search.module.ts
│   │
│   ├── faqs/                        # FAQ管理モジュール
│   │   ├── controllers/
│   │   │   ├── faqs.controller.ts
│   │   │   ├── faq-site.controller.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── faqs.service.ts
│   │   │   ├── faq-clustering.service.ts
│   │   │   ├── faq-site.service.ts
│   │   │   └── index.ts
│   │   ├── repositories/
│   │   │   ├── faqs.repository.ts
│   │   │   └── index.ts
│   │   ├── entities/
│   │   │   ├── faq.entity.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── create-faq.dto.ts
│   │   │   ├── update-faq.dto.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── faq.types.ts
│   │   │   └── index.ts
│   │   ├── validators/
│   │   │   ├── faq.validators.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── faqs.service.spec.ts
│   │   │   ├── faq-clustering.service.spec.ts
│   │   │   └── faqs-integration.spec.ts
│   │   └── faqs.module.ts
│   │
│   ├── notifications/               # 通知システムモジュール
│   │   ├── controllers/
│   │   │   ├── notifications.controller.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── notifications.service.ts
│   │   │   ├── notification-rule.service.ts
│   │   │   ├── notification-rule-engine.service.ts
│   │   │   ├── realtime-notification.service.ts
│   │   │   ├── slack-notification.service.ts
│   │   │   ├── teams-notification.service.ts
│   │   │   └── index.ts
│   │   ├── gateways/
│   │   │   ├── notifications.gateway.ts
│   │   │   └── index.ts
│   │   ├── entities/
│   │   │   ├── notification-rule.entity.ts
│   │   │   ├── notification-log.entity.ts
│   │   │   ├── user-notification-settings.entity.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── notification.dto.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── notification.types.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── notifications.service.spec.ts
│   │   │   ├── notification-rule-engine.service.spec.ts
│   │   │   └── notifications-integration.spec.ts
│   │   └── notifications.module.ts
│   │
│   ├── analytics/                   # 分析機能モジュール
│   │   ├── controllers/
│   │   │   ├── analytics.controller.ts
│   │   │   ├── prediction.controller.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── analytics.service.ts
│   │   │   ├── prediction.service.ts
│   │   │   └── index.ts
│   │   ├── gateways/
│   │   │   ├── analytics.gateway.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── analytics.dto.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── analytics.types.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── analytics.service.spec.ts
│   │   │   ├── prediction.service.spec.ts
│   │   │   └── analytics-integration.spec.ts
│   │   └── analytics.module.ts
│   │
│   ├── templates/                   # テンプレート管理モジュール
│   │   ├── controllers/
│   │   │   ├── templates.controller.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── templates.service.ts
│   │   │   ├── template-suggestion.service.ts
│   │   │   ├── template-macro.service.ts
│   │   │   └── index.ts
│   │   ├── repositories/
│   │   │   ├── templates.repository.ts
│   │   │   └── index.ts
│   │   ├── entities/
│   │   │   ├── template.entity.ts
│   │   │   ├── template-usage.entity.ts
│   │   │   ├── template-variable.entity.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── create-template.dto.ts
│   │   │   ├── update-template.dto.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── template.types.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── templates.service.spec.ts
│   │   │   ├── template-suggestion.service.spec.ts
│   │   │   └── templates-integration.spec.ts
│   │   └── templates.module.ts
│   │
│   ├── files/                       # ファイル管理モジュール
│   │   ├── controllers/
│   │   │   ├── files.controller.ts
│   │   │   ├── file-security.controller.ts
│   │   │   ├── file-storage.controller.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── files.service.ts
│   │   │   ├── file-storage.service.ts
│   │   │   ├── file-security.service.ts
│   │   │   └── index.ts
│   │   ├── repositories/
│   │   │   ├── files.repository.ts
│   │   │   └── index.ts
│   │   ├── entities/
│   │   │   ├── file.entity.ts
│   │   │   ├── file-access-log.entity.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── file.dto.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── file.types.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── files.service.spec.ts
│   │   │   ├── file-security.service.spec.ts
│   │   │   └── files-integration.spec.ts
│   │   └── files.module.ts
│   │
│   └── api-keys/                    # APIキー管理モジュール
│       ├── controllers/
│       │   ├── api-keys.controller.ts
│       │   └── index.ts
│       ├── services/
│       │   ├── api-keys.service.ts
│       │   ├── rate-limit.service.ts
│       │   └── index.ts
│       ├── entities/
│       │   ├── api-key.entity.ts
│       │   ├── rate-limit-tracking.entity.ts
│       │   └── index.ts
│       ├── guards/
│       │   ├── api-key-auth.guard.ts
│       │   ├── rate-limit.guard.ts
│       │   └── index.ts
│       ├── decorators/
│       │   ├── api-key-auth.decorator.ts
│       │   ├── api-key-context.decorator.ts
│       │   └── index.ts
│       ├── dto/
│       │   ├── api-key.dto.ts
│       │   └── index.ts
│       ├── types/
│       │   ├── api-key.types.ts
│       │   └── index.ts
│       ├── __tests__/
│       │   ├── api-keys.service.spec.ts
│       │   ├── rate-limit.service.spec.ts
│       │   └── api-keys-integration.spec.ts
│       └── api-keys.module.ts
│
├── database/                        # データベース関連
│   ├── migrations/                  # 手動マイグレーション
│   └── seeds/                       # シードデータ
│
└── migrations/                      # TypeORM自動生成マイグレーション
    ├── 1691234567890-InitialSchema.ts
    ├── 1691234567891-SeedInitialData.ts
    └── ...
```

## モジュール設計の特徴

### 1. 各モジュールの構成要素

#### 必須要素
- **Module File**: `{module-name}.module.ts` - モジュールの定義
- **Controllers**: HTTP リクエストの処理
- **Services**: ビジネスロジックの実装
- **DTOs**: データ転送オブジェクト
- **Types**: TypeScript型定義

#### オプション要素
- **Entities**: データベースエンティティ（データを持つモジュールのみ）
- **Repositories**: データアクセス層（カスタムクエリが必要な場合）
- **Guards**: モジュール固有の認証・認可
- **Decorators**: モジュール固有のデコレーター
- **Validators**: バリデーションロジック
- **Gateways**: WebSocket通信（リアルタイム機能）

### 2. バレルエクスポート（index.ts）の活用

各ディレクトリに `index.ts` を配置し、外部からのインポートを簡素化：

```typescript
// src/modules/auth/services/index.ts
export * from './auth.service';

// src/modules/auth/index.ts
export * from './services';
export * from './controllers';
export * from './dto';
export * from './types';
export * from './auth.module';
```

### 3. 依存関係の管理

#### 許可される依存関係
- **Common** ← 全モジュール（共通機能の利用）
- **Auth** ← 他の全モジュール（認証情報の取得）
- **Users** ← 他の全モジュール（ユーザー情報の取得）

#### 制限される依存関係
- モジュール間の循環依存は禁止
- ビジネスロジックモジュール間の直接依存は最小化

### 4. テスト戦略

#### テストファイルの配置
- 各モジュール内に `__tests__` ディレクトリ
- ユニットテスト、統合テスト、E2Eテストを分離

#### テストの種類
- **Unit Tests**: `*.service.spec.ts`, `*.controller.spec.ts`
- **Integration Tests**: `*-integration.spec.ts`
- **E2E Tests**: `*-e2e.spec.ts`

## 移行のメリット

### 1. 開発効率の向上
- **明確な責任分離**: 機能ごとの独立した開発
- **並行開発**: チーム別のモジュール開発
- **コード理解**: 機能別の整理により理解しやすい

### 2. 保守性の向上
- **影響範囲の限定**: 変更時の影響範囲が明確
- **独立したテスト**: モジュール単位でのテスト
- **デバッグの効率化**: 問題の特定が容易

### 3. スケーラビリティの確保
- **機能追加**: 新機能を独立したモジュールとして追加
- **部分デプロイ**: 必要に応じてモジュール単位でのデプロイ
- **マイクロサービス化**: 将来的な分散アーキテクチャへの移行

### 4. コード品質の向上
- **再利用性**: 共通機能の明確化により再利用が促進
- **一貫性**: 統一されたモジュール構造
- **型安全性**: TypeScriptの型システムを最大限活用