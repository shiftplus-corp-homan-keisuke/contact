# プロジェクト構造改善ガイド
## 問い合わせ管理システム - NestJSベストプラクティス準拠への移行

---

## 📋 目次

1. [現状分析](#現状分析)
2. [問題点の特定](#問題点の特定)
3. [推奨構造](#推奨構造)
4. [移行戦略](#移行戦略)
5. [段階的実装計画](#段階的実装計画)
6. [具体的移行手順](#具体的移行手順)
7. [品質保証](#品質保証)
8. [期待される効果](#期待される効果)

---

## 🔍 現状分析

### 現在のディレクトリ構造
```
src/
├── app.module.ts
├── app.controller.ts
├── app.service.ts
├── main.ts
├── config/
│   ├── database.config.ts
│   ├── logger.config.ts
│   └── app.config.ts
├── migrations/
└── common/                           ← 問題: ほぼ全機能がここに集約
    ├── controllers/                  # 11個のコントローラー
    │   ├── analytics.controller.ts
    │   ├── auth.controller.ts
    │   ├── faq.controller.ts
    │   ├── inquiry.controller.ts
    │   ├── notification.controller.ts
    │   └── ...
    ├── services/                     # 25個のサービス
    │   ├── auth.service.ts
    │   ├── inquiry.service.ts
    │   ├── vector.service.ts
    │   ├── faq.service.ts
    │   └── ...
    ├── entities/                     # 15個のエンティティ
    │   ├── user.entity.ts
    │   ├── inquiry.entity.ts
    │   ├── faq.entity.ts
    │   └── ...
    ├── modules/                      # 12個のモジュール
    │   ├── auth.module.ts
    │   ├── inquiry.module.ts
    │   └── ...
    ├── dto/                          # 10個のDTO
    ├── guards/                       # 6個のガード
    ├── decorators/                   # 8個のデコレーター
    ├── filters/                      # 1個のフィルター
    ├── interceptors/                 # 2個のインターセプター
    └── __tests__/                    # 30個のテストファイル
```

### 統計情報
- **総ファイル数**: 約120個
- **common配下のファイル数**: 約100個（83%）
- **機能モジュール数**: 8個（認証、問い合わせ、FAQ、通知等）
- **共通機能**: 約20個（ガード、デコレーター、フィルター等）

---

## ⚠️ 問題点の特定

### 1. スケーラビリティの問題
- **現状**: 新機能追加時にcommonディレクトリが無制限に拡大
- **影響**: ファイル検索時間の増加、関連ファイル特定の困難

### 2. 責任境界の曖昧さ
- **現状**: 機能固有のコードと共通コードが混在
- **影響**: コードの責任範囲が不明確、修正時の影響範囲予測困難

### 3. チーム開発効率の低下
- **現状**: 機能別の担当分けが困難
- **影響**: 並行開発時のコンフリクト頻発、レビュー効率の低下

### 4. テスト複雑性の増大
- **現状**: 機能横断的な依存関係が複雑
- **影響**: 単体テスト作成の困難、モック設定の複雑化

### 5. 保守性の低下
- **現状**: 関連ファイルが分散配置
- **影響**: バグ修正時の関連ファイル特定に時間を要する

---

## 🎯 推奨構造

### NestJSベストプラクティス準拠構造
```
src/
├── app.module.ts                     # アプリケーションルートモジュール
├── main.ts                           # アプリケーションエントリーポイント
├── config/                           # アプリケーション設定
│   ├── database.config.ts
│   ├── logger.config.ts
│   ├── redis.config.ts
│   └── app.config.ts
├── database/                         # データベース関連
│   ├── migrations/                   # マイグレーションファイル
│   └── seeds/                        # 初期データ
├── modules/                          # 機能別モジュール
│   ├── auth/                         # 認証・認可機能
│   │   ├── auth.module.ts
│   │   ├── controllers/
│   │   │   └── auth.controller.ts
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── local.strategy.ts
│   │   │   └── api-key.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── local-auth.guard.ts
│   │   ├── dto/
│   │   │   └── auth.dto.ts
│   │   └── __tests__/
│   │       ├── auth.controller.spec.ts
│   │       └── auth.service.spec.ts
│   ├── users/                        # ユーザー管理
│   │   ├── users.module.ts
│   │   ├── controllers/
│   │   │   └── users.controller.ts
│   │   ├── services/
│   │   │   ├── users.service.ts
│   │   │   └── role.service.ts
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   └── user-history.entity.ts
│   │   ├── dto/
│   │   │   └── user.dto.ts
│   │   └── __tests__/
│   ├── inquiries/                    # 問い合わせ管理
│   │   ├── inquiries.module.ts
│   │   ├── controllers/
│   │   │   └── inquiries.controller.ts
│   │   ├── services/
│   │   │   └── inquiries.service.ts
│   │   ├── entities/
│   │   │   ├── inquiry.entity.ts
│   │   │   └── inquiry-status-history.entity.ts
│   │   ├── dto/
│   │   │   └── inquiry.dto.ts
│   │   └── __tests__/
│   ├── responses/                    # 回答管理
│   │   ├── responses.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   └── dto/
│   ├── faqs/                         # FAQ管理
│   │   ├── faqs.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── faq.service.ts
│   │   │   ├── faq-clustering.service.ts
│   │   │   └── faq-site.service.ts
│   │   ├── entities/
│   │   └── dto/
│   ├── search/                       # 検索機能
│   │   ├── search.module.ts
│   │   ├── services/
│   │   │   ├── search.service.ts
│   │   │   ├── vector.service.ts
│   │   │   └── hybrid-search.service.ts
│   │   └── dto/
│   ├── notifications/                # 通知機能
│   │   ├── notifications.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── notification.service.ts
│   │   │   ├── slack-notification.service.ts
│   │   │   └── teams-notification.service.ts
│   │   ├── entities/
│   │   └── gateways/
│   ├── analytics/                    # 分析機能
│   │   ├── analytics.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── analytics.service.ts
│   │   │   └── prediction.service.ts
│   │   └── dto/
│   ├── templates/                    # テンプレート管理
│   │   ├── templates.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── template.service.ts
│   │   │   └── template-suggestion.service.ts
│   │   ├── entities/
│   │   └── dto/
│   └── files/                        # ファイル管理
│       ├── files.module.ts
│       ├── controllers/
│       ├── services/
│       │   ├── file.service.ts
│       │   ├── file-storage.service.ts
│       │   └── file-security.service.ts
│       ├── entities/
│       └── dto/
└── common/                           # 真の共通機能のみ
    ├── guards/                       # 共通ガード
    │   ├── permissions.guard.ts
    │   ├── rate-limit.guard.ts
    │   └── roles.guard.ts
    ├── decorators/                   # 共通デコレーター
    │   ├── current-user.decorator.ts
    │   ├── permissions.decorator.ts
    │   └── public.decorator.ts
    ├── filters/                      # 共通フィルター
    │   └── global-exception.filter.ts
    ├── interceptors/                 # 共通インターセプター
    │   ├── logging.interceptor.ts
    │   └── history-tracking.interceptor.ts
    ├── pipes/                        # 共通パイプ
    ├── utils/                        # ユーティリティ
    ├── constants/                    # 定数
    ├── types/                        # 共通型定義
    └── __tests__/                    # 共通機能テスト
```

---

## 🚀 移行戦略

### 基本方針
1. **段階的移行**: 一度に全てを変更せず、モジュール単位で段階的に実施
2. **機能優先**: ビジネス価値の高い機能から優先的に移行
3. **リスク最小化**: 各段階でテストを実行し、動作確認を徹底
4. **後方互換性**: 移行中も既存機能の動作を保証

### 移行優先順位
1. **認証モジュール** (最重要・他モジュールの基盤)
2. **ユーザー管理モジュール** (認証と密結合)
3. **問い合わせ管理モジュール** (コア機能)
4. **回答管理モジュール** (問い合わせと密結合)
5. **検索モジュール** (複数機能で使用)
6. **FAQモジュール** (独立性が高い)
7. **通知モジュール** (横断的機能)
8. **分析モジュール** (独立性が高い)
9. **テンプレートモジュール** (独立性が高い)
10. **ファイル管理モジュール** (独立性が高い)

---

## 📅 段階的実装計画

### Phase 1: 準備フェーズ (1週間)
**目標**: 移行基盤の整備

#### 1.1 新ディレクトリ構造の作成
```bash
# 基本ディレクトリ構造作成
mkdir -p src/modules/{auth,users,inquiries,responses,faqs,search,notifications,analytics,templates,files}
mkdir -p src/database/{migrations,seeds}

# 各モジュール内の標準ディレクトリ作成
for module in auth users inquiries responses faqs search notifications analytics templates files; do
  mkdir -p src/modules/$module/{controllers,services,entities,dto,__tests__}
done

# 認証モジュール専用ディレクトリ
mkdir -p src/modules/auth/{strategies,guards}

# 通知モジュール専用ディレクトリ
mkdir -p src/modules/notifications/gateways
```

#### 1.2 移行対象ファイルの分析・分類
```bash
# 現在のファイル構成を分析
find src/common -name "*.ts" | sort > current_files.txt

# 機能別分類リストの作成
echo "=== 認証関連 ===" > file_classification.txt
grep -E "(auth|jwt|local|api-key)" current_files.txt >> file_classification.txt

echo "=== ユーザー管理関連 ===" >> file_classification.txt
grep -E "(user|role)" current_files.txt >> file_classification.txt

# 以下、各機能について同様に分類
```

#### 1.3 依存関係マップの作成
```typescript
// dependency-map.ts - 移行計画用の依存関係マップ
export const dependencyMap = {
  auth: ['users'], // 認証はユーザーに依存
  users: [], // ユーザーは独立
  inquiries: ['users', 'auth'], // 問い合わせはユーザーと認証に依存
  responses: ['inquiries', 'users'], // 回答は問い合わせとユーザーに依存
  // ...
};
```

### Phase 2: 認証モジュール移行 (1週間)
**目標**: 認証機能の完全移行

#### 2.1 認証モジュール作成
```typescript
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '1h' },
      }),
    }),
    TypeOrmModule.forFeature([/* 必要なエンティティ */]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    ApiKeyStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard, LocalAuthGuard],
})
export class AuthModule {}
```

#### 2.2 ファイル移行実行
```bash
# コントローラー移行
mv src/common/controllers/auth.controller.ts src/modules/auth/controllers/

# サービス移行
mv src/common/services/auth.service.ts src/modules/auth/services/

# ストラテジー移行
mv src/common/strategies/jwt.strategy.ts src/modules/auth/strategies/
mv src/common/strategies/local.strategy.ts src/modules/auth/strategies/
mv src/common/strategies/api-key.strategy.ts src/modules/auth/strategies/

# ガード移行
mv src/common/guards/jwt-auth.guard.ts src/modules/auth/guards/
mv src/common/guards/local-auth.guard.ts src/modules/auth/guards/

# DTO移行
mv src/common/dto/auth.dto.ts src/modules/auth/dto/

# テスト移行
mv src/common/__tests__/auth* src/modules/auth/__tests__/
```

#### 2.3 インポートパス更新
```bash
# 全ファイルのインポートパスを一括更新
find src -name "*.ts" -exec sed -i 's|../common/services/auth.service|../modules/auth/services/auth.service|g' {} \;
find src -name "*.ts" -exec sed -i 's|../common/guards/jwt-auth.guard|../modules/auth/guards/jwt-auth.guard|g' {} \;
# 他のパスについても同様に更新
```

#### 2.4 テスト実行・確認
```bash
# 認証モジュールのテスト実行
npm test -- --testPathPattern=src/modules/auth

# 全体テスト実行
npm test

# ビルド確認
npm run build
```

### Phase 3: ユーザー管理モジュール移行 (1週間)
**目標**: ユーザー管理機能の完全移行

#### 3.1 ユーザーモジュール作成
```typescript
// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './controllers/users.controller';
import { RoleController } from './controllers/role.controller';
import { UsersService } from './services/users.service';
import { RoleService } from './services/role.service';
import { User } from './entities/user.entity';
import { UserHistory } from './entities/user-history.entity';
import { Role } from './entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserHistory, Role])],
  controllers: [UsersController, RoleController],
  providers: [UsersService, RoleService],
  exports: [UsersService, RoleService],
})
export class UsersModule {}
```

#### 3.2 移行対象ファイル
- `entities/user.entity.ts` → `src/modules/users/entities/`
- `entities/user-history.entity.ts` → `src/modules/users/entities/`
- `entities/role.entity.ts` → `src/modules/users/entities/`
- `services/role.service.ts` → `src/modules/users/services/`
- `controllers/role.controller.ts` → `src/modules/users/controllers/`
- `dto/role.dto.ts` → `src/modules/users/dto/`

### Phase 4: 問い合わせ管理モジュール移行 (1週間)
**目標**: 問い合わせ管理機能の完全移行

#### 4.1 問い合わせモジュール作成
```typescript
// src/modules/inquiries/inquiries.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InquiriesController } from './controllers/inquiries.controller';
import { InquiriesService } from './services/inquiries.service';
import { Inquiry } from './entities/inquiry.entity';
import { InquiryStatusHistory } from './entities/inquiry-status-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry, InquiryStatusHistory])],
  controllers: [InquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService],
})
export class InquiriesModule {}
```

### Phase 5-10: 残りモジュール移行 (各1週間)
各モジュールについて Phase 2-4 と同様の手順で移行

### Phase 11: 共通機能整理 (1週間)
**目標**: 真の共通機能の特定と整理

#### 11.1 共通機能の特定
```typescript
// 真の共通機能（src/common/ に残すもの）
const trueCommonFiles = [
  'guards/permissions.guard.ts',      // 全モジュールで使用
  'guards/rate-limit.guard.ts',       // 全APIで使用
  'guards/roles.guard.ts',            // 全モジュールで使用
  'decorators/current-user.decorator.ts', // 全コントローラーで使用
  'decorators/permissions.decorator.ts',  // 全コントローラーで使用
  'decorators/public.decorator.ts',       // 全コントローラーで使用
  'filters/global-exception.filter.ts',  // グローバル設定
  'interceptors/logging.interceptor.ts',  // グローバル設定
  'utils/',                               // 全モジュールで使用
  'constants/',                           // 全モジュールで使用
  'types/',                              // 全モジュールで使用
];
```

#### 11.2 機能固有ガードの移行
```bash
# APIキー認証ガードを認証モジュールに移行
mv src/common/guards/api-key-auth.guard.ts src/modules/auth/guards/
```

### Phase 12: 最終統合・テスト (1週間)
**目標**: 全体統合とテスト完了

#### 12.1 app.module.ts の更新
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// 機能モジュール
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { FaqsModule } from './modules/faqs/faqs.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { FilesModule } from './modules/files/files.module';

// 設定
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    // 基本設定
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => databaseConfig,
    }),
    
    // 機能モジュール
    AuthModule,
    UsersModule,
    InquiriesModule,
    ResponsesModule,
    FaqsModule,
    SearchModule,
    NotificationsModule,
    AnalyticsModule,
    TemplatesModule,
    FilesModule,
  ],
})
export class AppModule {}
```

#### 12.2 最終テスト実行
```bash
# 全テスト実行
npm test

# E2Eテスト実行
npm run test:e2e

# ビルドテスト
npm run build

# 起動テスト
npm run start:dev
```

---

## 🔧 具体的移行手順

### 各モジュール移行の標準手順

#### Step 1: モジュール作成
```bash
# モジュールディレクトリ作成
mkdir -p src/modules/{module_name}/{controllers,services,entities,dto,__tests__}

# モジュールファイル作成
touch src/modules/{module_name}/{module_name}.module.ts
```

#### Step 2: ファイル移行
```bash
# 関連ファイルの特定
grep -r "ModuleName" src/common/ --include="*.ts"

# ファイル移行実行
mv src/common/controllers/{module}.controller.ts src/modules/{module_name}/controllers/
mv src/common/services/{module}.service.ts src/modules/{module_name}/services/
mv src/common/entities/{module}.entity.ts src/modules/{module_name}/entities/
mv src/common/dto/{module}.dto.ts src/modules/{module_name}/dto/
```

#### Step 3: インポートパス更新
```bash
# 自動更新スクリプト実行
./scripts/update-import-paths.sh {module_name}
```

#### Step 4: モジュール定義更新
```typescript
// src/modules/{module_name}/{module_name}.module.ts
import { Module } from '@nestjs/common';
// 必要なインポートを追加

@Module({
  imports: [/* 依存モジュール */],
  controllers: [/* コントローラー */],
  providers: [/* サービス */],
  exports: [/* エクスポートするサービス */],
})
export class ModuleNameModule {}
```

#### Step 5: テスト実行
```bash
# モジュール単体テスト
npm test -- --testPathPattern=src/modules/{module_name}

# 統合テスト
npm test
```

### 自動化スクリプト

#### インポートパス更新スクリプト
```bash
#!/bin/bash
# scripts/update-import-paths.sh

MODULE_NAME=$1
OLD_PATH="../common"
NEW_PATH="../modules/$MODULE_NAME"

echo "Updating import paths for $MODULE_NAME module..."

# 全TypeScriptファイルでインポートパスを更新
find src -name "*.ts" -exec sed -i "s|$OLD_PATH/controllers/$MODULE_NAME.controller|$NEW_PATH/controllers/$MODULE_NAME.controller|g" {} \;
find src -name "*.ts" -exec sed -i "s|$OLD_PATH/services/$MODULE_NAME.service|$NEW_PATH/services/$MODULE_NAME.service|g" {} \;
find src -name "*.ts" -exec sed -i "s|$OLD_PATH/entities/$MODULE_NAME.entity|$NEW_PATH/entities/$MODULE_NAME.entity|g" {} \;
find src -name "*.ts" -exec sed -i "s|$OLD_PATH/dto/$MODULE_NAME.dto|$NEW_PATH/dto/$MODULE_NAME.dto|g" {} \;

echo "Import paths updated successfully!"
```

#### 移行検証スクリプト
```bash
#!/bin/bash
# scripts/verify-migration.sh

MODULE_NAME=$1

echo "Verifying migration for $MODULE_NAME module..."

# 必要なファイルの存在確認
if [ -f "src/modules/$MODULE_NAME/$MODULE_NAME.module.ts" ]; then
  echo "✓ Module file exists"
else
  echo "✗ Module file missing"
  exit 1
fi

# テスト実行
npm test -- --testPathPattern=src/modules/$MODULE_NAME --silent
if [ $? -eq 0 ]; then
  echo "✓ Tests passed"
else
  echo "✗ Tests failed"
  exit 1
fi

# ビルド確認
npm run build --silent
if [ $? -eq 0 ]; then
  echo "✓ Build successful"
else
  echo "✗ Build failed"
  exit 1
fi

echo "Migration verification completed successfully!"
```

---

## 🧪 品質保証

### テスト戦略

#### 1. 移行前テスト
```bash
# 現在の全テスト実行（ベースライン確立）
npm test -- --coverage
npm run test:e2e

# 結果をベースラインとして保存
cp coverage/lcov-report/index.html baseline-coverage.html
```

#### 2. 移行中テスト
```bash
# 各モジュール移行後のテスト
npm test -- --testPathPattern=src/modules/{module_name}
npm test # 全体テスト

# カバレッジ確認
npm test -- --coverage --testPathPattern=src/modules/{module_name}
```

#### 3. 移行後テスト
```bash
# 最終統合テスト
npm test -- --coverage
npm run test:e2e

# パフォーマンステスト
npm run test:performance

# セキュリティテスト
npm audit
npm run test:security
```

### 品質チェックリスト

#### 各モジュール移行時
- [ ] ファイルが正しいディレクトリに配置されている
- [ ] インポートパスが正しく更新されている
- [ ] モジュール定義が適切に作成されている
- [ ] 単体テストが通る
- [ ] 統合テストが通る
- [ ] ビルドが成功する
- [ ] TypeScriptエラーがない
- [ ] ESLintエラーがない

#### 最終確認
- [ ] 全テストが通る
- [ ] E2Eテストが通る
- [ ] カバレッジが維持されている
- [ ] パフォーマンスが劣化していない
- [ ] セキュリティ脆弱性がない
- [ ] ドキュメントが更新されている

---

## 📈 期待される効果

### 1. 保守性の向上
**Before**: 関連ファイルがcommonディレクトリに分散
```
問い合わせ機能の修正時に確認が必要なファイル:
- src/common/controllers/inquiry.controller.ts
- src/common/services/inquiry.service.ts
- src/common/entities/inquiry.entity.ts
- src/common/dto/inquiry.dto.ts
- src/common/__tests__/inquiry.service.spec.ts
```

**After**: 関連ファイルが機能別に集約
```
問い