/**
 * 初期データシードマイグレーション
 * 要件: 5.1, 5.2, 5.3, 5.4 (権限管理機能の初期設定)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import { ResourceType, ActionType } from '../common/types/role.types';

export class SeedInitialData1691234567891 implements MigrationInterface {
  name = 'SeedInitialData1691234567891';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 初期役割の作成
    const adminPermissions = [
      { resource: ResourceType.INQUIRY, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE, ActionType.ASSIGN] },
      { resource: ResourceType.RESPONSE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.FAQ, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE, ActionType.PUBLISH] },
      { resource: ResourceType.USER, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.ROLE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.APPLICATION, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.ANALYTICS, actions: [ActionType.READ, ActionType.EXPORT] },
      { resource: ResourceType.TEMPLATE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.DELETE] },
      { resource: ResourceType.FILE, actions: [ActionType.CREATE, ActionType.READ, ActionType.DELETE] }
    ];

    const supportStaffPermissions = [
      { resource: ResourceType.INQUIRY, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE, ActionType.ASSIGN] },
      { resource: ResourceType.RESPONSE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE] },
      { resource: ResourceType.FAQ, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE] },
      { resource: ResourceType.ANALYTICS, actions: [ActionType.READ] },
      { resource: ResourceType.TEMPLATE, actions: [ActionType.CREATE, ActionType.READ, ActionType.UPDATE] },
      { resource: ResourceType.FILE, actions: [ActionType.CREATE, ActionType.READ] }
    ];

    const viewerPermissions = [
      { resource: ResourceType.INQUIRY, actions: [ActionType.READ] },
      { resource: ResourceType.RESPONSE, actions: [ActionType.READ] },
      { resource: ResourceType.FAQ, actions: [ActionType.READ] },
      { resource: ResourceType.ANALYTICS, actions: [ActionType.READ] }
    ];

    const apiUserPermissions = [
      { resource: ResourceType.INQUIRY, actions: [ActionType.CREATE, ActionType.READ] },
      { resource: ResourceType.FAQ, actions: [ActionType.READ] }
    ];

    // 役割の挿入
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name", "description", "permissions") VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'admin', '管理者 - 全機能へのアクセス権限', $1),
      ('550e8400-e29b-41d4-a716-446655440002', 'support_staff', 'サポート担当者 - 問い合わせ対応権限', $2),
      ('550e8400-e29b-41d4-a716-446655440003', 'viewer', '閲覧者 - 読み取り専用権限', $3),
      ('550e8400-e29b-41d4-a716-446655440004', 'api_user', 'API利用者 - API経由での問い合わせ登録権限', $4)
    `, [
      JSON.stringify(adminPermissions),
      JSON.stringify(supportStaffPermissions),
      JSON.stringify(viewerPermissions),
      JSON.stringify(apiUserPermissions)
    ]);

    // 初期管理者ユーザーの作成（パスワード: Admin123!）
    await queryRunner.query(`
      INSERT INTO "users" ("id", "email", "password_hash", "name", "role_id") VALUES
      ('550e8400-e29b-41d4-a716-446655440010', 'admin@example.com', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', 'システム管理者', '550e8400-e29b-41d4-a716-446655440001')
    `);

    // サンプルアプリケーションの作成
    await queryRunner.query(`
      INSERT INTO "applications" ("id", "name", "description") VALUES
      ('550e8400-e29b-41d4-a716-446655440020', 'モバイルアプリ', 'iOS/Androidモバイルアプリケーション'),
      ('550e8400-e29b-41d4-a716-446655440021', 'Webアプリ', 'Webブラウザ向けアプリケーション'),
      ('550e8400-e29b-41d4-a716-446655440022', 'デスクトップアプリ', 'Windows/Mac/Linux向けデスクトップアプリケーション')
    `);

    // サンプルAPIキーの作成
    await queryRunner.query(`
      INSERT INTO "api_keys" ("id", "app_id", "key_hash", "name", "permissions") VALUES
      ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440020', '$2b$10$samplehashforsampleapikey1234567890', 'モバイルアプリ用APIキー', $1),
      ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440021', '$2b$10$samplehashforsampleapikey1234567891', 'Webアプリ用APIキー', $2)
    `, [
      JSON.stringify(['inquiry:create', 'inquiry:read', 'faq:read']),
      JSON.stringify(['inquiry:create', 'inquiry:read', 'faq:read'])
    ]);

    // サンプルFAQの作成
    await queryRunner.query(`
      INSERT INTO "faqs" ("id", "app_id", "question", "answer", "category", "tags", "is_published") VALUES
      ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440020', 'アプリがクラッシュします', 'アプリを最新版にアップデートしてください。それでも解決しない場合は、アプリを一度削除して再インストールしてください。', '技術的問題', ARRAY['クラッシュ', 'エラー', 'アップデート'], true),
      ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440020', 'ログインできません', 'パスワードを忘れた場合は、ログイン画面の「パスワードを忘れた方」をタップして、パスワードリセットを行ってください。', 'アカウント', ARRAY['ログイン', 'パスワード', 'アカウント'], true),
      ('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440021', 'データが同期されません', 'インターネット接続を確認してください。Wi-Fi環境で再度同期を試してください。', '同期', ARRAY['同期', 'データ', 'ネットワーク'], true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // サンプルデータの削除
    await queryRunner.query(`DELETE FROM "faqs" WHERE "id" IN ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440042')`);
    await queryRunner.query(`DELETE FROM "api_keys" WHERE "id" IN ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440031')`);
    await queryRunner.query(`DELETE FROM "applications" WHERE "id" IN ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440022')`);
    await queryRunner.query(`DELETE FROM "users" WHERE "id" = '550e8400-e29b-41d4-a716-446655440010'`);
    await queryRunner.query(`DELETE FROM "roles" WHERE "id" IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004')`);
  }
}