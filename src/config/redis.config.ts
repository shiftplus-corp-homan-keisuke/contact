import { RedisOptions } from 'ioredis';

export const redisConfig = (): RedisOptions => ({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    keyPrefix: 'inquiry_mgmt:',
});