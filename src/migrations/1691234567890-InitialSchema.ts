/**
 * 初期スキーママイグレーション
 * 要件: 1.2, 2.1, 4.1 (データベーススキーマのマイグレーション)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1691234567890 implements MigrationInterface {
  name = 'InitialSchema1691234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // UUID拡張の有効化
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 役割テーブル
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "permissions" jsonb NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);

    // ユーザーテーブル
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "role_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // アプリケーションテーブル
    await queryRunner.query(`
      CREATE TABLE "applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_applications" PRIMARY KEY ("id")
      )
    `);

    // 問い合わせテーブル
    await queryRunner.query(`
      CREATE TABLE "inquiries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "app_id" uuid NOT NULL,
        "title" character varying(500) NOT NULL,
        "content" text NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'new',
        "priority" character varying(20) NOT NULL DEFAULT 'medium',
        "category" character varying(100),
        "customer_email" character varying(255),
        "customer_name" character varying(255),
        "assigned_to" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inquiries" PRIMARY KEY ("id")
      )
    `);

    // 回答テーブル
    await queryRunner.query(`
      CREATE TABLE "responses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "inquiry_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "is_public" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_responses" PRIMARY KEY ("id")
      )
    `);

    // FAQテーブル
    await queryRunner.query(`
      CREATE TABLE "faqs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "app_id" uuid NOT NULL,
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "category" character varying(100),
        "tags" text[] NOT NULL DEFAULT '{}',
        "order_index" integer NOT NULL DEFAULT 0,
        "is_published" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_faqs" PRIMARY KEY ("id")
      )
    `);

    // ユーザー履歴テーブル
    await queryRunner.query(`
      CREATE TABLE "user_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "field_name" character varying(100) NOT NULL,
        "old_value" text,
        "new_value" text NOT NULL,
        "changed_by" uuid NOT NULL,
        "changed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_history" PRIMARY KEY ("id")
      )
    `);

    // 問い合わせ状態履歴テーブル
    await queryRunner.query(`
      CREATE TABLE "inquiry_status_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "inquiry_id" uuid NOT NULL,
        "old_status" character varying(50),
        "new_status" character varying(50) NOT NULL,
        "changed_by" uuid NOT NULL,
        "comment" text,
        "changed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inquiry_status_history" PRIMARY KEY ("id")
      )
    `);

    // 回答履歴テーブル
    await queryRunner.query(`
      CREATE TABLE "response_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "response_id" uuid NOT NULL,
        "old_content" text,
        "new_content" text NOT NULL,
        "changed_by" uuid NOT NULL,
        "changed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_response_history" PRIMARY KEY ("id")
      )
    `);

    // APIキーテーブル
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "app_id" uuid NOT NULL,
        "key_hash" character varying(255) NOT NULL,
        "name" character varying(255),
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "rate_limit_per_hour" integer NOT NULL DEFAULT 1000,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP,
        CONSTRAINT "UQ_api_keys_key_hash" UNIQUE ("key_hash"),
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id")
      )
    `);

    // レート制限追跡テーブル
    await queryRunner.query(`
      CREATE TABLE "rate_limit_tracking" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "api_key_id" uuid NOT NULL,
        "request_count" integer NOT NULL DEFAULT 0,
        "window_start" TIMESTAMP NOT NULL,
        "window_end" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rate_limit_tracking" PRIMARY KEY ("id")
      )
    `);

    // 認証試行ログテーブル
    await queryRunner.query(`
      CREATE TABLE "auth_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255),
        "ip_address" inet,
        "user_agent" text,
        "success" boolean NOT NULL,
        "failure_reason" character varying(255),
        "attempted_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_attempts" PRIMARY KEY ("id")
      )
    `);

    // 外部キー制約の追加
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "FK_users_role_id" 
      FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inquiries" 
      ADD CONSTRAINT "FK_inquiries_app_id" 
      FOREIGN KEY ("app_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inquiries" 
      ADD CONSTRAINT "FK_inquiries_assigned_to" 
      FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "responses" 
      ADD CONSTRAINT "FK_responses_inquiry_id" 
      FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "responses" 
      ADD CONSTRAINT "FK_responses_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "faqs" 
      ADD CONSTRAINT "FK_faqs_app_id" 
      FOREIGN KEY ("app_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_history" 
      ADD CONSTRAINT "FK_user_history_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_history" 
      ADD CONSTRAINT "FK_user_history_changed_by" 
      FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inquiry_status_history" 
      ADD CONSTRAINT "FK_inquiry_status_history_inquiry_id" 
      FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inquiry_status_history" 
      ADD CONSTRAINT "FK_inquiry_status_history_changed_by" 
      FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "response_history" 
      ADD CONSTRAINT "FK_response_history_response_id" 
      FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "response_history" 
      ADD CONSTRAINT "FK_response_history_changed_by" 
      FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "api_keys" 
      ADD CONSTRAINT "FK_api_keys_app_id" 
      FOREIGN KEY ("app_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rate_limit_tracking" 
      ADD CONSTRAINT "FK_rate_limit_tracking_api_key_id" 
      FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // インデックスの作成
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role_id" ON "users" ("role_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_inquiries_app_id" ON "inquiries" ("app_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_inquiries_status" ON "inquiries" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_inquiries_assigned_to" ON "inquiries" ("assigned_to")`);
    await queryRunner.query(`CREATE INDEX "IDX_inquiries_created_at" ON "inquiries" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_responses_inquiry_id" ON "responses" ("inquiry_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_responses_user_id" ON "responses" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_faqs_app_id" ON "faqs" ("app_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_faqs_is_published" ON "faqs" ("is_published")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_history_user_id" ON "user_history" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_inquiry_status_history_inquiry_id" ON "inquiry_status_history" ("inquiry_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_response_history_response_id" ON "response_history" ("response_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_app_id" ON "api_keys" ("app_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_api_keys_is_active" ON "api_keys" ("is_active")`);
    await queryRunner.query(`CREATE INDEX "IDX_rate_limit_tracking_api_key_id" ON "rate_limit_tracking" ("api_key_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_auth_attempts_email" ON "auth_attempts" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_auth_attempts_attempted_at" ON "auth_attempts" ("attempted_at")`);

    // 全文検索用のインデックス
    await queryRunner.query(`
      CREATE INDEX "IDX_inquiries_fulltext" ON "inquiries" 
      USING gin(to_tsvector('japanese', title || ' ' || content))
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_responses_fulltext" ON "responses" 
      USING gin(to_tsvector('japanese', content))
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_faqs_fulltext" ON "faqs" 
      USING gin(to_tsvector('japanese', question || ' ' || answer))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 外部キー制約の削除
    await queryRunner.query(`ALTER TABLE "rate_limit_tracking" DROP CONSTRAINT "FK_rate_limit_tracking_api_key_id"`);
    await queryRunner.query(`ALTER TABLE "api_keys" DROP CONSTRAINT "FK_api_keys_app_id"`);
    await queryRunner.query(`ALTER TABLE "response_history" DROP CONSTRAINT "FK_response_history_changed_by"`);
    await queryRunner.query(`ALTER TABLE "response_history" DROP CONSTRAINT "FK_response_history_response_id"`);
    await queryRunner.query(`ALTER TABLE "inquiry_status_history" DROP CONSTRAINT "FK_inquiry_status_history_changed_by"`);
    await queryRunner.query(`ALTER TABLE "inquiry_status_history" DROP CONSTRAINT "FK_inquiry_status_history_inquiry_id"`);
    await queryRunner.query(`ALTER TABLE "user_history" DROP CONSTRAINT "FK_user_history_changed_by"`);
    await queryRunner.query(`ALTER TABLE "user_history" DROP CONSTRAINT "FK_user_history_user_id"`);
    await queryRunner.query(`ALTER TABLE "faqs" DROP CONSTRAINT "FK_faqs_app_id"`);
    await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_responses_user_id"`);
    await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_responses_inquiry_id"`);
    await queryRunner.query(`ALTER TABLE "inquiries" DROP CONSTRAINT "FK_inquiries_assigned_to"`);
    await queryRunner.query(`ALTER TABLE "inquiries" DROP CONSTRAINT "FK_inquiries_app_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_role_id"`);

    // テーブルの削除
    await queryRunner.query(`DROP TABLE "auth_attempts"`);
    await queryRunner.query(`DROP TABLE "rate_limit_tracking"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP TABLE "response_history"`);
    await queryRunner.query(`DROP TABLE "inquiry_status_history"`);
    await queryRunner.query(`DROP TABLE "user_history"`);
    await queryRunner.query(`DROP TABLE "faqs"`);
    await queryRunner.query(`DROP TABLE "responses"`);
    await queryRunner.query(`DROP TABLE "inquiries"`);
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}