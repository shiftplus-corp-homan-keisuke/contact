import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddFAQSiteConfigTable1691234567895 implements MigrationInterface {
    name = 'AddFAQSiteConfigTable1691234567895';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // FAQ サイト設定テーブルを作成
        await queryRunner.createTable(
            new Table({
                name: 'faq_site_configs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'app_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'site_title',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'site_description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'theme',
                        type: 'varchar',
                        length: '50',
                        default: "'default'",
                    },
                    {
                        name: 'custom_css',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'logo_url',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'footer_text',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'enable_search',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'enable_category_filter',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'is_published',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'site_url',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'last_generated_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['app_id'],
                        referencedTableName: 'applications',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );

        // インデックス作成
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_faq_site_configs_app_id_unique" ON "faq_site_configs" ("app_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_faq_site_configs_is_published" ON "faq_site_configs" ("is_published")`);
        await queryRunner.query(`CREATE INDEX "IDX_faq_site_configs_last_generated_at" ON "faq_site_configs" ("last_generated_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // インデックスを削除
        await queryRunner.query(`DROP INDEX "IDX_faq_site_configs_last_generated_at"`);
        await queryRunner.query(`DROP INDEX "IDX_faq_site_configs_is_published"`);
        await queryRunner.query(`DROP INDEX "IDX_faq_site_configs_app_id_unique"`);

        // テーブルを削除
        await queryRunner.dropTable('faq_site_configs');
    }
}