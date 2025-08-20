/**
 * 初期データ投入マイグレーション
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedInitialData1691234567892 implements MigrationInterface {
    name = 'SeedInitialData1691234567892';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 基本ロールの作成
        await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "description", "permissions", "isActive") VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'admin', 'システム管理者', 
       '["user:create", "user:read", "user:update", "user:delete", "inquiry:create", "inquiry:read", "inquiry:update", "inquiry:delete", "response:create", "response:read", "response:update", "response:delete", "faq:create", "faq:read", "faq:update", "faq:delete", "app:create", "app:read", "app:update", "app:delete", "api_key:create", "api_key:read", "api_key:update", "api_key:delete", "analytics:read", "system:admin"]', 
       true),
      ('550e8400-e29b-41d4-a716-446655440002', 'support', 'サポート担当者', 
       '["inquiry:create", "inquiry:read", "inquiry:update", "response:create", "response:read", "response:update", "faq:create", "faq:read", "faq:update", "analytics:read"]', 
       true),
      ('550e8400-e29b-41d4-a716-446655440003', 'viewer', '閲覧者', 
       '["inquiry:read", "response:read", "faq:read", "analytics:read"]', 
       true),
      ('550e8400-e29b-41d4-a716-446655440004', 'api_user', 'API利用者', 
       '["inquiry:create", "inquiry:read", "faq:read"]', 
       true)
    `);

        // 管理者ユーザーの作成（パスワード: admin123）
        await queryRunner.query(`
      INSERT INTO "users" ("id", "email", "passwordHash", "name", "roleId", "isActive") VALUES
      ('550e8400-e29b-41d4-a716-446655440010', 'admin@example.com', 
       '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 
       'システム管理者', '550e8400-e29b-41d4-a716-446655440001', true),
      ('550e8400-e29b-41d4-a716-446655440011', 'support@example.com', 
       '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 
       'サポート担当者', '550e8400-e29b-41d4-a716-446655440002', true)
    `);

        // サンプルアプリケーションの作成
        await queryRunner.query(`
      INSERT INTO "applications" ("id", "name", "description", "apiKey", "isActive", "contactEmail", "contactName") VALUES
      ('550e8400-e29b-41d4-a716-446655440020', 'Sample App 1', 'サンプルアプリケーション1', 
       'sk_test_1234567890abcdef', true, 'app1@example.com', 'アプリ1担当者'),
      ('550e8400-e29b-41d4-a716-446655440021', 'Sample App 2', 'サンプルアプリケーション2', 
       'sk_test_abcdef1234567890', true, 'app2@example.com', 'アプリ2担当者')
    `);

        // サンプル問い合わせの作成
        await queryRunner.query(`
      INSERT INTO "inquiries" ("id", "appId", "title", "content", "status", "priority", "category", "customerEmail", "customerName") VALUES
      ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440020', 
       'ログインできない問題', 'ログイン画面でメールアドレスとパスワードを入力してもログインできません。', 
       'new', 'medium', '技術的問題', 'customer1@example.com', '顧客1'),
      ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440020', 
       'データが表示されない', 'ダッシュボードにデータが表示されません。昨日まで正常に動作していました。', 
       'in_progress', 'high', 'バグ報告', 'customer2@example.com', '顧客2'),
      ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440021', 
       '新機能の使い方', '新しく追加された機能の使い方を教えてください。', 
       'resolved', 'low', '使い方', 'customer3@example.com', '顧客3')
    `);

        // サンプル回答の作成
        await queryRunner.query(`
      INSERT INTO "responses" ("id", "inquiryId", "userId", "content", "isPublic") VALUES
      ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440031', 
       '550e8400-e29b-41d4-a716-446655440011', 
       'ご報告いただきありがとうございます。データ表示の問題について調査いたします。一時的な解決策として、ブラウザのキャッシュをクリアしてから再度アクセスしてみてください。', 
       true),
      ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440032', 
       '550e8400-e29b-41d4-a716-446655440011', 
       '新機能の使い方について説明いたします。まず、メニューから「新機能」を選択し、画面の指示に従って設定を行ってください。詳細なマニュアルもご用意しておりますので、必要でしたらお知らせください。', 
       true)
    `);

        // サンプルFAQの作成
        await queryRunner.query(`
      INSERT INTO "faqs" ("id", "appId", "question", "answer", "category", "isPublished", "orderIndex") VALUES
      ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440020', 
       'パスワードを忘れた場合はどうすればよいですか？', 
       'ログイン画面の「パスワードを忘れた方」リンクをクリックし、登録されているメールアドレスを入力してください。パスワードリセット用のメールが送信されます。', 
       'アカウント', true, 1),
      ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440020', 
       'データのバックアップはどのように行いますか？', 
       '設定メニューから「データエクスポート」を選択し、必要なデータ範囲を指定してエクスポートしてください。定期的なバックアップも設定可能です。', 
       'データ管理', true, 2),
      ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440021', 
       'サポートの営業時間を教えてください。', 
       'サポートの営業時間は平日9:00-18:00です。緊急時は24時間対応のメールサポートをご利用ください。', 
       'サポート', true, 1)
    `);

        // APIキーの作成
        await queryRunner.query(`
      INSERT INTO "api_keys" ("id", "appId", "keyHash", "name", "permissions", "rateLimitPerHour", "isActive") VALUES
      ('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440020', 
       '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 
       'App1 Production Key', '["inquiry:create", "inquiry:read", "faq:read"]', 1000, true),
      ('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440021', 
       '$2b$10$sOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 
       'App2 Production Key', '["inquiry:create", "inquiry:read", "faq:read"]', 500, true)
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // データの削除（外部キー制約により順序が重要）
        await queryRunner.query(`DELETE FROM "api_keys"`);
        await queryRunner.query(`DELETE FROM "faqs"`);
        await queryRunner.query(`DELETE FROM "responses"`);
        await queryRunner.query(`DELETE FROM "inquiries"`);
        await queryRunner.query(`DELETE FROM "applications"`);
        await queryRunner.query(`DELETE FROM "users"`);
        await queryRunner.query(`DELETE FROM "roles"`);
    }
}