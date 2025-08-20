import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSlaMonitoringTables1691234567898 implements MigrationInterface {
    name = 'CreateSlaMonitoringTables1691234567898';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // SLA設定テーブル
        await queryRunner.createTable(
            new Table({
                name: 'sla_configs',
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
                        name: 'priority',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                    },
                    {
                        name: 'response_time_hours',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'resolution_time_hours',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'escalation_time_hours',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
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
                    },
                ],
            }),
            true,
        );

        // SLA違反テーブル
        await queryRunner.createTable(
            new Table({
                name: 'sla_violations',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'inquiry_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'sla_config_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'violation_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'expected_time',
                        type: 'timestamp',
                        isNullable: false,
                    },
                    {
                        name: 'actual_time',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'delay_hours',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'severity',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                    },
                    {
                        name: 'is_resolved',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'resolved_by',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'resolved_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'resolution_comment',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'detected_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // エスカレーションテーブル
        await queryRunner.createTable(
            new Table({
                name: 'escalations',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'inquiry_id',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'escalated_from',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'escalated_to',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'escalation_reason',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'escalation_level',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'comment',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'is_automatic',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'escalated_by',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'escalated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // 外部キー制約を追加
        await queryRunner.createForeignKey(
            'sla_configs',
            new TableForeignKey({
                columnNames: ['app_id'],
                referencedTableName: 'applications',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
                name: 'FK_sla_configs_app_id',
            }),
        );

        await queryRunner.createForeignKey(
            'sla_violations',
            new TableForeignKey({
                columnNames: ['inquiry_id'],
                referencedTableName: 'inquiries',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
                name: 'FK_sla_violations_inquiry_id',
            }),
        );

        await queryRunner.createForeignKey(
            'sla_violations',
            new TableForeignKey({
                columnNames: ['sla_config_id'],
                referencedTableName: 'sla_configs',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
                name: 'FK_sla_violations_sla_config_id',
            }),
        );

        await queryRunner.createForeignKey(
            'sla_violations',
            new TableForeignKey({
                columnNames: ['resolved_by'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
                name: 'FK_sla_violations_resolved_by',
            }),
        );

        await queryRunner.createForeignKey(
            'escalations',
            new TableForeignKey({
                columnNames: ['inquiry_id'],
                referencedTableName: 'inquiries',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
                name: 'FK_escalations_inquiry_id',
            }),
        );

        await queryRunner.createForeignKey(
            'escalations',
            new TableForeignKey({
                columnNames: ['escalated_from'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
                name: 'FK_escalations_escalated_from',
            }),
        );

        await queryRunner.createForeignKey(
            'escalations',
            new TableForeignKey({
                columnNames: ['escalated_to'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
                name: 'FK_escalations_escalated_to',
            }),
        );

        await queryRunner.createForeignKey(
            'escalations',
            new TableForeignKey({
                columnNames: ['escalated_by'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
                name: 'FK_escalations_escalated_by',
            }),
        );

        // インデックスを追加
        await queryRunner.createIndex(
            'sla_configs',
            new TableIndex({
                name: 'idx_sla_configs_app_priority',
                columnNames: ['app_id', 'priority'],
            }),
        );

        await queryRunner.createIndex(
            'sla_violations',
            new TableIndex({
                name: 'idx_sla_violations_inquiry',
                columnNames: ['inquiry_id'],
            }),
        );

        await queryRunner.createIndex(
            'sla_violations',
            new TableIndex({
                name: 'idx_sla_violations_detected_at',
                columnNames: ['detected_at'],
            }),
        );

        await queryRunner.createIndex(
            'sla_violations',
            new TableIndex({
                name: 'idx_sla_violations_severity',
                columnNames: ['severity'],
            }),
        );

        await queryRunner.createIndex(
            'sla_violations',
            new TableIndex({
                name: 'idx_sla_violations_resolved',
                columnNames: ['is_resolved'],
            }),
        );

        await queryRunner.createIndex(
            'escalations',
            new TableIndex({
                name: 'idx_escalations_inquiry',
                columnNames: ['inquiry_id'],
            }),
        );

        await queryRunner.createIndex(
            'escalations',
            new TableIndex({
                name: 'idx_escalations_escalated_at',
                columnNames: ['escalated_at'],
            }),
        );

        await queryRunner.createIndex(
            'escalations',
            new TableIndex({
                name: 'idx_escalations_escalated_to',
                columnNames: ['escalated_to'],
            }),
        );

        await queryRunner.createIndex(
            'escalations',
            new TableIndex({
                name: 'idx_escalations_automatic',
                columnNames: ['is_automatic'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 外部キー制約を削除
        await queryRunner.dropForeignKey('escalations', 'FK_escalations_escalated_by');
        await queryRunner.dropForeignKey('escalations', 'FK_escalations_escalated_to');
        await queryRunner.dropForeignKey('escalations', 'FK_escalations_escalated_from');
        await queryRunner.dropForeignKey('escalations', 'FK_escalations_inquiry_id');
        await queryRunner.dropForeignKey('sla_violations', 'FK_sla_violations_resolved_by');
        await queryRunner.dropForeignKey('sla_violations', 'FK_sla_violations_sla_config_id');
        await queryRunner.dropForeignKey('sla_violations', 'FK_sla_violations_inquiry_id');
        await queryRunner.dropForeignKey('sla_configs', 'FK_sla_configs_app_id');

        // インデックスを削除
        await queryRunner.dropIndex('escalations', 'idx_escalations_automatic');
        await queryRunner.dropIndex('escalations', 'idx_escalations_escalated_to');
        await queryRunner.dropIndex('escalations', 'idx_escalations_escalated_at');
        await queryRunner.dropIndex('escalations', 'idx_escalations_inquiry');
        await queryRunner.dropIndex('sla_violations', 'idx_sla_violations_resolved');
        await queryRunner.dropIndex('sla_violations', 'idx_sla_violations_severity');
        await queryRunner.dropIndex('sla_violations', 'idx_sla_violations_detected_at');
        await queryRunner.dropIndex('sla_violations', 'idx_sla_violations_inquiry');
        await queryRunner.dropIndex('sla_configs', 'idx_sla_configs_app_priority');

        // テーブルを削除
        await queryRunner.dropTable('escalations');
        await queryRunner.dropTable('sla_violations');
        await queryRunner.dropTable('sla_configs');
    }
}