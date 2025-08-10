import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTables1691234567894 implements MigrationInterface {
  name = 'AddNotificationTables1691234567894';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 通知ルールテーブル
    await queryRunner.query(`
      CREATE TABLE "notification_rules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "trigger" character varying(100) NOT NULL,
        "conditions" jsonb NOT NULL,
        "actions" jsonb NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_rules" PRIMARY KEY ("id")
      )
    `);

    // 通知ログテーブル
    await queryRunner.query(`
      CREATE TABLE "notification_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" character varying(50) NOT NULL,
        "recipients" text array NOT NULL,
        "subject" character varying(500) NOT NULL,
        "content" text NOT NULL,
        "priority" character varying(20) NOT NULL,
        "status" character varying(50) NOT NULL,
        "metadata" jsonb,
        "errorMessage" text,
        "userId" uuid,
        "inquiryId" uuid,
        "ruleId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "sentAt" TIMESTAMP,
        CONSTRAINT "PK_notification_logs" PRIMARY KEY ("id")
      )
    `);

    // ユーザー通知設定テーブル
    await queryRunner.query(`
      CREATE TABLE "user_notification_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "emailEnabled" boolean NOT NULL DEFAULT true,
        "slackEnabled" boolean NOT NULL DEFAULT false,
        "teamsEnabled" boolean NOT NULL DEFAULT false,
        "websocketEnabled" boolean NOT NULL DEFAULT true,
        "slackUserId" character varying(255),
        "teamsUserId" character varying(255),
        "preferences" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_notification_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_notification_settings_userId" UNIQUE ("userId")
      )
    `);

    // 外部キー制約を追加
    await queryRunner.query(`
      ALTER TABLE "notification_rules" 
      ADD CONSTRAINT "FK_notification_rules_createdBy" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_logs" 
      ADD CONSTRAINT "FK_notification_logs_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_logs" 
      ADD CONSTRAINT "FK_notification_logs_inquiryId" 
      FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_logs" 
      ADD CONSTRAINT "FK_notification_logs_ruleId" 
      FOREIGN KEY ("ruleId") REFERENCES "notification_rules"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_notification_settings" 
      ADD CONSTRAINT "FK_user_notification_settings_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // インデックスを作成
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_rules_trigger" ON "notification_rules" ("trigger")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notification_rules_isActive" ON "notification_rules" ("isActive")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notification_logs_type" ON "notification_logs" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notification_logs_status" ON "notification_logs" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notification_logs_createdAt" ON "notification_logs" ("createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notification_logs_inquiryId" ON "notification_logs" ("inquiryId")
    `);

    // デフォルトの通知ルールを挿入
    await queryRunner.query(`
      INSERT INTO "notification_rules" ("name", "trigger", "conditions", "actions", "isActive") VALUES
      (
        '新規問い合わせ通知',
        'inquiry_created',
        '{"priorities": ["high", "urgent"]}',
        '{
          "notifications": [
            {
              "type": "websocket",
              "recipients": ["admins"],
              "subject": "新しい問い合わせが作成されました",
              "content": "{{inquiry.title}} - 優先度: {{inquiry.priority}}",
              "priority": "medium"
            }
          ]
        }',
        true
      ),
      (
        'SLA違反アラート',
        'sla_violation',
        '{}',
        '{
          "notifications": [
            {
              "type": "websocket",
              "recipients": ["admins", "managers"],
              "subject": "SLA違反が発生しました",
              "content": "{{inquiry.title}} でSLA違反が発生しました ({{violationType}})",
              "priority": "urgent"
            }
          ]
        }',
        true
      ),
      (
        'エスカレーション通知',
        'escalation',
        '{}',
        '{
          "notifications": [
            {
              "type": "websocket",
              "recipients": ["admins", "managers"],
              "subject": "問い合わせがエスカレーションされました",
              "content": "{{inquiry.title}} がエスカレーションされました ({{reason}})",
              "priority": "high"
            }
          ]
        }',
        true
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 外部キー制約を削除
    await queryRunner.query(`ALTER TABLE "user_notification_settings" DROP CONSTRAINT "FK_user_notification_settings_userId"`);
    await queryRunner.query(`ALTER TABLE "notification_logs" DROP CONSTRAINT "FK_notification_logs_ruleId"`);
    await queryRunner.query(`ALTER TABLE "notification_logs" DROP CONSTRAINT "FK_notification_logs_inquiryId"`);
    await queryRunner.query(`ALTER TABLE "notification_logs" DROP CONSTRAINT "FK_notification_logs_userId"`);
    await queryRunner.query(`ALTER TABLE "notification_rules" DROP CONSTRAINT "FK_notification_rules_createdBy"`);

    // テーブルを削除
    await queryRunner.query(`DROP TABLE "user_notification_settings"`);
    await queryRunner.query(`DROP TABLE "notification_logs"`);
    await queryRunner.query(`DROP TABLE "notification_rules"`);
  }
}