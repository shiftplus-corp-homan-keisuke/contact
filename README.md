# 問い合わせ管理システム

複数の自社製アプリケーションに対する問い合わせを統合管理するシステムです。問い合わせの受付から回答、FAQ生成まで一元的に管理し、RAG（Retrieval-Augmented Generation）機能を活用して効率的な問い合わせ対応を実現します。

## 技術スタック

- **フレームワーク**: NestJS + TypeScript
- **データベース**: PostgreSQL + TypeORM
- **キャッシュ**: Redis
- **認証**: JWT + Passport.js
- **API仕様**: OpenAPI 3.0 (Swagger)
- **ログ**: Winston
- **テスト**: Jest
- **コンテナ**: Docker + Docker Compose

## 機能概要

- 問い合わせ登録・管理
- 回答管理と履歴追跡
- ユーザー・権限管理
- ベクトル検索とRAG機能
- FAQ自動生成・公開
- RESTful API
- 通知・アラート機能
- ダッシュボード・分析機能

## セットアップ

### 前提条件

- Node.js 18以上
- PostgreSQL 15以上
- Redis 7以上
- Docker & Docker Compose（オプション）

### 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、適切な値を設定してください。

### 依存関係のインストール

```bash
npm install
```

### データベースの準備

```bash
# PostgreSQLサーバーを起動
# データベースを作成
createdb inquiry_management

# マイグレーションの実行
npm run migration:run
```

### 開発サーバーの起動

```bash
npm run start:dev
```

アプリケーションは `http://localhost:3001` で起動します。
Swagger UI は `http://localhost:3001/api` で確認できます。

## Docker での起動

```bash
# コンテナをビルドして起動
docker-compose up -d

# ログの確認
docker-compose logs -f app
```

## テストの実行

```bash
# ユニットテスト
npm run test

# テストカバレッジ
npm run test:cov

# E2Eテスト
npm run test:e2e
```

## API仕様

起動後、以下のURLでAPI仕様を確認できます：
- Swagger UI: http://localhost:3001/api
- OpenAPI JSON: http://localhost:3001/api-json

## プロジェクト構造

```
src/
├── app.module.ts           # メインアプリケーションモジュール
├── main.ts                 # アプリケーションエントリーポイント
├── config/                 # 設定ファイル
│   ├── database.config.ts  # データベース設定
│   └── logger.config.ts    # ログ設定
├── common/                 # 共通機能
│   ├── decorators/         # カスタムデコレーター
│   ├── dto/               # 共通DTO
│   ├── entities/          # 基底エンティティ
│   ├── filters/           # 例外フィルター
│   ├── interceptors/      # インターセプター
│   ├── utils/             # ユーティリティ
│   └── constants/         # 定数
└── modules/               # 機能モジュール（今後追加）
```

## 開発ガイドライン

### コード品質
- TypeScriptの型安全性を活用
- ESLintとPrettierによるコード整形
- 適切なエラーハンドリング
- 包括的なテストカバレッジ

### API設計
- RESTful APIの原則に従う
- 適切なHTTPステータスコードの使用
- 一貫したレスポンス形式
- OpenAPI仕様による文書化

### セキュリティ
- 入力値の検証とサニタイゼーション
- 認証・認可の適切な実装
- レート制限の実装
- セキュリティヘッダーの設定

## ライセンス

このプロジェクトは非公開です。