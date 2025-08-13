/**
 * 共通バリデーション関数の統合エクスポート
 * 要件: 2.1, 3.3, 1.2 (TypeScriptインターフェースとバリデーション関数の実装)
 * 
 * 注意: 機能固有のバリデーションは各モジュールに移行済み
 * - ユーザー関連: src/modules/users/validators/
 * - 問い合わせ関連: src/modules/inquiries/validators/
 * - 回答関連: src/modules/responses/validators/
 * - FAQ関連: src/modules/faqs/validators/
 */

// 共通バリデーション関数
export function validateUUID(uuid: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuid) {
    errors.push('UUIDは必須項目です');
  } else if (!uuidRegex.test(uuid)) {
    errors.push('有効なUUID形式で入力してください');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateDateRange(startDate: Date, endDate: Date): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!startDate || !endDate) {
    errors.push('開始日と終了日は必須項目です');
    return { isValid: false, errors };
  }
  
  if (startDate >= endDate) {
    errors.push('開始日は終了日より前である必要があります');
  }
  
  // 未来の日付チェック
  const now = new Date();
  if (endDate > now) {
    errors.push('終了日は現在日時以前である必要があります');
  }
  
  // 範囲チェック（1年以内）
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (startDate < oneYearAgo) {
    errors.push('開始日は1年以内の日付を指定してください');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validatePaginationOptions(page?: number, limit?: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (page !== undefined) {
    if (!Number.isInteger(page) || page < 1) {
      errors.push('ページ番号は1以上の整数である必要があります');
    }
  }
  
  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit < 1) {
      errors.push('取得件数は1以上の整数である必要があります');
    } else if (limit > 100) {
      errors.push('取得件数は100以下である必要があります');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // HTMLタグの除去
    .replace(/['"]/g, '') // クォートの除去
    .replace(/\s+/g, ' '); // 連続する空白の正規化
}

export function validateFileType(filename: string, allowedTypes: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!filename) {
    errors.push('ファイル名は必須項目です');
    return { isValid: false, errors };
  }
  
  const extension = filename.toLowerCase().split('.').pop();
  if (!extension) {
    errors.push('ファイル拡張子が必要です');
    return { isValid: false, errors };
  }
  
  if (!allowedTypes.includes(extension)) {
    errors.push(`許可されていないファイル形式です。許可される形式: ${allowedTypes.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateFileSize(size: number, maxSize: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (size <= 0) {
    errors.push('ファイルサイズが無効です');
  } else if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    errors.push(`ファイルサイズは${maxSizeMB}MB以下である必要があります`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 共通のエラーメッセージ定数
export const VALIDATION_MESSAGES = {
  REQUIRED: '必須項目です',
  INVALID_FORMAT: '形式が正しくありません',
  TOO_LONG: '文字数が上限を超えています',
  TOO_SHORT: '文字数が不足しています',
  INVALID_EMAIL: 'メールアドレスの形式が正しくありません',
  INVALID_UUID: '有効なUUID形式で入力してください',
  INVALID_DATE: '有効な日付形式で入力してください',
  INVALID_NUMBER: '有効な数値で入力してください',
  PERMISSION_DENIED: '権限がありません',
  NOT_FOUND: '指定されたリソースが見つかりません',
  ALREADY_EXISTS: '既に存在します',
  INVALID_CREDENTIALS: '認証情報が正しくありません'
} as const;