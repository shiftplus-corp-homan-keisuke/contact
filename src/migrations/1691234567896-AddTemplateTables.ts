/**
 * テンプレート関連テーブル作成マイグレーション
 * 要件: 10.1, 10.2, 10.3 (テンプレート管理システム)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateTables1691234567896 implements MigrationInterface {
  name = 'AddTemplateTables1691234567896';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // テンプレートテーブル作成
    await queryRunner.query(`
      CREATE TABLE "templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "content" text NOT NULL,
        "category" character varying(100),
        "description" text,
        "app_id" uuid,
        "created_by" uuid NOT NULL,
        "is_shared" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "usage_count" integer NOT NULL DEFAULT 0,
        "effectiveness_score" numeric(5,2),
        "tags" text,
        "last_used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_templates" PRIMARY KEY ("id")
      )
    `);

    // テンプレート変数テーブル作成
    await queryRunner.query(`
      CREATE TABLE "template_variables" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "type" character varying(50) NOT NULL,
        "description" character varying(255),
        "default_value" text,
        "is_required" boolean NOT NULL DEFAULT false,
        "options" json,
        "validation_rules" json,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_variables" PRIMARY KEY ("id")
      )
    `);

    // テンプレート使用履歴テーブル作成
    await queryRunner.query(`
      CREATE TABLE "template_usage" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "template_id" uuid NOT NULL,
        "used_by" uuid NOT NULL,
        "inquiry_id" uuid,
        "response_id" uuid,
        "usage_context" character varying(50) NOT NULL,
        "variables_used" json,
        "generated_content" text,
        "effectiveness_rating" integer,
        "feedback_comment" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_usage" PRIMARY KEY ("id")
      )
    `);

    // インデックス作成
    await queryRunner.query(`
      CREATE INDEX "IDX_templates_app_id_category" ON "templates" ("app_id", "category")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_templates_created_by" ON "templates" ("created_by")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_templates_is_shared_is_active" ON "templates" ("is_shared", "is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_template_variables_template_id" ON "template_variables" ("template_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_template_usage_template_id_created_at" ON "template_usage" ("template_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_template_usage_used_by" ON "template_usage" ("used_by")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_template_usage_inquiry_id" ON "template_usage" ("inquiry_id")
    `);

    // 外部キー制約追加
    await queryRunner.query(`
      ALTER TABLE "templates" 
      ADD CONSTRAINT "FK_templates_app_id" 
      FOREIGN KEY ("app_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "templates" 
      ADD CONSTRAINT "FK_templates_created_by" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "template_variables" 
      ADD CONSTRAINT "FK_template_variables_template_id" 
      FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "template_usage" 
      ADD CONSTRAINT "FK_template_usage_template_id" 
      FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "template_usage" 
      ADD CONSTRAINT "FK_template_usage_used_by" 
      FOREIGN KEY ("used_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "template_usage" 
      ADD CONSTRAINT "FK_template_usage_inquiry_id" 
      FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "template_usage" 
      ADD CONSTRAINT "FK_template_usage_response_id" 
      FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // 効果評価の制約追加
    await queryRunner.query(`
      ALTER TABLE "template_usage" 
      ADD CONSTRAINT "CHK_template_usage_effectiveness_rating" 
      CHECK ("effectiveness_rating" IS NULL OR ("effectiveness_rating" >= 1 AND "effectiveness_rating" <= 5))
    `);

    // 効果スコアの制約追加
    await queryRunner.query(`
      ALTER TABLE "templates" 
      ADD CONSTRAINT "CHK_templates_effectiveness_score" 
      CHECK ("effectiveness_score" IS NULL OR ("effectiveness_score" >= 0 AND "effectiveness_score" <= 5))
    `);

    // 全文検索インデックス作成
    await queryRunner.query(`
      CREATE INDEX "IDX_templates_fulltext" ON "templates" 
      USING gin(to_tsvector('japanese', "name" || ' ' || "content" || ' ' || COALESCE("description", '')))
    `);

    // 初期データ挿入（サンプルテンプレート）
    await queryRunner.query(`
      INSERT INTO "templates" ("name", "content", "category", "description", "created_by", "is_shared", "tags")
      SELECT 
        '問い合わせ受付確認',
        'お問い合わせいただき、ありがとうございます。\n\n{{customer_name}}様\n\nお問い合わせ内容：{{inquiry_title}}\n受付番号：{{inquiry_id}}\n\n担当者より{{response_time}}以内にご連絡いたします。\n\nよろしくお願いいたします。',
        '自動返信',
        '問い合わせ受付時の自動返信テンプレート',
        u.id,
        true,
        'auto_reply,confirmation'
      FROM "users" u 
      JOIN "roles" r ON u.role_id = r.id 
      WHERE r.name = 'admin' 
      LIMIT 1
    `);

    await queryRunner.query(`
      INSERT INTO "templates" ("name", "content", "category", "description", "created_by", "is_shared", "tags")
      SELECT 
        '技術的問題の回答',
        '{{customer_name}}様\n\nお問い合わせいただいた件について回答いたします。\n\n【問題】\n{{problem_description}}\n\n【解決方法】\n{{solution_steps}}\n\n【参考資料】\n{{reference_links}}\n\nご不明な点がございましたら、お気軽にお問い合わせください。',
        '技術サポート',
        '技術的な問題に対する回答テンプレート',
        u.id,
        true,
        'technical,support,solution'
      FROM "users" u 
      JOIN "roles" r ON u.role_id = r.id 
      WHERE r.name = 'admin' 
      LIMIT 1
    `);

    await queryRunner.query(`
      INSERT INTO "templates" ("name", "content", "category", "description", "created_by", "is_shared", "tags")
      SELECT 
        'アカウント関連の案内',
        '{{customer_name}}様\n\nアカウントに関するお問い合わせをいただき、ありがとうございます。\n\n{{account_issue_type}}の件について、以下の手順で解決できます：\n\n1. {{step_1}}\n2. {{step_2}}\n3. {{step_3}}\n\n上記手順でも解決しない場合は、{{contact_method}}までご連絡ください。\n\nサポートチーム',
        'アカウント',
        'アカウント関連の問い合わせ回答テンプレート',
        u.id,
        true,
        'account,login,password'
      FROM "users" u 
      JOIN "roles" r ON u.role_id = r.id 
      WHERE r.name = 'admin' 
      LIMIT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 外部キー制約削除
    await queryRunner.query(`ALTER TABLE "template_usage" DROP CONSTRAINT "FK_template_usage_response_id"`);
    await queryRunner.query(`ALTER TABLE "template_usage" DROP CONSTRAINT "FK_template_usage_inquiry_id"`);
    await queryRunner.query(`ALTER TABLE "template_usage" DROP CONSTRAINT "FK_template_usage_used_by"`);
    await queryRunner.query(`ALTER TABLE "template_usage" DROP CONSTRAINT "FK_template_usage_template_id"`);
    await queryRunner.query(`ALTER TABLE "template_variables" DROP CONSTRAINT "FK_template_variables_template_id"`);
    await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_templates_created_by"`);
    await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_templates_app_id"`);

    // インデックス削除
    await queryRunner.query(`DROP INDEX "IDX_templates_fulltext"`);
    await queryRunner.query(`DROP INDEX "IDX_template_usage_inquiry_id"`);
    await queryRunner.query(`DROP INDEX "IDX_template_usage_used_by"`);
    await queryRunner.query(`DROP INDEX "IDX_template_usage_template_id_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_template_variables_template_id"`);
    await queryRunner.query(`DROP INDEX "IDX_templates_is_shared_is_active"`);
    await queryRunner.query(`DROP INDEX "IDX_templates_created_by"`);
    await queryRunner.query(`DROP INDEX "IDX_templates_app_id_category"`);

    // テーブル削除
    await queryRunner.query(`DROP TABLE "template_usage"`);
    await queryRunner.query(`DROP TABLE "template_variables"`);
    await queryRunner.query(`DROP TABLE "templates"`);
  }
}