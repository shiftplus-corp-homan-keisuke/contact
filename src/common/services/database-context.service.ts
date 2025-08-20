/**
 * データベースコンテキストサービス
 * トリガー内で現在のユーザーIDを取得するためのコンテキスト管理
 */

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseContextService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    /**
     * 現在のユーザーIDをデータベースセッションに設定
     * トリガー内でcurrent_setting('app.current_user_id')で取得可能
     */
    async setCurrentUserId(userId: string): Promise<void> {
        await this.dataSource.query(
            `SELECT set_config('app.current_user_id', $1, true)`,
            [userId]
        );
    }

    /**
     * 現在のユーザーIDをクリア
     */
    async clearCurrentUserId(): Promise<void> {
        await this.dataSource.query(
            `SELECT set_config('app.current_user_id', '', true)`
        );
    }

    /**
     * 現在のIPアドレスをデータベースセッションに設定
     */
    async setCurrentIpAddress(ipAddress: string): Promise<void> {
        await this.dataSource.query(
            `SELECT set_config('app.current_ip_address', $1, true)`,
            [ipAddress]
        );
    }

    /**
     * 現在のIPアドレスをクリア
     */
    async clearCurrentIpAddress(): Promise<void> {
        await this.dataSource.query(
            `SELECT set_config('app.current_ip_address', '', true)`
        );
    }

    /**
     * 複数のコンテキスト値を一度に設定
     */
    async setContext(context: {
        userId?: string;
        ipAddress?: string;
        sessionId?: string;
    }): Promise<void> {
        const queries: Promise<any>[] = [];

        if (context.userId) {
            queries.push(
                this.dataSource.query(
                    `SELECT set_config('app.current_user_id', $1, true)`,
                    [context.userId]
                )
            );
        }

        if (context.ipAddress) {
            queries.push(
                this.dataSource.query(
                    `SELECT set_config('app.current_ip_address', $1, true)`,
                    [context.ipAddress]
                )
            );
        }

        if (context.sessionId) {
            queries.push(
                this.dataSource.query(
                    `SELECT set_config('app.current_session_id', $1, true)`,
                    [context.sessionId]
                )
            );
        }

        await Promise.all(queries);
    }

    /**
     * 全てのコンテキスト値をクリア
     */
    async clearContext(): Promise<void> {
        await Promise.all([
            this.dataSource.query(`SELECT set_config('app.current_user_id', '', true)`),
            this.dataSource.query(`SELECT set_config('app.current_ip_address', '', true)`),
            this.dataSource.query(`SELECT set_config('app.current_session_id', '', true)`),
        ]);
    }

    /**
     * トランザクション内でコンテキストを設定して処理を実行
     */
    async executeWithContext<T>(
        context: {
            userId?: string;
            ipAddress?: string;
            sessionId?: string;
        },
        operation: () => Promise<T>
    ): Promise<T> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // コンテキストを設定
            if (context.userId) {
                await queryRunner.query(
                    `SELECT set_config('app.current_user_id', $1, true)`,
                    [context.userId]
                );
            }

            if (context.ipAddress) {
                await queryRunner.query(
                    `SELECT set_config('app.current_ip_address', $1, true)`,
                    [context.ipAddress]
                );
            }

            if (context.sessionId) {
                await queryRunner.query(
                    `SELECT set_config('app.current_session_id', $1, true)`,
                    [context.sessionId]
                );
            }

            // 操作を実行
            const result = await operation();

            await queryRunner.commitTransaction();
            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * 現在のコンテキスト値を取得
     */
    async getCurrentContext(): Promise<{
        userId?: string;
        ipAddress?: string;
        sessionId?: string;
    }> {
        const [userIdResult, ipAddressResult, sessionIdResult] = await Promise.all([
            this.dataSource.query(`SELECT current_setting('app.current_user_id', true) as value`),
            this.dataSource.query(`SELECT current_setting('app.current_ip_address', true) as value`),
            this.dataSource.query(`SELECT current_setting('app.current_session_id', true) as value`),
        ]);

        return {
            userId: userIdResult[0]?.value || undefined,
            ipAddress: ipAddressResult[0]?.value || undefined,
            sessionId: sessionIdResult[0]?.value || undefined,
        };
    }
}