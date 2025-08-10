/**
 * PostgreSQL全文検索インデックスの追加
 * 要件: 8.1, 8.3 (全文検索機能)
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFullTextSearchIndexes1691234567893 implements MigrationInterface {
  name = 'AddFullTextSearchIndexes1691234567893';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 全文検索用のGINインデックスを作成
    // 日本語対応のため、simple辞書を使用
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_title_fulltext 
      ON inquiries USING gin(to_tsvector('simple', title))
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_content_fulltext 
      ON inquiries USING gin(to_tsvector('simple', content))
    `);

    // 複合全文検索インデックス（タイトル + 内容）
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_title_content_fulltext 
      ON inquiries USING gin(to_tsvector('simple', title || ' ' || content))
    `);

    // 検索パフォーマンス向上のための追加インデックス
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_app_id_status 
      ON inquiries (app_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_category 
      ON inquiries (category) WHERE category IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_priority_status 
      ON inquiries (priority, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_to 
      ON inquiries (assigned_to) WHERE assigned_to IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_customer_email 
      ON inquiries (customer_email) WHERE customer_email IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_created_at_desc 
      ON inquiries (created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_updated_at_desc 
      ON inquiries (updated_at DESC)
    `);

    // 部分一致検索用のインデックス（LIKE検索の高速化）
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_title_text_pattern 
      ON inquiries USING gin(title gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_content_text_pattern 
      ON inquiries USING gin(content gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_customer_name_text_pattern 
      ON inquiries USING gin(customer_name gin_trgm_ops) 
      WHERE customer_name IS NOT NULL
    `);

    // 統計情報取得用のインデックス
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_status_count 
      ON inquiries (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_priority_count 
      ON inquiries (priority)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_category_count 
      ON inquiries (category) WHERE category IS NOT NULL AND category != ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // インデックスを削除
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_title_fulltext`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_content_fulltext`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_title_content_fulltext`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_app_id_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_priority_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_assigned_to`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_customer_email`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_created_at_desc`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_updated_at_desc`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_title_text_pattern`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_content_text_pattern`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_customer_name_text_pattern`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_status_count`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_priority_count`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inquiries_category_count`);
  }
}