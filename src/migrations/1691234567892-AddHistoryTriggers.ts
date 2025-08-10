/**
 * 履歴管理トリガーマイグレーション
 * 要件: 2.2, 2.4, 4.3 (履歴記録の自動化機能実装)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHistoryTriggers1691234567892 implements MigrationInterface {
  name = 'AddHistoryTriggers1691234567892';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ユーザー履歴自動記録トリガー関数
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION record_user_history()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 更新の場合のみ履歴を記録
        IF TG_OP = 'UPDATE' THEN
          -- email の変更
          IF OLD.email IS DISTINCT FROM NEW.email THEN
            INSERT INTO user_history (user_id, field_name, old_value, new_value, changed_by, changed_at)
            VALUES (NEW.id, 'email', OLD.email, NEW.email, 
                   COALESCE(current_setting('app.current_user_id', true), NEW.id), NOW());
          END IF;
          
          -- name の変更
          IF OLD.name IS DISTINCT FROM NEW.name THEN
            INSERT INTO user_history (user_id, field_name, old_value, new_value, changed_by, changed_at)
            VALUES (NEW.id, 'name', OLD.name, NEW.name, 
                   COALESCE(current_setting('app.current_user_id', true), NEW.id), NOW());
          END IF;
          
          -- role_id の変更
          IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN
            INSERT INTO user_history (user_id, field_name, old_value, new_value, changed_by, changed_at)
            VALUES (NEW.id, 'role_id', OLD.role_id::text, NEW.role_id::text, 
                   COALESCE(current_setting('app.current_user_id', true), NEW.id), NOW());
          END IF;
          
          -- is_active の変更
          IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
            INSERT INTO user_history (user_id, field_name, old_value, new_value, changed_by, changed_at)
            VALUES (NEW.id, 'is_active', OLD.is_active::text, NEW.is_active::text, 
                   COALESCE(current_setting('app.current_user_id', true), NEW.id), NOW());
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 問い合わせ状態履歴自動記録トリガー関数
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION record_inquiry_status_history()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 更新の場合のみ履歴を記録
        IF TG_OP = 'UPDATE' THEN
          -- status の変更
          IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO inquiry_status_history (inquiry_id, old_status, new_status, changed_by, changed_at)
            VALUES (NEW.id, OLD.status, NEW.status, 
                   COALESCE(current_setting('app.current_user_id', true), 
                           COALESCE(NEW.assigned_to, OLD.assigned_to, '00000000-0000-0000-0000-000000000000')), 
                   NOW());
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 回答履歴自動記録トリガー関数
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION record_response_history()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 更新の場合のみ履歴を記録
        IF TG_OP = 'UPDATE' THEN
          -- content の変更
          IF OLD.content IS DISTINCT FROM NEW.content THEN
            INSERT INTO response_history (response_id, old_content, new_content, changed_by, changed_at)
            VALUES (NEW.id, OLD.content, NEW.content, 
                   COALESCE(current_setting('app.current_user_id', true), NEW.user_id), 
                   NOW());
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // トリガーの作成
    await queryRunner.query(`
      CREATE TRIGGER user_history_trigger
        AFTER UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION record_user_history();
    `);

    await queryRunner.query(`
      CREATE TRIGGER inquiry_status_history_trigger
        AFTER UPDATE ON inquiries
        FOR EACH ROW
        EXECUTE FUNCTION record_inquiry_status_history();
    `);

    await queryRunner.query(`
      CREATE TRIGGER response_history_trigger
        AFTER UPDATE ON responses
        FOR EACH ROW
        EXECUTE FUNCTION record_response_history();
    `);

    // 履歴データ取得用のビューを作成
    await queryRunner.query(`
      CREATE VIEW user_activity_log AS
      SELECT 
        uh.id,
        uh.user_id,
        u.name as user_name,
        u.email as user_email,
        uh.field_name,
        uh.old_value,
        uh.new_value,
        uh.changed_at,
        cb.name as changed_by_name,
        cb.email as changed_by_email
      FROM user_history uh
      JOIN users u ON uh.user_id = u.id
      LEFT JOIN users cb ON uh.changed_by = cb.id
      ORDER BY uh.changed_at DESC;
    `);

    await queryRunner.query(`
      CREATE VIEW inquiry_activity_log AS
      SELECT 
        ish.id,
        ish.inquiry_id,
        i.title as inquiry_title,
        i.app_id,
        a.name as app_name,
        ish.old_status,
        ish.new_status,
        ish.comment,
        ish.changed_at,
        u.name as changed_by_name,
        u.email as changed_by_email
      FROM inquiry_status_history ish
      JOIN inquiries i ON ish.inquiry_id = i.id
      JOIN applications a ON i.app_id = a.id
      LEFT JOIN users u ON ish.changed_by = u.id
      ORDER BY ish.changed_at DESC;
    `);

    await queryRunner.query(`
      CREATE VIEW response_activity_log AS
      SELECT 
        rh.id,
        rh.response_id,
        r.inquiry_id,
        i.title as inquiry_title,
        LENGTH(rh.old_content) as old_content_length,
        LENGTH(rh.new_content) as new_content_length,
        rh.changed_at,
        u.name as changed_by_name,
        u.email as changed_by_email
      FROM response_history rh
      JOIN responses r ON rh.response_id = r.id
      JOIN inquiries i ON r.inquiry_id = i.id
      LEFT JOIN users u ON rh.changed_by = u.id
      ORDER BY rh.changed_at DESC;
    `);

    // 履歴データのパフォーマンス向上のためのインデックス
    await queryRunner.query(`CREATE INDEX "IDX_user_history_changed_at" ON "user_history" ("changed_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_inquiry_status_history_changed_at" ON "inquiry_status_history" ("changed_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_response_history_changed_at" ON "response_history" ("changed_at" DESC)`);
    
    // 複合インデックス
    await queryRunner.query(`CREATE INDEX "IDX_user_history_user_field" ON "user_history" ("user_id", "field_name")`);
    await queryRunner.query(`CREATE INDEX "IDX_inquiry_status_history_inquiry_status" ON "inquiry_status_history" ("inquiry_id", "new_status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ビューの削除
    await queryRunner.query(`DROP VIEW IF EXISTS response_activity_log`);
    await queryRunner.query(`DROP VIEW IF EXISTS inquiry_activity_log`);
    await queryRunner.query(`DROP VIEW IF EXISTS user_activity_log`);

    // トリガーの削除
    await queryRunner.query(`DROP TRIGGER IF EXISTS response_history_trigger ON responses`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS inquiry_status_history_trigger ON inquiries`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS user_history_trigger ON users`);

    // トリガー関数の削除
    await queryRunner.query(`DROP FUNCTION IF EXISTS record_response_history()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS record_inquiry_status_history()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS record_user_history()`);

    // インデックスの削除
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inquiry_status_history_inquiry_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_history_user_field"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_response_history_changed_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inquiry_status_history_changed_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_history_changed_at"`);
  }
}