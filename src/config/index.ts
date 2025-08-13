/**
 * 設定ファイルのインデックス
 * 全ての設定を統合管理
 */

export { DatabaseConfig, AppDataSource } from './database.config';
export { LoggerConfig } from './logger.config';
export { RedisConfig } from './redis.config';
export { AppConfigService, type AppConfig } from './app.config';

// 設定の検証関数
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 必須環境変数のチェック
  const requiredEnvVars = [
    'DB_HOST',
    'DB_USERNAME', 
    'DB_PASSWORD',
    'DB_DATABASE',
    'JWT_SECRET',
    'OPENAI_API_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`環境変数 ${envVar} が設定されていません`);
    }
  }

  // JWT秘密鍵の強度チェック
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && (jwtSecret === 'default-secret-key' || jwtSecret.length < 32)) {
    errors.push('JWT_SECRET は32文字以上の安全な値を設定してください');
  }

  // データベースポートの妥当性チェック
  const dbPort = process.env.DB_PORT;
  if (dbPort && (isNaN(Number(dbPort)) || Number(dbPort) < 1 || Number(dbPort) > 65535)) {
    errors.push('DB_PORT は1-65535の範囲で設定してください');
  }

  // アプリケーションポートの妥当性チェック
  const appPort = process.env.PORT;
  if (appPort && (isNaN(Number(appPort)) || Number(appPort) < 1 || Number(appPort) > 65535)) {
    errors.push('PORT は1-65535の範囲で設定してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// 設定のサマリーを取得（機密情報を除く）
export function getConfigSummary() {
  return {
    environment: process.env.NODE_ENV || 'development',
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_DATABASE || 'inquiry_management',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    },
    app: {
      port: process.env.PORT || 3000,
      name: process.env.APP_NAME || '問い合わせ管理システム',
      version: process.env.APP_VERSION || '1.0.0',
    },
  };
}