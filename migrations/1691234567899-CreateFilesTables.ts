import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateFilesTables1691234567899 implements MigrationInterface {
    name = 'CreateFilesTables1691234567899';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ファイルテーブルの作成
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
                        name: 'originalName',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                        comment: '元のファイル名',
                    },
                    {
                        name: 'filePath',
                        type: 'varchar',
                        length: '500',
                        isNullable: false,
                        comment: 'ファイルパス',
                    },
                    {
                        name: 'mimeType',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                        comment: 'MIMEタイプ',
                    },
                    {
                        name: 'size',
                        type: 'bigint',
                        isNullable: false,
                        comment: 'ファイルサイズ（バイト）',
                    },
                    {
                        name: 'fileHash',
                        type: 'varchar',
                        length: '64',
                        isNullable: true,
                        comment: 'ファイルハッシュ（SHA-256）',
                    },
                    {
                        name: 'inquiryId',
                        type: 'uuid',
                        isNullable: false,
                        comment: '関連する問い合わせID',
                    },
                    {
                        name: 'uploadedBy',
                        type: 'uuid',
                        isNullable: false,
                        comment: 'アップロードしたユーザーID',
                    },
                    {
                        name: 'isScanned',
                        type: 'boolean',
                        default: false,
                        comment: 'ウイルススキャン済みフラグ',
                    },
                    {
                        name: 'scanResult',
                        type: 'enum',
                        enum: ['pending', 'clean', 'infected', 'suspicious', 'error'],
                        default: "'pending'",
                        comment: 'スキャン結果',
                    },
                    {
                        name: 'scanDetails',
                        type: 'text',
                        isNullable: true,
                        comment: 'スキャン詳細情報',
                    },
                    {
                        name: 'scannedAt',
                        type: 'timestamp',
                        isNullable: true,
                        comment: 'スキャン実行日時',
                    },
                    {
                        name: 'isDeleted',
                        type: 'boolean',
                        default: false,
                        comment: '削除フラグ',
                    },
                    {
                        name: 'deletedAt',
                        type: 'timestamp',
                        isNullable: true,
                        comment: '削除日時',
                    },
                    {
                        name: 'deletedBy',
                        type: 'uuid',
                        isNullable: true,
                        comment: '削除実行者ID',
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                        comment: 'メタデータ（追加情報）',
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        comment: '作成日時',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        comment: '更新日時',
                    },
                ],
            }),
            true
        );

        // ファイルアクセスログテーブルの作成
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
                        name: 'fileId',
                        type: 'uuid',
                        isNullable: false,
                        comment: 'ファイルID',
                    },
                    {
                        name: 'userId',
                        type: 'uuid',
                        isNullable: true,
                        comment: 'アクセスしたユーザーID',
                    },
                    {
                        name: 'action',
                        type: 'enum',
                        enum: ['upload', 'download', 'view', 'delete', 'scan'],
                        isNullable: false,
                        comment: 'アクション種別',
                    },
                    {
                        name: 'ipAddress',
                        type: 'inet',
                        isNullable: true,
                        comment: 'IPアドレス',
                    },
                    {
                        name: 'userAgent',
                        type: 'text',
                        isNullable: true,
                        comment: 'ユーザーエージェント',
                    },
                    {
                        name: 'success',
                        type: 'boolean',
                        default: true,
                        comment: 'アクセス成功フラグ',
                    },
                    {
                        name: 'failureReason',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                        comment: '失敗理由',
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                        comment: '追加情報',
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        comment: 'アクセス日時',
                    },
                ],
            }),
            true
        );

        // インデックスの作成
        await queryRunner.createIndex(
            'files',
            new TableIndex({
                name: 'IDX_files_inquiry_deleted',
                columnNames: ['inquiryId', 'isDeleted'],
            })
        );

        await queryRunner.createIndex(
            'files',
            new TableIndex({
                name: 'IDX_files_uploader_created',
                columnNames: ['uploadedBy', 'createdAt'],
            })
        );

        await queryRunner.createIndex(
            'files',
            new TableIndex({
                name: 'IDX_files_mimetype_deleted',
                columnNames: ['mimeType', 'isDeleted'],
            })
        );

        await queryRunner.createIndex(
            'files',
            new TableIndex({
                name: 'IDX_files_hash',
                columnNames: ['fileHash'],
            })
        );

        await queryRunner.createIndex(
            'files',
            new TableIndex({
                name: 'IDX_files_scan_result',
                columnNames: ['scanResult'],
            })
        );

        await queryRunner.createIndex(
            'file_access_logs',
            new TableIndex({
                name: 'IDX_file_access_logs_file_created',
                columnNames: ['fileId', 'createdAt'],
            })
        );

        await queryRunner.createIndex(
            'file_access_logs',
            new TableIndex({
                name: 'IDX_file_access_logs_user_created',
                columnNames: ['userId', 'createdAt'],
            })
        );

        await queryRunner.createIndex(
            'file_access_logs',
            new TableIndex({
                name: 'IDX_file_access_logs_action_created',
                columnNames: ['action', 'createdAt'],
            })
        );

        // 外部キー制約の作成
        await queryRunner.createForeignKey(
            'files',
            new TableForeignKey({
                columnNames: ['inquiryId'],
                referencedTableName: 'inquiries',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
                name: 'FK_files_inquiry',
            })
        );

        await queryRunner.createForeignKey(
            'files',
            new TableForeignKey({
                columnNames: ['uploadedBy'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'RESTRICT',
                name: 'FK_files_uploader',
            })
        );

        await queryRunner.createForeignKey(
            'files',
            new TableForeignKey({
                columnNames: ['deletedBy'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
                name: 'FK_files_deleter',
            })
        );

        await queryRunner.createForeignKey(
            'file_access_logs',
            new TableForeignKey({
                columnNames: ['fileId'],
                referencedTableName: 'files',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
                name: 'FK_file_access_logs_file',
            })
        );

        await queryRunner.createForeignKey(
            'file_access_logs',
            new TableForeignKey({
                columnNames: ['userId'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
                name: 'FK_file_access_logs_user',
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 外部キー制約の削除
        await queryRunner.dropForeignKey('file_access_logs', 'FK_file_access_logs_user');
        await queryRunner.dropForeignKey('file_access_logs', 'FK_file_access_logs_file');
        await queryRunner.dropForeignKey('files', 'FK_files_deleter');
        await queryRunner.dropForeignKey('files', 'FK_files_uploader');
        await queryRunner.dropForeignKey('files', 'FK_files_inquiry');

        // インデックスの削除
        await queryRunner.dropIndex('file_access_logs', 'IDX_file_access_logs_action_created');
        await queryRunner.dropIndex('file_access_logs', 'IDX_file_access_logs_user_created');
        await queryRunner.dropIndex('file_access_logs', 'IDX_file_access_logs_file_created');
        await queryRunner.dropIndex('files', 'IDX_files_scan_result');
        await queryRunner.dropIndex('files', 'IDX_files_hash');
        await queryRunner.dropIndex('files', 'IDX_files_mimetype_deleted');
        await queryRunner.dropIndex('files', 'IDX_files_uploader_created');
        await queryRunner.dropIndex('files', 'IDX_files_inquiry_deleted');

        // テーブルの削除
        await queryRunner.dropTable('file_access_logs');
        await queryRunner.dropTable('files');
    }
}