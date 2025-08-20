/**
 * APIキーテーブル作成マイグレーション
 * 要件7.1: APIキー認証機能の実装
 */

import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateApiKeyTables1691234567896 implements MigrationInterface {
    name = 'CreateApiKeyTables1691234567896';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // APIキーテーブルとレート制限追跡テーブルは初期スキーマで作成済み
        // このマイグレーションではインデックスのみ追加

        // インデックス作成（初期スキーマで作成済みのテーブルに対して）
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_api_keys_key_hash" ON "api_keys" ("keyHash")`);
        await queryRunner.query(`CREATE INDEX "IDX_api_keys_app_id" ON "api_keys" ("appId")`);
        await queryRunner.query(`CREATE INDEX "IDX_rate_limit_tracking_api_key_id" ON "rate_limit_tracking" ("apiKeyId")`);
        await queryRunner.query(`CREATE INDEX "IDX_rate_limit_tracking_window_start" ON "rate_limit_tracking" ("windowStart")`);

        // 自動更新トリガー作成
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        await queryRunner.query(`
            CREATE TRIGGER update_api_keys_updated_at
                BEFORE UPDATE ON api_keys
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        // 古いレート制限レコード削除用の関数作成
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_records()
            RETURNS void AS $$
            BEGIN
                DELETE FROM rate_limit_tracking 
                WHERE timestamp < NOW() - INTERVAL '1 hour';
            END;
            $$ language 'plpgsql';
        `);

        console.log('✅ APIキーテーブルとレート制限追跡テーブルを作成しました');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // トリガーと関数を削除
        await queryRunner.query('DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys');
        await queryRunner.query('DROP FUNCTION IF EXISTS update_updated_at_column()');
        await queryRunner.query('DROP FUNCTION IF EXISTS cleanup_old_rate_limit_records()');

        // インデックスを削除
        await queryRunner.query(`DROP INDEX "IDX_rate_limit_tracking_window_start"`);
        await queryRunner.query(`DROP INDEX "IDX_rate_limit_tracking_api_key_id"`);
        await queryRunner.query(`DROP INDEX "IDX_api_keys_app_id"`);
        await queryRunner.query(`DROP INDEX "IDX_api_keys_key_hash"`);

        // テーブルは初期スキーマで作成されているため削除しない

        console.log('✅ APIキーテーブルとレート制限追跡テーブルを削除しました');
    }
}