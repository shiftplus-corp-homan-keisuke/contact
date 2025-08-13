# ファイル依存関係マップ

## 依存関係分析結果

### 1. 認証・ユーザー管理関連の依存関係

#### AuthService の依存関係
- **Entities**: User, Role, AuthAttempt, UserHistory
- **Types**: RoleType, ResourceType, ActionType
- **External**: bcrypt, JWT

#### RoleService の依存関係
- **Entities**: Role, User
- **Types**: RoleType, ResourceType, ActionType

#### PermissionService の依存関係
- **Entities**: Role, User
- **Types**: ResourceType, ActionType

### 2. 問い合わせ・回答管理関連の依存関係

#### InquiryService の依存関係
- **Entities**: Inquiry, InquiryStatusHistory, User, Application
- **Types**: InquiryStatus, InquiryPriority, SearchCriteria
- **Services**: NotificationService, VectorService

#### ResponseService の依存関係
- **Entities**: Response, ResponseHistory, Inquiry, User
- **Types**: ResponseData
- **Services**: NotificationService

#### WorkflowService の依存関係
- **Entities**: Inquiry, InquiryStatusHistory, User
- **Types**: InquiryStatus, InquiryPriority

### 3. 検索・FAQ・通知関連の依存関係

#### VectorService の依存関係
- **Entities**: Inquiry, Response, FAQ
- **External**: Faiss, OpenAI Embeddings API

#### HybridSearchService の依存関係
- **Services**: VectorService, SearchService
- **Entities**: Inquiry, Response, FAQ

#### FAQService の依存関係
- **Entities**: FAQ, Inquiry, Response
- **Services**: VectorService, FAQClusteringService
- **Repositories**: FAQRepository

#### NotificationService の依存関係
- **Entities**: NotificationRule, NotificationLog, User
- **Services**: SlackNotificationService, TeamsNotificationService, RealtimeNotificationService

### 4. 分析・テンプレート・ファイル管理関連の依存関係

#### AnalyticsService の依存関係
- **Entities**: Inquiry, Response, User, SlaViolation
- **Services**: InquiryService, ResponseService

#### TemplateService の依存関係
- **Entities**: Template, TemplateUsage, TemplateVariable
- **Services**: HybridSearchService
- **Repositories**: TemplateRepository

#### FileService の依存関係
- **Entities**: File, FileAccessLog, Inquiry
- **Services**: FileStorageService, FileSecurityService
- **Repositories**: FileRepository

## 循環依存の特定

### 潜在的な循環依存
1. **InquiryService ↔ NotificationService**: 問い合わせ作成時の通知と通知ルールでの問い合わせ参照
2. **TemplateService ↔ HybridSearchService**: テンプレート提案での検索とテンプレート内容の検索対象化
3. **AnalyticsService ↔ InquiryService**: 分析データ取得と分析結果の問い合わせへの反映

### 循環依存の解決策
1. **イベント駆動アーキテクチャ**: 直接的な依存関係をイベントベースの通信に変更
2. **共通インターフェース**: 共通の型定義とインターフェースを使用
3. **依存性注入の最適化**: 必要最小限の依存関係のみを注入

## モジュール間依存関係マトリックス

| Module | Auth | Users | Inquiries | Responses | Search | FAQs | Notifications | Analytics | Templates | Files |
|--------|------|-------|-----------|-----------|--------|------|---------------|-----------|-----------|-------|
| Auth | - | ✓ | - | - | - | - | - | - | - | - |
| Users | - | - | - | - | - | - | ✓ | - | ✓ | - |
| Inquiries | ✓ | ✓ | - | - | ✓ | - | ✓ | - | - | ✓ |
| Responses | ✓ | ✓ | ✓ | - | - | - | ✓ | - | - | - |
| Search | - | - | ✓ | ✓ | - | ✓ | - | - | - | - |
| FAQs | - | ✓ | ✓ | ✓ | ✓ | - | - | - | - | - |
| Notifications | - | ✓ | ✓ | ✓ | - | - | - | - | - | - |
| Analytics | - | ✓ | ✓ | ✓ | - | - | - | - | - | - |
| Templates | - | ✓ | ✓ | - | ✓ | - | - | - | - | - |
| Files | ✓ | ✓ | ✓ | - | - | - | - | - | - | - |

## 移行時の注意点

### 1. インポートパスの更新
- 相対パス (`../`) から絶対パス (`src/modules/`) への変更
- バレル エクスポート (`index.ts`) の活用

### 2. 共通機能の分離
- 真の共通機能のみを `common` ディレクトリに残す
- モジュール固有の機能は各モジュールに移動

### 3. テストファイルの移行
- テストファイルも対応するモジュールに移動
- テスト用のモックとスタブの更新

### 4. 設定ファイルの更新
- TypeORM エンティティの登録パス更新
- モジュールインポートの更新

## 移行順序の推奨

### Phase 1: 基盤モジュール
1. **Common** - 共通機能の整理
2. **Auth** - 認証機能（他の多くのモジュールが依存）
3. **Users** - ユーザー管理（認証と密接に関連）

### Phase 2: コアモジュール
4. **Inquiries** - 問い合わせ管理（システムの中核）
5. **Responses** - 回答管理（問い合わせに依存）

### Phase 3: 拡張モジュール
6. **Search** - 検索機能
7. **FAQs** - FAQ管理
8. **Files** - ファイル管理

### Phase 4: 支援モジュール
9. **Notifications** - 通知システム
10. **Templates** - テンプレート管理
11. **Analytics** - 分析機能

この順序により、依存関係の問題を最小限に抑えながら段階的な移行が可能です。