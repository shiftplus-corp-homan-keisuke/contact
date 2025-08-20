# 認証・認可システム 手動テストガイド

## 🚀 サーバー起動手順

### 1. 依存関係のインストール
```bash
npm install
```

### 2. データベースの準備
PostgreSQLが起動していることを確認し、データベースを作成：
```sql
CREATE DATABASE inquiry_management;
```

### 3. マイグレーション実行
```bash
npm run migration:run
```

### 4. 開発サーバー起動
```bash
npm run start:dev
```

サーバーが起動すると以下のURLでアクセス可能：
- アプリケーション: http://localhost:3000
- Swagger UI: http://localhost:3000/api/docs
- ヘルスチェック: http://localhost:3000/health

## 🧪 手動テスト手順

### Phase 1: 基本認証テスト

#### 1.1 デフォルト役割の作成
```bash
curl -X POST http://localhost:3000/roles/default \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 1.2 ユーザー登録
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "name": "管理者",
    "password": "AdminPass123!",
    "roleId": "ADMIN_ROLE_ID"
  }'
```

#### 1.3 ログイン
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPass123!"
  }'
```

レスポンス例：
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "管理者",
    "roleId": "role-uuid",
    "permissions": ["system:admin", "user:create", ...]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

#### 1.4 現在のユーザー情報取得
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Phase 2: 権限管理テスト

#### 2.1 役割一覧取得
```bash
curl -X GET http://localhost:3000/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 2.2 新しい役割作成
```bash
curl -X POST http://localhost:3000/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "カスタム役割",
    "description": "テスト用の役割",
    "permissions": ["inquiry:read", "inquiry:create"],
    "sortOrder": 5
  }'
```

#### 2.3 権限チェック
```bash
curl -X POST http://localhost:3000/roles/permissions/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "resource": "inquiry",
    "action": "read"
  }'
```

#### 2.4 ユーザーの権限一覧取得
```bash
curl -X GET http://localhost:3000/roles/permissions/my \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Phase 3: APIキー管理テスト

#### 3.1 APIキー作成
```bash
curl -X POST http://localhost:3000/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "appId": "test-app-uuid",
    "name": "テスト用APIキー",
    "description": "手動テスト用",
    "permissions": ["inquiry:create", "inquiry:read"],
    "rateLimitPerHour": 100,
    "burstLimit": 10
  }'
```

レスポンス例：
```json
{
  "apiKey": {
    "id": "api-key-uuid",
    "name": "テスト用APIキー",
    "permissions": ["inquiry:create", "inquiry:read"],
    "rateLimitPerHour": 100,
    "isActive": true
  },
  "plainKey": "ims_1234567890abcdef..."
}
```

#### 3.2 APIキーでの認証テスト
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "X-API-Key: ims_1234567890abcdef..."
```

#### 3.3 レート制限テスト
短時間で複数回リクエストを送信してレート制限をテスト：
```bash
for i in {1..15}; do
  curl -X GET http://localhost:3000/auth/me \
    -H "X-API-Key: ims_1234567890abcdef..." \
    -w "Request $i: %{http_code}\n"
  sleep 0.1
done
```

#### 3.4 APIキー使用統計取得
```bash
curl -X GET http://localhost:3000/api-keys/API_KEY_ID/usage-stats?days=7 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Phase 4: セキュリティテスト

#### 4.1 無効なトークンでのアクセス
```bash
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer invalid_token"
```

期待結果: 401 Unauthorized

#### 4.2 権限不足でのアクセス
権限のないユーザーで管理者機能にアクセス：
```bash
curl -X DELETE http://localhost:3000/users/USER_ID \
  -H "Authorization: Bearer LIMITED_USER_TOKEN"
```

期待結果: 403 Forbidden

#### 4.3 レート制限違反の検出
```bash
curl -X GET http://localhost:3000/api-keys/violations/detect \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 4.4 疑わしいパターンの検出
```bash
curl -X GET http://localhost:3000/api-keys/patterns/suspicious \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Phase 5: ユーザー管理テスト

#### 5.1 ユーザー一覧取得
```bash
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 5.2 新しいユーザー作成
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "email": "support@example.com",
    "name": "サポート担当者",
    "passwordHash": "$2b$12$hashedpassword...",
    "roleId": "SUPPORT_ROLE_ID",
    "department": "カスタマーサポート"
  }'
```

#### 5.3 ユーザー更新
```bash
curl -X PUT http://localhost:3000/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "更新されたユーザー名",
    "department": "新しい部署"
  }'
```

#### 5.4 ユーザー履歴取得
```bash
curl -X GET http://localhost:3000/users/USER_ID/history \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔍 テスト結果の確認ポイント

### 成功パターン
- ✅ 正しい認証情報でログイン成功
- ✅ 適切な権限でリソースアクセス成功
- ✅ APIキーでの認証成功
- ✅ レート制限内でのリクエスト成功

### エラーパターン
- ❌ 無効な認証情報で401エラー
- ❌ 権限不足で403エラー
- ❌ レート制限超過で429エラー
- ❌ 無効なAPIキーで401エラー

### ログ確認
アプリケーションログで以下を確認：
- 認証試行の記録
- 権限チェックの実行
- レート制限の動作
- セキュリティアラートの発生

## 🛠️ トラブルシューティング

### データベース接続エラー
```bash
# PostgreSQLの起動確認
sudo systemctl status postgresql

# データベース存在確認
psql -U postgres -l
```

### マイグレーションエラー
```bash
# マイグレーション状態確認
npm run typeorm migration:show

# マイグレーション再実行
npm run migration:revert
npm run migration:run
```

### 権限エラー
- デフォルト役割が作成されているか確認
- ユーザーに適切な役割が割り当てられているか確認
- JWTトークンが有効期限内か確認

このガイドに従って段階的にテストを実行することで、認証・認可システムの動作を包括的に確認できます。