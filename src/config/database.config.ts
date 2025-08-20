import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';

// エンティティを明示的にインポート
import { User } from '../modules/users/entities/user.entity';
import { Role } from '../modules/users/entities/role.entity';
import { UserHistory } from '../modules/users/entities/user-history.entity';
import { AuthAttempt } from '../modules/auth/entities/auth-attempt.entity';
import { ApiKey } from '../modules/api-keys/entities/api-key.entity';
import { RateLimitTracking } from '../modules/api-keys/entities/rate-limit-tracking.entity';

export const databaseConfig = (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'inquiry_management',
    entities: [
        User,
        Role,
        UserHistory,
        AuthAttempt,
        ApiKey,
        RateLimitTracking,
    ],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    autoLoadEntities: false, // 明示的にエンティティを指定するためfalseに
});

// TypeORM CLI用のデータソース設定
const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'inquiry_management',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
    synchronize: false,
    logging: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);