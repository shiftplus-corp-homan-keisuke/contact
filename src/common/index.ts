/**
 * 共通機能の統合エクスポート
 * 真の共通機能のみをエクスポート
 */

// 真の共通機能（全モジュール共通）
export * from './guards/permissions.guard';
export * from './decorators/current-user.decorator';
export * from './filters/global-exception.filter';
export * from './interceptors/logging.interceptor';

// 共通ユーティリティ
export * from './utils/validation.utils';
export * from './utils/date.util';
export * from './utils/id-generator.util';

// 共通定数
export * from './constants/app.constants';

// 共通型定義
export * from './types';

// 共通バリデーション
export * from './validators';

// 共通DTO
export * from './dto/base-response.dto';
export * from './dto/pagination.dto';

// 基底エンティティ
export * from './entities/base.entity';