/**
 * 初期スキーママイグレーション
 * 全てのテーブルを作成
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1691234567890 implements MigrationInterface {
    name = 'InitialSchema1691234567890';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ロールテーブル
        await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "name" character varying(100) NOT NULL,
        "description" text,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "roles"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "roles"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "roles"."name" IS 'ロール名';
      COMMENT ON COLUMN "roles"."description" IS 'ロールの説明';
      COMMENT ON COLUMN "roles"."permissions" IS '権限リスト（JSON配列）';
      COMMENT ON COLUMN "roles"."isActive" IS 'アクティブフラグ';
    `);

        // ユーザーテーブル
        await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "email" character varying(255) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "roleId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastLoginAt" TIMESTAMP,
        "lastLoginIp" character varying(45),
        "failedLoginAttempts" integer NOT NULL DEFAULT 0,
        "lockedAt" TIMESTAMP,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "users"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "users"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "users"."email" IS 'メールアドレス';
      COMMENT ON COLUMN "users"."passwordHash" IS 'パスワードハッシュ';
      COMMENT ON COLUMN "users"."name" IS 'ユーザー名';
      COMMENT ON COLUMN "users"."roleId" IS 'ロールID';
      COMMENT ON COLUMN "users"."isActive" IS 'アクティブフラグ';
      COMMENT ON COLUMN "users"."lastLoginAt" IS '最終ログイン日時';
      COMMENT ON COLUMN "users"."lastLoginIp" IS '最終ログインIPアドレス';
      COMMENT ON COLUMN "users"."failedLoginAttempts" IS 'ログイン失敗回数';
      COMMENT ON COLUMN "users"."lockedAt" IS 'アカウントロック日時';
    `);

        // ユーザー履歴テーブル
        await queryRunner.query(`
      CREATE TABLE "user_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" uuid NOT NULL,
        "fieldName" character varying(100) NOT NULL,
        "oldValue" text,
        "newValue" text NOT NULL,
        "changedBy" uuid NOT NULL,
        "changedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" character varying(45),
        "comment" text,
        CONSTRAINT "PK_user_history" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "user_history"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "user_history"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "user_history"."userId" IS '対象ユーザーID';
      COMMENT ON COLUMN "user_history"."fieldName" IS '変更されたフィールド名';
      COMMENT ON COLUMN "user_history"."oldValue" IS '変更前の値';
      COMMENT ON COLUMN "user_history"."newValue" IS '変更後の値';
      COMMENT ON COLUMN "user_history"."changedBy" IS '変更実行者ID';
      COMMENT ON COLUMN "user_history"."changedAt" IS '変更日時';
      COMMENT ON COLUMN "user_history"."ipAddress" IS '変更実行IPアドレス';
      COMMENT ON COLUMN "user_history"."comment" IS '変更理由・コメント';
    `);

        // 認証試行ログテーブル
        await queryRunner.query(`
      CREATE TABLE "auth_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "email" character varying(255),
        "ipAddress" inet,
        "userAgent" text,
        "success" boolean NOT NULL,
        "failureReason" character varying(255),
        "attemptedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "authMethod" character varying(100),
        "userId" uuid,
        "sessionId" character varying(255),
        CONSTRAINT "PK_auth_attempts" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "auth_attempts"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "auth_attempts"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "auth_attempts"."email" IS '試行されたメールアドレス';
      COMMENT ON COLUMN "auth_attempts"."ipAddress" IS 'IPアドレス';
      COMMENT ON COLUMN "auth_attempts"."userAgent" IS 'ユーザーエージェント';
      COMMENT ON COLUMN "auth_attempts"."success" IS '認証成功フラグ';
      COMMENT ON COLUMN "auth_attempts"."failureReason" IS '失敗理由';
      COMMENT ON COLUMN "auth_attempts"."attemptedAt" IS '試行日時';
      COMMENT ON COLUMN "auth_attempts"."authMethod" IS '認証方式（password, api_key, jwt）';
      COMMENT ON COLUMN "auth_attempts"."userId" IS '成功時のユーザーID';
      COMMENT ON COLUMN "auth_attempts"."sessionId" IS 'セッションID';
    `);

        // アプリケーションテーブル
        await queryRunner.query(`
      CREATE TABLE "applications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "name" character varying(255) NOT NULL,
        "description" text,
        "apiKey" character varying(255),
        "isActive" boolean NOT NULL DEFAULT true,
        "contactEmail" character varying(255),
        "contactName" character varying(255),
        "settings" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "UQ_applications_name" UNIQUE ("name"),
        CONSTRAINT "UQ_applications_apiKey" UNIQUE ("apiKey"),
        CONSTRAINT "PK_applications" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "applications"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "applications"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "applications"."name" IS 'アプリケーション名';
      COMMENT ON COLUMN "applications"."description" IS 'アプリケーションの説明';
      COMMENT ON COLUMN "applications"."apiKey" IS 'APIキー';
      COMMENT ON COLUMN "applications"."isActive" IS 'アクティブフラグ';
      COMMENT ON COLUMN "applications"."contactEmail" IS '担当者メールアドレス';
      COMMENT ON COLUMN "applications"."contactName" IS '担当者名';
      COMMENT ON COLUMN "applications"."settings" IS 'アプリケーション設定（JSON）';
    `);

        // 問い合わせテーブル
        await queryRunner.query(`
      CREATE TYPE "inquiry_status_enum" AS ENUM('new', 'in_progress', 'pending', 'resolved', 'closed');
      CREATE TYPE "inquiry_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent');
      
      CREATE TABLE "inquiries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "appId" uuid NOT NULL,
        "title" character varying(500) NOT NULL,
        "content" text NOT NULL,
        "status" "inquiry_status_enum" NOT NULL DEFAULT 'new',
        "priority" "inquiry_priority_enum" NOT NULL DEFAULT 'medium',
        "category" character varying(100),
        "customerEmail" character varying(255),
        "customerName" character varying(255),
        "assignedTo" uuid,
        "firstResponseAt" TIMESTAMP,
        "resolvedAt" TIMESTAMP,
        "closedAt" TIMESTAMP,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "tags" jsonb NOT NULL DEFAULT '[]',
        CONSTRAINT "PK_inquiries" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "inquiries"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "inquiries"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "inquiries"."appId" IS '対象アプリケーションID';
      COMMENT ON COLUMN "inquiries"."title" IS '問い合わせタイトル';
      COMMENT ON COLUMN "inquiries"."content" IS '問い合わせ内容';
      COMMENT ON COLUMN "inquiries"."status" IS '問い合わせ状態';
      COMMENT ON COLUMN "inquiries"."priority" IS '優先度';
      COMMENT ON COLUMN "inquiries"."category" IS 'カテゴリ';
      COMMENT ON COLUMN "inquiries"."customerEmail" IS '顧客メールアドレス';
      COMMENT ON COLUMN "inquiries"."customerName" IS '顧客名';
      COMMENT ON COLUMN "inquiries"."assignedTo" IS '担当者ID';
      COMMENT ON COLUMN "inquiries"."firstResponseAt" IS '初回回答日時';
      COMMENT ON COLUMN "inquiries"."resolvedAt" IS '解決日時';
      COMMENT ON COLUMN "inquiries"."closedAt" IS 'クローズ日時';
      COMMENT ON COLUMN "inquiries"."metadata" IS 'メタデータ（JSON）';
      COMMENT ON COLUMN "inquiries"."tags" IS 'タグ（JSON配列）';
    `);

        // 問い合わせ状態履歴テーブル
        await queryRunner.query(`
      CREATE TABLE "inquiry_status_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "inquiryId" uuid NOT NULL,
        "oldStatus" "inquiry_status_enum",
        "newStatus" "inquiry_status_enum" NOT NULL,
        "changedBy" uuid NOT NULL,
        "comment" text,
        "changedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" character varying(45),
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_inquiry_status_history" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "inquiry_status_history"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "inquiry_status_history"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "inquiry_status_history"."inquiryId" IS '問い合わせID';
      COMMENT ON COLUMN "inquiry_status_history"."oldStatus" IS '変更前の状態';
      COMMENT ON COLUMN "inquiry_status_history"."newStatus" IS '変更後の状態';
      COMMENT ON COLUMN "inquiry_status_history"."changedBy" IS '変更実行者ID';
      COMMENT ON COLUMN "inquiry_status_history"."comment" IS '変更理由・コメント';
      COMMENT ON COLUMN "inquiry_status_history"."changedAt" IS '変更日時';
      COMMENT ON COLUMN "inquiry_status_history"."ipAddress" IS '変更実行IPアドレス';
      COMMENT ON COLUMN "inquiry_status_history"."metadata" IS '追加メタデータ（JSON）';
    `);

        // 回答テーブル
        await queryRunner.query(`
      CREATE TABLE "responses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "inquiryId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "content" text NOT NULL,
        "isPublic" boolean NOT NULL DEFAULT false,
        "isInternal" boolean NOT NULL DEFAULT false,
        "responseType" character varying(100),
        "responseTimeMinutes" integer,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "attachmentIds" jsonb NOT NULL DEFAULT '[]',
        CONSTRAINT "PK_responses" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "responses"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "responses"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "responses"."inquiryId" IS '問い合わせID';
      COMMENT ON COLUMN "responses"."userId" IS '回答者ID';
      COMMENT ON COLUMN "responses"."content" IS '回答内容';
      COMMENT ON COLUMN "responses"."isPublic" IS '公開フラグ（FAQなどで公開可能か）';
      COMMENT ON COLUMN "responses"."isInternal" IS '内部メモフラグ';
      COMMENT ON COLUMN "responses"."responseType" IS '回答タイプ（answer, note, escalation）';
      COMMENT ON COLUMN "responses"."responseTimeMinutes" IS '回答時間（分）';
      COMMENT ON COLUMN "responses"."metadata" IS 'メタデータ（JSON）';
      COMMENT ON COLUMN "responses"."attachmentIds" IS '添付ファイルID一覧（JSON配列）';
    `);

        // 回答履歴テーブル
        await queryRunner.query(`
      CREATE TABLE "response_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "responseId" uuid NOT NULL,
        "oldContent" text,
        "newContent" text NOT NULL,
        "changedBy" uuid NOT NULL,
        "changedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" character varying(45),
        "comment" text,
        "changeType" character varying(100),
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_response_history" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "response_history"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "response_history"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "response_history"."responseId" IS '回答ID';
      COMMENT ON COLUMN "response_history"."oldContent" IS '変更前の内容';
      COMMENT ON COLUMN "response_history"."newContent" IS '変更後の内容';
      COMMENT ON COLUMN "response_history"."changedBy" IS '変更実行者ID';
      COMMENT ON COLUMN "response_history"."changedAt" IS '変更日時';
      COMMENT ON COLUMN "response_history"."ipAddress" IS '変更実行IPアドレス';
      COMMENT ON COLUMN "response_history"."comment" IS '変更理由・コメント';
      COMMENT ON COLUMN "response_history"."changeType" IS '変更タイプ（create, update, delete）';
      COMMENT ON COLUMN "response_history"."metadata" IS '変更詳細メタデータ（JSON）';
    `);

        // FAQテーブル
        await queryRunner.query(`
      CREATE TABLE "faqs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "appId" uuid NOT NULL,
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "category" character varying(100),
        "tags" jsonb NOT NULL DEFAULT '[]',
        "orderIndex" integer NOT NULL DEFAULT 0,
        "isPublished" boolean NOT NULL DEFAULT false,
        "viewCount" integer NOT NULL DEFAULT 0,
        "helpfulCount" integer NOT NULL DEFAULT 0,
        "notHelpfulCount" integer NOT NULL DEFAULT 0,
        "lastViewedAt" TIMESTAMP,
        "generationMethod" character varying(100),
        "sourceInquiryId" uuid,
        "confidenceScore" real,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_faqs" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "faqs"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "faqs"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "faqs"."appId" IS '対象アプリケーションID';
      COMMENT ON COLUMN "faqs"."question" IS 'FAQ質問';
      COMMENT ON COLUMN "faqs"."answer" IS 'FAQ回答';
      COMMENT ON COLUMN "faqs"."category" IS 'カテゴリ';
      COMMENT ON COLUMN "faqs"."tags" IS 'タグ（JSON配列）';
      COMMENT ON COLUMN "faqs"."orderIndex" IS '表示順序';
      COMMENT ON COLUMN "faqs"."isPublished" IS '公開フラグ';
      COMMENT ON COLUMN "faqs"."viewCount" IS '閲覧回数';
      COMMENT ON COLUMN "faqs"."helpfulCount" IS '役に立った回数';
      COMMENT ON COLUMN "faqs"."notHelpfulCount" IS '役に立たなかった回数';
      COMMENT ON COLUMN "faqs"."lastViewedAt" IS '最終閲覧日時';
      COMMENT ON COLUMN "faqs"."generationMethod" IS 'FAQ生成方式（manual, auto_generated）';
      COMMENT ON COLUMN "faqs"."sourceInquiryId" IS '元となった問い合わせID（自動生成の場合）';
      COMMENT ON COLUMN "faqs"."confidenceScore" IS '自動生成時の信頼度スコア';
      COMMENT ON COLUMN "faqs"."metadata" IS 'メタデータ（JSON）';
    `);

        // APIキーテーブル
        await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "appId" uuid NOT NULL,
        "keyHash" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "rateLimitPerHour" integer NOT NULL DEFAULT 1000,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastUsedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "lastUsedIp" character varying(45),
        "totalUsageCount" integer NOT NULL DEFAULT 0,
        "settings" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "UQ_api_keys_keyHash" UNIQUE ("keyHash"),
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "api_keys"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "api_keys"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "api_keys"."appId" IS '対象アプリケーションID';
      COMMENT ON COLUMN "api_keys"."keyHash" IS 'APIキーハッシュ';
      COMMENT ON COLUMN "api_keys"."name" IS 'APIキー名';
      COMMENT ON COLUMN "api_keys"."permissions" IS '権限リスト（JSON配列）';
      COMMENT ON COLUMN "api_keys"."rateLimitPerHour" IS '1時間あたりのレート制限';
      COMMENT ON COLUMN "api_keys"."isActive" IS 'アクティブフラグ';
      COMMENT ON COLUMN "api_keys"."lastUsedAt" IS '最終使用日時';
      COMMENT ON COLUMN "api_keys"."expiresAt" IS '有効期限';
      COMMENT ON COLUMN "api_keys"."lastUsedIp" IS '最終使用IPアドレス';
      COMMENT ON COLUMN "api_keys"."totalUsageCount" IS '総使用回数';
      COMMENT ON COLUMN "api_keys"."settings" IS 'APIキー設定（JSON）';
    `);

        // レート制限追跡テーブル
        await queryRunner.query(`
      CREATE TABLE "rate_limit_tracking" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "apiKeyId" uuid NOT NULL,
        "requestCount" integer NOT NULL DEFAULT 0,
        "windowStart" TIMESTAMP NOT NULL,
        "windowEnd" TIMESTAMP NOT NULL,
        "successCount" integer NOT NULL DEFAULT 0,
        "errorCount" integer NOT NULL DEFAULT 0,
        "rateLimitViolations" integer NOT NULL DEFAULT 0,
        "averageResponseTime" real,
        "endpointStats" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_rate_limit_tracking" PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "rate_limit_tracking"."createdAt" IS '作成日時';
      COMMENT ON COLUMN "rate_limit_tracking"."updatedAt" IS '更新日時';
      COMMENT ON COLUMN "rate_limit_tracking"."apiKeyId" IS 'APIキーID';
      COMMENT ON COLUMN "rate_limit_tracking"."requestCount" IS 'リクエスト回数';
      COMMENT ON COLUMN "rate_limit_tracking"."windowStart" IS 'ウィンドウ開始時刻';
      COMMENT ON COLUMN "rate_limit_tracking"."windowEnd" IS 'ウィンドウ終了時刻';
      COMMENT ON COLUMN "rate_limit_tracking"."successCount" IS '成功リクエスト数';
      COMMENT ON COLUMN "rate_limit_tracking"."errorCount" IS 'エラーリクエスト数';
      COMMENT ON COLUMN "rate_limit_tracking"."rateLimitViolations" IS 'レート制限違反回数';
      COMMENT ON COLUMN "rate_limit_tracking"."averageResponseTime" IS '平均レスポンス時間（ミリ秒）';
      COMMENT ON COLUMN "rate_limit_tracking"."endpointStats" IS 'エンドポイント別統計（JSON）';
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "rate_limit_tracking"`);
        await queryRunner.query(`DROP TABLE "api_keys"`);
        await queryRunner.query(`DROP TABLE "faqs"`);
        await queryRunner.query(`DROP TABLE "response_history"`);
        await queryRunner.query(`DROP TABLE "responses"`);
        await queryRunner.query(`DROP TABLE "inquiry_status_history"`);
        await queryRunner.query(`DROP TABLE "inquiries"`);
        await queryRunner.query(`DROP TYPE "inquiry_priority_enum"`);
        await queryRunner.query(`DROP TYPE "inquiry_status_enum"`);
        await queryRunner.query(`DROP TABLE "applications"`);
        await queryRunner.query(`DROP TABLE "auth_attempts"`);
        await queryRunner.query(`DROP TABLE "user_history"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }
}