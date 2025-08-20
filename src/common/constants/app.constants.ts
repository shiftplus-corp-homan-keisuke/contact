// アプリケーション定数
export const APP_CONSTANTS = {
    // API関連
    API_PREFIX: 'api/v1',
    API_VERSION: '1.0.0',

    // ページネーション
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,

    // ファイルアップロード
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],

    // レート制限
    DEFAULT_RATE_LIMIT: 1000, // 1時間あたり
    RATE_LIMIT_WINDOW: 60 * 60 * 1000, // 1時間（ミリ秒）

    // JWT
    JWT_EXPIRES_IN: '1d',
    JWT_REFRESH_EXPIRES_IN: '7d',

    // 問い合わせ関連
    INQUIRY_STATUS: {
        NEW: 'new',
        IN_PROGRESS: 'in_progress',
        PENDING: 'pending',
        RESOLVED: 'resolved',
        CLOSED: 'closed',
    } as const,

    INQUIRY_PRIORITY: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        URGENT: 'urgent',
    } as const,

    // ユーザー役割
    USER_ROLES: {
        ADMIN: 'admin',
        SUPPORT: 'support',
        VIEWER: 'viewer',
        API_USER: 'api_user',
    } as const,

    // 通知タイプ
    NOTIFICATION_TYPES: {
        EMAIL: 'email',
        SLACK: 'slack',
        TEAMS: 'teams',
        WEBHOOK: 'webhook',
    } as const,

    // ベクトル検索
    VECTOR_DIMENSION: 1536, // OpenAI Embeddings dimension
    VECTOR_SEARCH_LIMIT: 10,

    // FAQ
    FAQ_GENERATION: {
        MIN_CLUSTER_SIZE: 3,
        MAX_CLUSTERS: 50,
        SIMILARITY_THRESHOLD: 0.8,
    },
} as const;

// 型定義
export type InquiryStatus = typeof APP_CONSTANTS.INQUIRY_STATUS[keyof typeof APP_CONSTANTS.INQUIRY_STATUS];
export type InquiryPriority = typeof APP_CONSTANTS.INQUIRY_PRIORITY[keyof typeof APP_CONSTANTS.INQUIRY_PRIORITY];
export type UserRole = typeof APP_CONSTANTS.USER_ROLES[keyof typeof APP_CONSTANTS.USER_ROLES];
export type NotificationType = typeof APP_CONSTANTS.NOTIFICATION_TYPES[keyof typeof APP_CONSTANTS.NOTIFICATION_TYPES];