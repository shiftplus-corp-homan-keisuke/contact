# 共通機能整理・最適化の実施結果

## 実施内容

### 1. 真の共通機能の特定と維持

以下の機能は全モジュールで使用される真の共通機能として`src/common`に維持：

#### グローバル機能
- `guards/permissions.guard.ts` - 権限チェック（全モジュール共通）
- `decorators/current-user.decorator.ts` - 現在のユーザー取得（全コントローラー共通）
- `filters/global-exception.filter.ts` - グローバル例外処理
- `interceptors/logging.interceptor.ts` - グローバルログ記録

#### 共通ユーティリティ
- `utils/validation.utils.ts` - 汎用バリデーション関数
- `utils/date.util.ts` - 日付操作ユーティリティ
- `utils/id-generator.util.ts` - ID生成ユーティリティ

#### 共通定数・型定義
- `constants/app.constants.ts` - アプリケーション全体の定数（整理済み）
- `types/index.ts` - 共通型定義
- `dto/` - 共通DTO（ページネーション、レスポンス形式など）

### 2. 機能固有ガードの適切なモジュールへの移行

#### 認証モジュール（src/modules/auth/guards/）
- `api-key-auth.guard.ts` - APIキー認証（API認証に特化）
- `rate-limit.guard.ts` - レート制限（API認証と密結合）

#### ユーザーモジュール（src/modules/users/guards/）
- `roles.guard.ts` - 役割ベースアクセス制御（ユーザーの役割管理に特化）

### 3. 機能固有定数の各モジュールへの移行

#### 問い合わせモジュール（src/modules/inquiries/constants/）
- `inquiry.constants.ts` - 問い合わせ状態、優先度、SLA設定

#### ユーザーモジュール（src/modules/users/constants/）
- `user.constants.ts` - ユーザー役割、権限、パスワード設定

#### ファイルモジュール（src/modules/files/constants/）
- `file.constants.ts` - ファイルタイプ、サイズ制限、保存期間

#### 認証モジュール（src/modules/auth/constants/）
- `auth.constants.ts` - レート制限、JWT設定、セッション設定

### 4. 機能固有バリデーションの移行

#### 問い合わせモジュール（src/modules/inquiries/validators/）
- `inquiry.validators.ts` - 問い合わせ固有のバリデーション

### 5. インデックスファイルの整備

各モジュールに`index.ts`を作成し、移行した機能を適切にエクスポート：
- `src/modules/auth/index.ts`
- `src/modules/users/index.ts`
- `src/modules/inquiries/index.ts`
- `src/modules/files/index.ts`
- `src/common/index.ts`

## 整理の効果

### 1. 明確な責任分離
- 真の共通機能と機能固有の機能が明確に分離
- 各モジュールの独立性が向上

### 2. 保守性の向上
- 機能固有の変更が他のモジュールに影響しない
- 依存関係が明確化

### 3. 再利用性の向上
- 真の共通機能のみが共通ディレクトリに配置
- 機能固有の実装が適切なモジュールに配置

### 4. テスタビリティの向上
- モジュール単位でのテストが容易
- 依存関係の注入が明確

## 使用ガイドライン

### 共通機能として配置する条件
1. **全モジュール共通**: 3つ以上のモジュールで使用される
2. **基盤機能**: アプリケーションの基本的な動作に必要
3. **汎用性**: 特定の業務ロジックに依存しない

### 機能固有の場合は各モジュールに配置
- 特定のモジュールでのみ使用される機能
- 業務ロジックに密結合した機能
- モジュール固有の設定や制約がある機能

## 今後の開発指針

1. 新しい機能を追加する際は、上記のガイドラインに従って適切な場所に配置
2. 共通機能の追加は慎重に検討し、真に共通である場合のみ実施
3. 定期的に依存関係を見直し、不要な結合を排除
4. モジュール間の通信は明確なインターフェースを通じて実施