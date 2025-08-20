import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTables1691234567897 implements MigrationInterface {
    name = 'CreateNotificationTables1691234567897';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 通知ルールテーブル
        await queryRunner.query(`
      CREATE TABLE "notification_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "trigger" varchar(50) NOT NULL,
        "conditions" jsonb NOT NULL,
        "actions" jsonb NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 通知ログテーブル
        await queryRunner.query(`
      CREATE TABLE "notification_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "rule_id" uuid,
        "channel" varchar(50) NOT NULL,
        "recipient" varchar(255) NOT NULL,
        "subject" varchar(500) NOT NULL,
        "content" text NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "error_message" text,
        "sent_at" timestamp,
        "delivered_at" timestamp,
        "triggered_by" uuid,
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // ユーザー通知設定テーブル
        await queryRunner.query(`
      CREATE TABLE "user_notification_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "trigger" varchar(50) NOT NULL,
        "channel" varchar(50) NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "email_address" varchar(255),
        "slack_webhook_url" varchar(500),
        "teams_webhook_url" varchar(500),
        "webhook_url" varchar(500),
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // インデックス作成
        await queryRunner.query(`CREATE INDEX "idx_notification_rules_trigger" ON "notification_rules" ("trigger")`);
        await queryRunner.query(`CREATE INDEX "idx_notification_rules_created_by" ON "notification_rules" ("created_by")`);
        await queryRunner.query(`CREATE INDEX "idx_notification_logs_channel" ON "notification_logs" ("channel")`);
        await queryRunner.query(`CREATE INDEX "idx_notification_logs_status" ON "notification_logs" ("status")`);
        await queryRunner.query(`CREATE INDEX "idx_notification_logs_created_at" ON "notification_logs" ("created_at")`);
        await queryRunner.query(`CREATE INDEX "idx_user_notification_settings_user_id" ON "user_notification_settings" ("user_id")`);

        // ユニーク制約
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_user_notification_settings_unique" ON "user_notification_settings" ("user_id", "trigger", "channel")`);

        // 外部キー制約
        await queryRunner.query(`ALTER TABLE "notification_rules" ADD CONSTRAINT "fk_notification_rules_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "notification_logs" ADD CONSTRAINT "fk_notification_logs_rule_id" FOREIGN KEY ("rule_id") REFERENCES "notification_rules"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "notification_logs" ADD CONSTRAINT "fk_notification_logs_triggered_by" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "user_notification_settings" ADD CONSTRAINT "fk_user_notification_settings_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 外部キー制約を削除
        await queryRunner.query(`ALTER TABLE "user_notification_settings" DROP CONSTRAINT "fk_user_notification_settings_user_id"`);
        await queryRunner.query(`ALTER TABLE "notification_logs" DROP CONSTRAINT "fk_notification_logs_triggered_by"`);
        await queryRunner.query(`ALTER TABLE "notification_logs" DROP CONSTRAINT "fk_notification_logs_rule_id"`);
        await queryRunner.query(`ALTER TABLE "notification_rules" DROP CONSTRAINT "fk_notification_rules_created_by"`);

        // テーブル削除
        await queryRunner.query(`DROP TABLE "user_notification_settings"`);
        await queryRunner.query(`DROP TABLE "notification_logs"`);
        await queryRunner.query(`DROP TABLE "notification_rules"`);
    }
}