import { MigrationInterface, QueryRunner, Table, ForeignKey, Index } from 'typeorm';

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
            new ForeignKey({
                columnNames: ['app_id'],
                referencedTableName: 'applications',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'sla_violations',
            new ForeignKey({
                columnNames: ['inquiry_id'],
                referencedTableName: 'inquiries',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'sla_violations',
            new ForeignKey({
                columnNames: ['sla_config_id'],
                referencedTableName: 'sla_configs',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'sla_violations',
            new ForeignKey({
                columnNames: ['resolved_by'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        await queryRunner.createForeignKey(
            'escalations',
            new ForeignKey({
                columnNames: ['inquiry_id'],
                referencedTableName: 'inquiries',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'escalations',
            new ForeignKey({
                columnNames: ['escalated_from'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        await queryRunner.createForeignKey(
            'escalations',
            new ForeignKey({
                columnNames: ['escalated_to'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'escalations',
            new ForeignKey({
                columnNames: ['escalated_by'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            }),
        );

        // インデックスを追加
        await queryRunner.createIndex(
            'sla_configs',
            new Index('idx_sla_configs_app_priority', ['app_id', 'priority']),
        );

        await queryRunner.createIndex(
            'sla_violations',
            new Index('idx_sla_violations_inquiry', ['inquiry_id']),
        );

        await queryRunner.createIndex(
            'sla_violations',
            new Index('idx_sla_violations_detected_at', ['detected_at']),
        );

        await queryRunner.createIndex(
            'sla_violations',
            new Index('idx_sla_violations_severity', ['severity']),
        );

        await queryRunner.createIndex(
            'sla_violations',
            new Index('idx_sla_violations_resolved', ['is_resolved']),
        );

        await queryRunner.createIndex(
            'escalations',
            new Index('idx_escalations_inquiry', ['inquiry_id']),
        );

        await queryRunner.createIndex(
            'escalations',
            new Index('idx_escalations_escalated_at', ['escalated_at']),
        );

        await queryRunner.createIndex(
            'escalations',
            new Index('idx_escalations_escalated_to', ['escalated_to']),
        );

        await queryRunner.createIndex(
            'escalations',
            new Index('idx_escalations_automatic', ['is_automatic']),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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