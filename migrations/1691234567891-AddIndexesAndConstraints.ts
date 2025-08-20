/**
 * インデックスと外部キー制約の追加マイグレーション
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesAndConstraints1691234567891 implements MigrationInterface {
    name = 'AddIndexesAndConstraints1691234567891';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 外部キー制約の追加
        await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "FK_users_roleId" 
      FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "user_history" 
      ADD CONSTRAINT "FK_user_history_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "user_history" 
      ADD CONSTRAINT "FK_user_history_changedBy" 
      FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "inquiries" 
      ADD CONSTRAINT "FK_inquiries_appId" 
      FOREIGN KEY ("appId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "inquiries" 
      ADD CONSTRAINT "FK_inquiries_assignedTo" 
      FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "inquiry_status_history" 
      ADD CONSTRAINT "FK_inquiry_status_history_inquiryId" 
      FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "inquiry_status_history" 
      ADD CONSTRAINT "FK_inquiry_status_history_changedBy" 
      FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "responses" 
      ADD CONSTRAINT "FK_responses_inquiryId" 
      FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "responses" 
      ADD CONSTRAINT "FK_responses_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "response_history" 
      ADD CONSTRAINT "FK_response_history_responseId" 
      FOREIGN KEY ("responseId") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "response_history" 
      ADD CONSTRAINT "FK_response_history_changedBy" 
      FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "faqs" 
      ADD CONSTRAINT "FK_faqs_appId" 
      FOREIGN KEY ("appId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "faqs" 
      ADD CONSTRAINT "FK_faqs_sourceInquiryId" 
      FOREIGN KEY ("sourceInquiryId") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "api_keys" 
      ADD CONSTRAINT "FK_api_keys_appId" 
      FOREIGN KEY ("appId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "rate_limit_tracking" 
      ADD CONSTRAINT "FK_rate_limit_tracking_apiKeyId" 
      FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

        // パフォーマンス向上のためのインデックス追加
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_roleId" ON "users" ("roleId")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_isActive" ON "users" ("isActive")`);

        await queryRunner.query(`CREATE INDEX "IDX_user_history_userId_changedAt" ON "user_history" ("userId", "changedAt")`);

        await queryRunner.query(`CREATE INDEX "IDX_auth_attempts_email_attemptedAt" ON "auth_attempts" ("email", "attemptedAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_auth_attempts_ipAddress_attemptedAt" ON "auth_attempts" ("ipAddress", "attemptedAt")`);

        await queryRunner.query(`CREATE INDEX "IDX_applications_name" ON "applications" ("name")`);
        await queryRunner.query(`CREATE INDEX "IDX_applications_isActive" ON "applications" ("isActive")`);

        await queryRunner.query(`CREATE INDEX "IDX_inquiries_appId_status" ON "inquiries" ("appId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_inquiries_assignedTo_status" ON "inquiries" ("assignedTo", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_inquiries_customerEmail" ON "inquiries" ("customerEmail")`);
        await queryRunner.query(`CREATE INDEX "IDX_inquiries_createdAt" ON "inquiries" ("createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_inquiries_status" ON "inquiries" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_inquiries_priority" ON "inquiries" ("priority")`);
        await queryRunner.query(`CREATE INDEX "IDX_inquiries_category" ON "inquiries" ("category")`);

        await queryRunner.query(`CREATE INDEX "IDX_inquiry_status_history_inquiryId_changedAt" ON "inquiry_status_history" ("inquiryId", "changedAt")`);

        await queryRunner.query(`CREATE INDEX "IDX_responses_inquiryId_createdAt" ON "responses" ("inquiryId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_responses_userId" ON "responses" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_responses_isPublic" ON "responses" ("isPublic")`);

        await queryRunner.query(`CREATE INDEX "IDX_response_history_responseId_changedAt" ON "response_history" ("responseId", "changedAt")`);

        await queryRunner.query(`CREATE INDEX "IDX_faqs_appId_isPublished" ON "faqs" ("appId", "isPublished")`);
        await queryRunner.query(`CREATE INDEX "IDX_faqs_category" ON "faqs" ("category")`);
        await queryRunner.query(`CREATE INDEX "IDX_faqs_orderIndex" ON "faqs" ("orderIndex")`);
        await queryRunner.query(`CREATE INDEX "IDX_faqs_isPublished" ON "faqs" ("isPublished")`);

        await queryRunner.query(`CREATE INDEX "IDX_api_keys_keyHash" ON "api_keys" ("keyHash")`);
        await queryRunner.query(`CREATE INDEX "IDX_api_keys_appId" ON "api_keys" ("appId")`);
        await queryRunner.query(`CREATE INDEX "IDX_api_keys_isActive" ON "api_keys" ("isActive")`);

        await queryRunner.query(`CREATE INDEX "IDX_rate_limit_tracking_apiKeyId_windowStart" ON "rate_limit_tracking" ("apiKeyId", "windowStart")`);

        // 全文検索用のインデックス（PostgreSQL GIN）
        await queryRunner.query(`CREATE INDEX "IDX_inquiries_title_gin" ON "inquiries" USING gin(to_tsvector('english', "title"))`);
        await queryRunner.query(`CREATE INDEX "IDX_inquiries_content_gin" ON "inquiries" USING gin(to_tsvector('english', "content"))`);
        await queryRunner.query(`CREATE INDEX "IDX_responses_content_gin" ON "responses" USING gin(to_tsvector('english', "content"))`);
        await queryRunner.query(`CREATE INDEX "IDX_faqs_question_gin" ON "faqs" USING gin(to_tsvector('english', "question"))`);
        await queryRunner.query(`CREATE INDEX "IDX_faqs_answer_gin" ON "faqs" USING gin(to_tsvector('english', "answer"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // インデックスの削除
        await queryRunner.query(`DROP INDEX "IDX_faqs_answer_gin"`);
        await queryRunner.query(`DROP INDEX "IDX_faqs_question_gin"`);
        await queryRunner.query(`DROP INDEX "IDX_responses_content_gin"`);
        await queryRunner.query(`DROP INDEX "IDX_inquiries_content_gin"`);
        await queryRunner.query(`DROP INDEX "IDX_inquiries_title_gin"`);

        await queryRunner.query(`DROP INDEX "IDX_rate_limit_tracking_apiKeyId_windowStart"`);
        await queryRunner.query(`DROP INDEX "IDX_api_keys_isActive"`);
        await queryRunner.query(`DROP INDEX "IDX_api_keys_appId"`);
        await queryRunner.query(`DROP INDEX "IDX_api_keys_keyHash"`);

        await queryRunner.query(`DROP INDEX "IDX_faqs_isPublished"`);
        await queryRunner.query(`DROP INDEX "IDX_faqs_orderIndex"`);
        await queryRunner.query(`DROP INDEX "IDX_faqs_category"`);
        await queryRunner.query(`DROP INDEX "IDX_faqs_appId_isPublished"`);

        await queryRunner.query(`DROP INDEX "IDX_response_history_responseId_changedAt"`);
        await queryRunner.query(`DROP INDEX "IDX_responses_isPublic"`);
        await queryRunner.query(`DROP INDEX "IDX_responses_userId"`);
        await queryRunner.query(`DROP INDEX "IDX_responses_inquiryId_createdAt"`);

        await queryRunner.query(`DROP INDEX "IDX_inquiry_status_history_inquiryId_changedAt"`);

        await queryRunner.query(`DROP INDEX "IDX_inquiries_category"`);
        await queryRunner.query(`DROP INDEX "IDX_inquiries_priority"`);
        await queryRunner.query(`DROP INDEX "IDX_inquiries_status"`);
        await queryRunner.query(`DROP INDEX "IDX_inquiries_createdAt"`);
        await queryRunner.query(`DROP INDEX "IDX_inquiries_customerEmail"`);
        await queryRunner.query(`DROP INDEX "IDX_inquiries_assignedTo_status"`);
        await queryRunner.query(`DROP INDEX "IDX_inquiries_appId_status"`);

        await queryRunner.query(`DROP INDEX "IDX_applications_isActive"`);
        await queryRunner.query(`DROP INDEX "IDX_applications_name"`);

        await queryRunner.query(`DROP INDEX "IDX_auth_attempts_ipAddress_attemptedAt"`);
        await queryRunner.query(`DROP INDEX "IDX_auth_attempts_email_attemptedAt"`);

        await queryRunner.query(`DROP INDEX "IDX_user_history_userId_changedAt"`);

        await queryRunner.query(`DROP INDEX "IDX_users_isActive"`);
        await queryRunner.query(`DROP INDEX "IDX_users_roleId"`);
        await queryRunner.query(`DROP INDEX "IDX_users_email"`);

        // 外部キー制約の削除
        await queryRunner.query(`ALTER TABLE "rate_limit_tracking" DROP CONSTRAINT "FK_rate_limit_tracking_apiKeyId"`);
        await queryRunner.query(`ALTER TABLE "api_keys" DROP CONSTRAINT "FK_api_keys_appId"`);
        await queryRunner.query(`ALTER TABLE "faqs" DROP CONSTRAINT "FK_faqs_sourceInquiryId"`);
        await queryRunner.query(`ALTER TABLE "faqs" DROP CONSTRAINT "FK_faqs_appId"`);
        await queryRunner.query(`ALTER TABLE "response_history" DROP CONSTRAINT "FK_response_history_changedBy"`);
        await queryRunner.query(`ALTER TABLE "response_history" DROP CONSTRAINT "FK_response_history_responseId"`);
        await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_responses_userId"`);
        await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_responses_inquiryId"`);
        await queryRunner.query(`ALTER TABLE "inquiry_status_history" DROP CONSTRAINT "FK_inquiry_status_history_changedBy"`);
        await queryRunner.query(`ALTER TABLE "inquiry_status_history" DROP CONSTRAINT "FK_inquiry_status_history_inquiryId"`);
        await queryRunner.query(`ALTER TABLE "inquiries" DROP CONSTRAINT "FK_inquiries_assignedTo"`);
        await queryRunner.query(`ALTER TABLE "inquiries" DROP CONSTRAINT "FK_inquiries_appId"`);
        await queryRunner.query(`ALTER TABLE "user_history" DROP CONSTRAINT "FK_user_history_changedBy"`);
        await queryRunner.query(`ALTER TABLE "user_history" DROP CONSTRAINT "FK_user_history_userId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_roleId"`);
    }
}