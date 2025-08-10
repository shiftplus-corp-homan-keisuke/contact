-- データベース初期化スクリプト
-- PostgreSQL用の拡張機能を有効化

-- UUID生成用の拡張機能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 全文検索用の拡張機能
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 日本語全文検索用の設定
CREATE TEXT SEARCH CONFIGURATION japanese (COPY = simple);

-- インデックス作成用の関数
CREATE OR REPLACE FUNCTION create_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 初期データベース設定完了
SELECT 'データベース初期化完了' as status;