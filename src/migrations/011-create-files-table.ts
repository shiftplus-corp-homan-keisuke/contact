import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * ファイル管理テーブル作成マイグレーション
 * 要件: 11.1 基本ファイル管理機能の実装
 */
export class CreateFilesTable1704067200000 implements MigrationInterface {
  name = 'CreateFilesTable1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ファイルテーブル作成
    await queryRunner.createTable(
      new Table({
        name: 'files',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'ファイル名',
          },
          {
            name: 'original_filename',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: '元のファイル名',
          },
          {
            name: 'size',
            type: 'bigint',
            isNullable: false,
            comment: 'ファイルサイズ（バイト）',
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'MIMEタイプ',
          },
          {
            name: 'file_path',
            type: 'varchar',
            length: '500',
            isNullable: false,
            comment: 'ファイルの保存パス',
          },
          {
            name: 'file_hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
            comment: 'ファイルのハッシュ値（重複チェック用）',
          },
          {
            name: 'inquiry_id',
            type: 'uuid',
            isNullable: false,
            comment: '関連する問い合わせID',
          },
          {
            name: 'uploaded_by',
            type: 'uuid',
            isNullable: false,
            comment: 'アップロードしたユーザーID',
          },
          {
            name: 'uploaded_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: 'アップロード日時',
          },
          {
            name: 'is_scanned',
            type: 'boolean',
            default: false,
            comment: 'ウイルススキャン済みフラグ',
          },
          {
            name: 'scan_result',
            type: 'enum',
            enum: ['clean', 'infected', 'suspicious', 'pending'],
            default: "'pending'",
            comment: 'スキャン結果',
          },
          {
            name: 'scanned_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'スキャン日時',
          },
          {
            name: 'is_deleted',
            type: 'boolean',
            default: false,
            comment: 'ファイルが削除されているかどうか',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
            comment: '削除日時',
          },
          {
            name: 'deleted_by',
            type: 'uuid',
            isNullable: true,
            comment: '削除したユーザーID',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: 'ファイルの説明・コメント',
          },
          {
            name: 'download_count',
            type: 'integer',
            default: 0,
            comment: 'ダウンロード回数',
          },
          {
            name: 'last_downloaded_at',
            type: 'timestamp',
            isNullable: true,
            comment: '最終ダウンロード日時',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
            comment: '有効期限',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: '作成日時',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            comment: '更新日時',
          },
        ],
      }),
      true,
    );

    // インデックス作成
    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_inquiry_id_is_deleted',
        columnNames: ['inquiry_id', 'is_deleted'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_uploaded_by_uploaded_at',
        columnNames: ['uploaded_by', 'uploaded_at'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_mime_type',
        columnNames: ['mime_type'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_scan_result',
        columnNames: ['scan_result'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_file_hash',
        columnNames: ['file_hash'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_uploaded_at',
        columnNames: ['uploaded_at'],
      }),
    );

    // 外部キー制約作成
    await queryRunner.createForeignKey(
      'files',
      new TableForeignKey({
        columnNames: ['inquiry_id'],
        referencedTableName: 'inquiries',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_files_inquiry_id',
      }),
    );

    await queryRunner.createForeignKey(
      'files',
      new TableForeignKey({
        columnNames: ['uploaded_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        name: 'FK_files_uploaded_by',
      }),
    );

    await queryRunner.createForeignKey(
      'files',
      new TableForeignKey({
        columnNames: ['deleted_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_files_deleted_by',
      }),
    );

    // ファイルアクセスログテーブル作成
    await queryRunner.createTable(
      new Table({
        name: 'file_access_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'file_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ファイルID',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ユーザーID',
          },
          {
            name: 'action',
            type: 'enum',
            enum: ['upload', 'download', 'view', 'delete', 'update'],
            isNullable: false,
            comment: 'アクセス種別',
          },
          {
            name: 'ip_address',
            type: 'inet',
            isNullable: true,
            comment: 'IPアドレス',
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
            comment: 'ユーザーエージェント',
          },
          {
            name: 'accessed_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: 'アクセス日時',
          },
          {
            name: 'success',
            type: 'boolean',
            default: true,
            comment: '成功フラグ',
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
            comment: 'エラーメッセージ',
          },
        ],
      }),
      true,
    );

    // ファイルアクセスログのインデックス作成
    await queryRunner.createIndex(
      'file_access_logs',
      new TableIndex({
        name: 'IDX_file_access_logs_file_id_accessed_at',
        columnNames: ['file_id', 'accessed_at'],
      }),
    );

    await queryRunner.createIndex(
      'file_access_logs',
      new TableIndex({
        name: 'IDX_file_access_logs_user_id_accessed_at',
        columnNames: ['user_id', 'accessed_at'],
      }),
    );

    await queryRunner.createIndex(
      'file_access_logs',
      new TableIndex({
        name: 'IDX_file_access_logs_action',
        columnNames: ['action'],
      }),
    );

    // ファイルアクセスログの外部キー制約
    await queryRunner.createForeignKey(
      'file_access_logs',
      new TableForeignKey({
        columnNames: ['file_id'],
        referencedTableName: 'files',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_file_access_logs_file_id',
      }),
    );

    await queryRunner.createForeignKey(
      'file_access_logs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_file_access_logs_user_id',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 外部キー制約削除
    await queryRunner.dropForeignKey('file_access_logs', 'FK_file_access_logs_user_id');
    await queryRunner.dropForeignKey('file_access_logs', 'FK_file_access_logs_file_id');
    await queryRunner.dropForeignKey('files', 'FK_files_deleted_by');
    await queryRunner.dropForeignKey('files', 'FK_files_uploaded_by');
    await queryRunner.dropForeignKey('files', 'FK_files_inquiry_id');

    // インデックス削除
    await queryRunner.dropIndex('file_access_logs', 'IDX_file_access_logs_action');
    await queryRunner.dropIndex('file_access_logs', 'IDX_file_access_logs_user_id_accessed_at');
    await queryRunner.dropIndex('file_access_logs', 'IDX_file_access_logs_file_id_accessed_at');
    await queryRunner.dropIndex('files', 'IDX_files_uploaded_at');
    await queryRunner.dropIndex('files', 'IDX_files_expires_at');
    await queryRunner.dropIndex('files', 'IDX_files_file_hash');
    await queryRunner.dropIndex('files', 'IDX_files_scan_result');
    await queryRunner.dropIndex('files', 'IDX_files_mime_type');
    await queryRunner.dropIndex('files', 'IDX_files_uploaded_by_uploaded_at');
    await queryRunner.dropIndex('files', 'IDX_files_inquiry_id_is_deleted');

    // テーブル削除
    await queryRunner.dropTable('file_access_logs');
    await queryRunner.dropTable('files');
  }
}