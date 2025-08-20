/**
 * 履歴管理トリガーの追加マイグレーション
 * 要件2.2, 2.4, 4.3: 履歴記録の自動化機能実装
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHistoryTriggers1691234567893 implements MigrationInterface {
    name = 'AddHistoryTriggers1691234567893';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ユーザー更新時の履歴記録トリガー関数
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION log_user_changes()
      RETURNS TRIGGER AS $$
      BEGIN
        -- メールアドレスの変更
        IF OLD.email IS DISTINCT FROM NEW.email THEN
          INSERT INTO user_history (id, "userId", "fieldName", "oldValue", "newValue", "changedBy", "changedAt")
          VALUES (gen_random_uuid(), NEW.id, 'email', OLD.email, NEW.email, 
                  COALESCE(current_setting('app.current_user_id', true)::uuid, NEW.id), NOW());
        END IF;
        
        -- 名前の変更
        IF OLD.name IS DISTINCT FROM NEW.name THEN
          INSERT INTO user_history (id, "userId", "fieldName", "oldValue", "newValue", "changedBy", "changedAt")
          VALUES (gen_random_uuid(), NEW.id, 'name', OLD.name, NEW.name, 
                  COALESCE(current_setting('app.current_user_id', true)::uuid, NEW.id), NOW());
        END IF;
        
        -- ロールの変更
        IF OLD."roleId" IS DISTINCT FROM NEW."roleId" THEN
          INSERT INTO user_history (id, "userId", "fieldName", "oldValue", "newValue", "changedBy", "changedAt")
          VALUES (gen_random_uuid(), NEW.id, 'roleId', OLD."roleId"::text, NEW."roleId"::text, 
                  COALESCE(current_setting('app.current_user_id', true)::uuid, NEW.id), NOW());
        END IF;
        
        -- アクティブ状態の変更
        IF OLD."isActive" IS DISTINCT FROM NEW."isActive" THEN
          INSERT INTO user_history (id, "userId", "fieldName", "oldValue", "newValue", "changedBy", "changedAt")
          VALUES (gen_random_uuid(), NEW.id, 'isActive', OLD."isActive"::text, NEW."isActive"::text, 
                  COALESCE(current_setting('app.current_user_id', true)::uuid, NEW.id), NOW());
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        // ユーザー更新トリガー
        await queryRunner.query(`
      CREATE TRIGGER trigger_log_user_changes
        AFTER UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION log_user_changes();
    `);

        // 問い合わせ状態変更時の履歴記録トリガー関数
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION log_inquiry_status_changes()
      RETURNS TRIGGER AS $$
      BEGIN
        -- ステータスの変更
        IF OLD.status IS DISTINCT FROM NEW.status THEN
          INSERT INTO inquiry_status_history (id, "inquiryId", "oldStatus", "newStatus", "changedBy", "changedAt", "metadata")
          VALUES (gen_random_uuid(), NEW.id, OLD.status, NEW.status, 
                  COALESCE(current_setting('app.current_user_id', true)::uuid, gen_random_uuid()), NOW(),
                  json_build_object('trigger', 'auto', 'field', 'status'));
        END IF;
        
        -- 担当者の変更
        IF OLD."assignedTo" IS DISTINCT FROM NEW."assignedTo" THEN
          INSERT INTO inquiry_status_history (id, "inquiryId", "oldStatus", "newStatus", "changedBy", "changedAt", "comment", "metadata")
          VALUES (gen_random_uuid(), NEW.id, NEW.status, NEW.status, 
                  COALESCE(current_setting('app.current_user_id', true)::uuid, gen_random_uuid()), NOW(),
                  'Assigned to: ' || COALESCE(NEW."assignedTo"::text, 'Unassigned'),
                  json_build_object('trigger', 'auto', 'field', 'assignedTo', 'oldValue', OLD."assignedTo", 'newValue', NEW."assignedTo"));
        END IF;
        
        -- 優先度の変更
        IF OLD.priority IS DISTINCT FROM NEW.priority THEN
          INSERT INTO inquiry_status_history (id, "inquiryId", "oldStatus", "newStatus", "changedBy", "changedAt", "comment", "metadata")
          VALUES (gen_random_uuid(), NEW.id, NEW.status, NEW.status, 
                  COALESCE(current_setting('app.current_user_id', true)::uuid, gen_random_uuid()), NOW(),
                  'Priority changed from ' || OLD.priority || ' to ' || NEW.priority,
                  json_build_object('trigger', 'auto', 'field', 'priority', 'oldValue', OLD.priority, 'newValue', NEW.priority));
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        // 問い合わせ更新トリガー
        await queryRunner.query(`
      CREATE TRIGGER trigger_log_inquiry_status_changes
        AFTER UPDATE ON inquiries
        FOR EACH ROW
        EXECUTE FUNCTION log_inquiry_status_changes();
    `);

        // 回答更新時の履歴記録トリガー関数
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION log_response_changes()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 内容の変更
        IF OLD.content IS DISTINCT FROM NEW.content THEN
          INSERT INTO response_history (id, "responseId", "oldContent", "newContent", "changedBy", "changedAt", "changeType", "metadata")
          VALUES (gen_random_uuid(), NEW.id, OLD.content, NEW.content, 
                  COALESCE(current_setting('app.current_user_id', true)::uuid, NEW."userId"), NOW(),
                  'update', json_build_object('trigger', 'auto', 'field', 'content'));
        END IF;
        
        -- 公開状態の変更
        IF OLD."isPublic" IS DISTINCT FROM NEW."isPublic" THEN
          INSERT INTO response_history (id, "responseId", "oldContent", "newContent", "changedBy", "changedAt", "changeType", "comment", "metadata")
          VALUES (gen_random_uuid(), NEW.id, NEW.content, NEW.content, 
                  COALESCE(current_setting('app.current_user_id', true)::uuid, NEW."userId"), NOW(),
                  'visibility_change', 
                  'Visibility changed from ' || OLD."isPublic"::text || ' to ' || NEW."isPublic"::text,
                  json_build_object('trigger', 'auto', 'field', 'isPublic', 'oldValue', OLD."isPublic", 'newValue', NEW."isPublic"));
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        // 回答更新トリガー
        await queryRunner.query(`
      CREATE TRIGGER trigger_log_response_changes
        AFTER UPDATE ON responses
        FOR EACH ROW
        EXECUTE FUNCTION log_response_changes();
    `);

        // 回答作成時の履歴記録トリガー関数
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION log_response_creation()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO response_history (id, "responseId", "oldContent", "newContent", "changedBy", "changedAt", "changeType", "metadata")
        VALUES (gen_random_uuid(), NEW.id, NULL, NEW.content, NEW."userId", NOW(),
                'create', json_build_object('trigger', 'auto', 'action', 'create'));
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        // 回答作成トリガー
        await queryRunner.query(`
      CREATE TRIGGER trigger_log_response_creation
        AFTER INSERT ON responses
        FOR EACH ROW
        EXECUTE FUNCTION log_response_creation();
    `);

        // 問い合わせの初回回答時刻自動更新トリガー関数
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_first_response_time()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 初回回答時刻が未設定の場合のみ更新
        UPDATE inquiries 
        SET "firstResponseAt" = NOW()
        WHERE id = NEW."inquiryId" 
          AND "firstResponseAt" IS NULL
          AND NEW."isInternal" = false; -- 内部メモは除外
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        // 初回回答時刻更新トリガー
        await queryRunner.query(`
      CREATE TRIGGER trigger_update_first_response_time
        AFTER INSERT ON responses
        FOR EACH ROW
        EXECUTE FUNCTION update_first_response_time();
    `);

        // 問い合わせ解決・クローズ時刻自動更新トリガー関数
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_inquiry_timestamps()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 解決時刻の更新
        IF OLD.status != 'resolved' AND NEW.status = 'resolved' AND NEW."resolvedAt" IS NULL THEN
          NEW."resolvedAt" = NOW();
        END IF;
        
        -- クローズ時刻の更新
        IF OLD.status != 'closed' AND NEW.status = 'closed' AND NEW."closedAt" IS NULL THEN
          NEW."closedAt" = NOW();
        END IF;
        
        -- 解決状態から他の状態に戻った場合、解決時刻をクリア
        IF OLD.status = 'resolved' AND NEW.status != 'resolved' AND NEW.status != 'closed' THEN
          NEW."resolvedAt" = NULL;
        END IF;
        
        -- クローズ状態から他の状態に戻った場合、クローズ時刻をクリア
        IF OLD.status = 'closed' AND NEW.status != 'closed' THEN
          NEW."closedAt" = NULL;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        // 問い合わせタイムスタンプ更新トリガー
        await queryRunner.query(`
      CREATE TRIGGER trigger_update_inquiry_timestamps
        BEFORE UPDATE ON inquiries
        FOR EACH ROW
        EXECUTE FUNCTION update_inquiry_timestamps();
    `);

        // 履歴データのクリーンアップ用関数（古い履歴データの削除）
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_history()
      RETURNS void AS $$
      BEGIN
        -- 1年以上古いユーザー履歴を削除
        DELETE FROM user_history WHERE "changedAt" < NOW() - INTERVAL '1 year';
        
        -- 2年以上古い問い合わせ状態履歴を削除（ただし、最初と最後の履歴は保持）
        DELETE FROM inquiry_status_history 
        WHERE "changedAt" < NOW() - INTERVAL '2 years'
          AND id NOT IN (
            SELECT DISTINCT ON ("inquiryId") id 
            FROM inquiry_status_history 
            ORDER BY "inquiryId", "changedAt" ASC
          )
          AND id NOT IN (
            SELECT DISTINCT ON ("inquiryId") id 
            FROM inquiry_status_history 
            ORDER BY "inquiryId", "changedAt" DESC
          );
        
        -- 1年以上古い回答履歴を削除（ただし、作成履歴は保持）
        DELETE FROM response_history 
        WHERE "changedAt" < NOW() - INTERVAL '1 year'
          AND "changeType" != 'create';
      END;
      $$ LANGUAGE plpgsql;
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 関数の削除
        await queryRunner.query(`DROP FUNCTION IF EXISTS cleanup_old_history()`);

        // トリガーの削除
        await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_inquiry_timestamps ON inquiries`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_inquiry_timestamps()`);

        await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_first_response_time ON responses`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_first_response_time()`);

        await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_log_response_creation ON responses`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS log_response_creation()`);

        await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_log_response_changes ON responses`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS log_response_changes()`);

        await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_log_inquiry_status_changes ON inquiries`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS log_inquiry_status_changes()`);

        await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_log_user_changes ON users`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS log_user_changes()`);
    }
}