/**
 * アプリケーション設定
 * システム全体の設定を統合管理
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AppConfig {
  // アプリケーション基本設定
  app: {
    name: string;
    version: string;
    port: number;
    environment: string;
    debug: boolean;
  };

  // データベース設定
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
    synchronize: boolean;
    logging: boolean;
  };

  // Redis設定
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  // JWT設定
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };

  // OpenAI設定
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };

  // ベクトルデータベース設定
  vector: {
    dataDir: string;
    dimension: number;
    indexType: string;
  };

  // メール設定
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };

  // 通知設定
  notification: {
    defaultRecipients: string[];
    slackWebhookUrl?: string;
    teamsWebhookUrl?: string;
  };

  // ファイル設定
  file: {
    maxSize: number;
    allowedTypes: string[];
    uploadDir: string;
  };

  // レート制限設定
  rateLimit: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
  };
}

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * アプリケーション設定を取得
   */
  getAppConfig(): AppConfig {
    return {
      app: {
        name: this.configService.get<string>('APP_NAME', '問い合わせ管理システム'),
        version: this.configService.get<string>('APP_VERSION', '1.0.0'),
        port: this.configService.get<number>('PORT', 3000),
        environment: this.configService.get<string>('NODE_ENV', 'development'),
        debug: this.configService.get<string>('NODE_ENV', 'development') === 'development',
      },

      database: {
        host: this.configService.get<string>('DB_HOST', 'localhost'),
        port: this.configService.get<number>('DB_PORT', 5432),
        username: this.configService.get<string>('DB_USERNAME', 'postgres'),
        password: this.configService.get<string>('DB_PASSWORD', 'password'),
        database: this.configService.get<string>('DB_DATABASE', 'inquiry_management'),
        ssl: this.configService.get<string>('DB_SSL', 'false') === 'true',
        synchronize: this.configService.get<string>('NODE_ENV', 'development') === 'development',
        logging: this.configService.get<string>('NODE_ENV', 'development') === 'development',
      },

      redis: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
      },

      jwt: {
        secret: this.configService.get<string>('JWT_SECRET', 'default-secret-key'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
        refreshExpiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },

      openai: {
        apiKey: this.configService.get<string>('OPENAI_API_KEY', ''),
        model: this.configService.get<string>('OPENAI_MODEL', 'text-embedding-ada-002'),
        maxTokens: this.configService.get<number>('OPENAI_MAX_TOKENS', 4000),
      },

      vector: {
        dataDir: this.configService.get<string>('VECTOR_DATA_DIR', './data/vectors'),
        dimension: this.configService.get<number>('VECTOR_DIMENSION', 1536),
        indexType: this.configService.get<string>('VECTOR_INDEX_TYPE', 'IndexFlatIP'),
      },

      email: {
        host: this.configService.get<string>('SMTP_HOST', 'localhost'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
        user: this.configService.get<string>('SMTP_USER', ''),
        password: this.configService.get<string>('SMTP_PASS', ''),
        from: this.configService.get<string>('SMTP_FROM', 'noreply@example.com'),
      },

      notification: {
        defaultRecipients: this.configService
          .get<string>('DEFAULT_NOTIFICATION_RECIPIENTS', '')
          .split(',')
          .filter(email => email.trim()),
        slackWebhookUrl: this.configService.get<string>('SLACK_WEBHOOK_URL'),
        teamsWebhookUrl: this.configService.get<string>('TEAMS_WEBHOOK_URL'),
      },

      file: {
        maxSize: this.configService.get<number>('FILE_MAX_SIZE', 10 * 1024 * 1024), // 10MB
        allowedTypes: this.configService
          .get<string>('FILE_ALLOWED_TYPES', 'image/jpeg,image/png,image/gif,application/pdf,text/plain')
          .split(','),
        uploadDir: this.configService.get<string>('FILE_UPLOAD_DIR', './uploads'),
      },

      rateLimit: {
        windowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15分
        max: this.configService.get<number>('RATE_LIMIT_MAX', 100),
        skipSuccessfulRequests: this.configService.get<string>('RATE_LIMIT_SKIP_SUCCESS', 'false') === 'true',
      },
    };
  }

  /**
   * 特定の設定セクションを取得
   */
  getAppSettings() {
    return this.getAppConfig().app;
  }

  getDatabaseSettings() {
    return this.getAppConfig().database;
  }

  getRedisSettings() {
    return this.getAppConfig().redis;
  }

  getJwtSettings() {
    return this.getAppConfig().jwt;
  }

  getOpenAISettings() {
    return this.getAppConfig().openai;
  }

  getVectorSettings() {
    return this.getAppConfig().vector;
  }

  getEmailSettings() {
    return this.getAppConfig().email;
  }

  getNotificationSettings() {
    return this.getAppConfig().notification;
  }

  getFileSettings() {
    return this.getAppConfig().file;
  }

  getRateLimitSettings() {
    return this.getAppConfig().rateLimit;
  }

  /**
   * 設定の検証
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getAppConfig();

    // 必須設定のチェック
    if (!config.database.host) {
      errors.push('データベースホストが設定されていません');
    }

    if (!config.jwt.secret || config.jwt.secret === 'default-secret-key') {
      errors.push('JWT秘密鍵が適切に設定されていません');
    }

    if (!config.openai.apiKey) {
      errors.push('OpenAI APIキーが設定されていません');
    }

    if (!config.email.host) {
      errors.push('SMTPホストが設定されていません');
    }

    // ポート番号の妥当性チェック
    if (config.app.port < 1 || config.app.port > 65535) {
      errors.push('アプリケーションポート番号が無効です');
    }

    if (config.database.port < 1 || config.database.port > 65535) {
      errors.push('データベースポート番号が無効です');
    }

    // ファイルサイズの妥当性チェック
    if (config.file.maxSize < 1024) {
      errors.push('ファイル最大サイズが小さすぎます（最低1KB）');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 設定情報のサマリーを取得（機密情報を除く）
   */
  getConfigSummary() {
    const config = this.getAppConfig();
    
    return {
      app: config.app,
      database: {
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        ssl: config.database.ssl,
      },
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
      },
      vector: config.vector,
      file: {
        maxSize: config.file.maxSize,
        allowedTypes: config.file.allowedTypes,
      },
      rateLimit: config.rateLimit,
    };
  }
}