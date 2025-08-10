import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddSlaAndEscalationTables1691234567895 implements MigrationInterface {
  name = 'AddSlaAndEscalationTables1691234567895';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SLA設定テーブルの作成
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
            name: 'application_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'priority_level',
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
            name: 'business_hours_only',
            type: 'boolean',
            default: false,
          },
          {
            name: 'business_start_hour',
            type: 'integer',
            default: 9,
          },
          {
            name: 'business_end_hour',
            type: 'integer',
            default: 18,
          },
          {
            name: 'business_days',
            type: 'text',
            default: "'1,2,3,4,5'",
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // SLA違反テーブルの作成
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
            name: 'violation_time',
            type: 'timestamp',
            isNullable: false,
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
            name: 'is_escalated',
            type: 'boolean',
            default: false,
          },
          {
            name: 'escalated_to_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'escalated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'resolution_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_resolved',
            type: 'boolean',
            default: false,
          },
          {
            name: 'resolved_at',
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
      }),
      true,
    );

    // インデックスの作成
    await queryRunner.createIndex(
      'sla_configs',
      new TableIndex({
        name: 'IDX_sla_configs_application_id',
        columnNames: ['application_id'],
      }),
    );

    await queryRunner.createIndex(
      'sla_configs',
      new TableIndex({
        name: 'IDX_sla_configs_priority_level',
        columnNames: ['priority_level'],
      }),
    );

    await queryRunner.createIndex(
      'sla_configs',
      new TableIndex({
        name: 'IDX_sla_configs_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'sla_violations',
      new TableIndex({
        name: 'IDX_sla_violations_inquiry_id',
        columnNames: ['inquiry_id'],
      }),
    );

    await queryRunner.createIndex(
      'sla_violations',
      new TableIndex({
        name: 'IDX_sla_violations_sla_config_id',
        columnNames: ['sla_config_id'],
      }),
    );

    await queryRunner.createIndex(
      'sla_violations',
      new TableIndex({
        name: 'IDX_sla_violations_violation_type',
        columnNames: ['violation_type'],
      }),
    );

    await queryRunner.createIndex(
      'sla_violations',
      new TableIndex({
        name: 'IDX_sla_violations_severity',
        columnNames: ['severity'],
      }),
    );

    await queryRunner.createIndex(
      'sla_violations',
      new TableIndex({
        name: 'IDX_sla_violations_is_escalated',
        columnNames: ['is_escalated'],
      }),
    );

    await queryRunner.createIndex(
      'sla_violations',
      new TableIndex({
        name: 'IDX_sla_violations_is_resolved',
        columnNames: ['is_resolved'],
      }),
    );

    await queryRunner.createIndex(
      'sla_violations',
      new TableIndex({
        name: 'IDX_sla_violations_violation_time',
        columnNames: ['violation_time'],
      }),
    );

    await queryRunner.createIndex(
      'sla_violations',
      new TableIndex({
        name: 'IDX_sla_violations_escalated_at',
        columnNames: ['escalated_at'],
      }),
    );

    // 外部キー制約の追加
    await queryRunner.createForeignKey(
      'sla_configs',
      new TableForeignKey({
        columnNames: ['application_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'applications',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'sla_violations',
      new TableForeignKey({
        columnNames: ['inquiry_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'inquiries',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'sla_violations',
      new TableForeignKey({
        columnNames: ['sla_config_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sla_configs',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'sla_violations',
      new TableForeignKey({
        columnNames: ['escalated_to_user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Usersテーブルにmanager_idカラムを追加（エスカレーション階層のため）
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN manager_id uuid,
      ADD COLUMN slack_user_id varchar(255),
      ADD COLUMN teams_user_id varchar(255)
    `);

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_manager_id',
        columnNames: ['manager_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['manager_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // SLA設定のサンプルデータを挿入
    await queryRunner.query(`
      INSERT INTO sla_configs (application_id, priority_level, response_time_hours, resolution_time_hours, escalation_time_hours, business_hours_only)
      SELECT 
        id as application_id,
        'low' as priority_level,
        8 as response_time_hours,
        72 as resolution_time_hours,
        24 as escalation_time_hours,
        true as business_hours_only
      FROM applications
      WHERE EXISTS (SELECT 1 FROM applications)
      LIMIT 1;
    `);

    await queryRunner.query(`
      INSERT INTO sla_configs (application_id, priority_level, response_time_hours, resolution_time_hours, escalation_time_hours, business_hours_only)
      SELECT 
        id as application_id,
        'medium' as priority_level,
        4 as response_time_hours,
        48 as resolution_time_hours,
        12 as escalation_time_hours,
        true as business_hours_only
      FROM applications
      WHERE EXISTS (SELECT 1 FROM applications)
      LIMIT 1;
    `);

    await queryRunner.query(`
      INSERT INTO sla_configs (application_id, priority_level, response_time_hours, resolution_time_hours, escalation_time_hours, business_hours_only)
      SELECT 
        id as application_id,
        'high' as priority_level,
        2 as response_time_hours,
        24 as resolution_time_hours,
        4 as escalation_time_hours,
        false as business_hours_only
      FROM applications
      WHERE EXISTS (SELECT 1 FROM applications)
      LIMIT 1;
    `);

    await queryRunner.query(`
      INSERT INTO sla_configs (application_id, priority_level, response_time_hours, resolution_time_hours, escalation_time_hours, business_hours_only)
      SELECT 
        id as application_id,
        'critical' as priority_level,
        1 as response_time_hours,
        8 as resolution_time_hours,
        2 as escalation_time_hours,
        false as business_hours_only
      FROM applications
      WHERE EXISTS (SELECT 1 FROM applications)
      LIMIT 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 外部キー制約の削除
    const slaViolationsTable = await queryRunner.getTable('sla_violations');
    const slaConfigsTable = await queryRunner.getTable('sla_configs');
    const usersTable = await queryRunner.getTable('users');

    if (slaViolationsTable) {
      const foreignKeys = slaViolationsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('sla_violations', foreignKey);
      }
    }

    if (slaConfigsTable) {
      const foreignKeys = slaConfigsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('sla_configs', foreignKey);
      }
    }

    if (usersTable) {
      const managerForeignKey = usersTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('manager_id') !== -1
      );
      if (managerForeignKey) {
        await queryRunner.dropForeignKey('users', managerForeignKey);
      }
    }

    // インデックスの削除
    await queryRunner.dropIndex('sla_configs', 'IDX_sla_configs_application_id');
    await queryRunner.dropIndex('sla_configs', 'IDX_sla_configs_priority_level');
    await queryRunner.dropIndex('sla_configs', 'IDX_sla_configs_is_active');

    await queryRunner.dropIndex('sla_violations', 'IDX_sla_violations_inquiry_id');
    await queryRunner.dropIndex('sla_violations', 'IDX_sla_violations_sla_config_id');
    await queryRunner.dropIndex('sla_violations', 'IDX_sla_violations_violation_type');
    await queryRunner.dropIndex('sla_violations', 'IDX_sla_violations_severity');
    await queryRunner.dropIndex('sla_violations', 'IDX_sla_violations_is_escalated');
    await queryRunner.dropIndex('sla_violations', 'IDX_sla_violations_is_resolved');
    await queryRunner.dropIndex('sla_violations', 'IDX_sla_violations_violation_time');
    await queryRunner.dropIndex('sla_violations', 'IDX_sla_violations_escalated_at');

    await queryRunner.dropIndex('users', 'IDX_users_manager_id');

    // テーブルの削除
    await queryRunner.dropTable('sla_violations');
    await queryRunner.dropTable('sla_configs');

    // Usersテーブルから追加したカラムを削除
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS manager_id,
      DROP COLUMN IF EXISTS slack_user_id,
      DROP COLUMN IF EXISTS teams_user_id
    `);
  }
}