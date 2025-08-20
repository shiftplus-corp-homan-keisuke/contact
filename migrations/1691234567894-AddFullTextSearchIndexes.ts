import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFullTextSearchIndexes1691234567894 implements MigrationInterface {
  name = 'AddFullTextSearchIndexes1691234567894';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 日本語全文検索のための設定
    await queryRunner.query(`
      -- 日本語全文検索設定の作成
      CREATE TEXT SEARCH CONFIGURATION japanese (COPY = simple);
      
      -- 問い合わせテーブルの全文検索インデックス
      CREATE INDEX idx_inquiries_fulltext 
      ON inquiries 
      USING gin(to_tsvector('japanese', title || ' ' || content));
      
      -- 回答テーブルの全文検索インデックス
      CREATE INDEX idx_responses_fulltext 
      ON responses 
      USING gin(to_tsvector('japanese', content));
      
      -- FAQテーブルの全文検索インデックス
      CREATE INDEX idx_faqs_fulltext 
      ON faqs 
      USING gin(to_tsvector('japanese', question || ' ' || answer));
    `);

    // 検索パフォーマンス向上のための追加インデックス
    await queryRunner.query(`
      -- 問い合わせテーブルの検索用インデックス
      CREATE INDEX idx_inquiries_app_status ON inquiries("appId", status);
      CREATE INDEX idx_inquiries_category ON inquiries(category);
      CREATE INDEX idx_inquiries_priority ON inquiries(priority);
      CREATE INDEX idx_inquiries_assigned_to ON inquiries("assignedTo");
      CREATE INDEX idx_inquiries_customer_email ON inquiries("customerEmail");
      CREATE INDEX idx_inquiries_created_at ON inquiries("createdAt");
      
      -- 回答テーブルの検索用インデックス
      CREATE INDEX idx_responses_inquiry_id ON responses("inquiryId");
      CREATE INDEX idx_responses_user_id ON responses("userId");
      CREATE INDEX idx_responses_created_at ON responses("createdAt");
      CREATE INDEX idx_responses_is_public ON responses("isPublic");
      
      -- FAQテーブルの検索用インデックス
      CREATE INDEX idx_faqs_app_category ON faqs("appId", category);
      CREATE INDEX idx_faqs_is_published ON faqs("isPublished");
      CREATE INDEX idx_faqs_order_index ON faqs("orderIndex");
      CREATE INDEX idx_faqs_created_at ON faqs("createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // インデックスの削除
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inquiries_fulltext;
      DROP INDEX IF EXISTS idx_responses_fulltext;
      DROP INDEX IF EXISTS idx_faqs_fulltext;
      
      DROP INDEX IF EXISTS idx_inquiries_app_status;
      DROP INDEX IF EXISTS idx_inquiries_category;
      DROP INDEX IF EXISTS idx_inquiries_priority;
      DROP INDEX IF EXISTS idx_inquiries_assigned_to;
      DROP INDEX IF EXISTS idx_inquiries_customer_email;
      DROP INDEX IF EXISTS idx_inquiries_created_at;
      
      DROP INDEX IF EXISTS idx_responses_inquiry_id;
      DROP INDEX IF EXISTS idx_responses_user_id;
      DROP INDEX IF EXISTS idx_responses_created_at;
      DROP INDEX IF EXISTS idx_responses_is_public;
      
      DROP INDEX IF EXISTS idx_faqs_app_category;
      DROP INDEX IF EXISTS idx_faqs_is_published;
      DROP INDEX IF EXISTS idx_faqs_order_index;
      DROP INDEX IF EXISTS idx_faqs_created_at;
      
      DROP TEXT SEARCH CONFIGURATION IF EXISTS japanese;
    `);
  }
}