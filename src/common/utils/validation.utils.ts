/**
 * バリデーション関連のユーティリティ関数
 * 要件: 1.2, 2.1, 3.3 (バリデーション機能の実装)
 */

import { ValidationError } from '../types';

/**
 * 複数のバリデーション結果をマージする
 */
export function mergeValidationResults(...results: { isValid: boolean; errors: string[] }[]): { isValid: boolean; errors: string[] } {
  const allErrors: string[] = [];
  
  for (const result of results) {
    if (!result.isValid) {
      allErrors.push(...result.errors);
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * バリデーションエラーを標準形式に変換
 */
export function formatValidationErrors(errors: string[], field?: string): ValidationError[] {
  return errors.map(error => ({
    field: field || 'unknown',
    message: error,
    code: 'VALIDATION_ERROR'
  }));
}

/**
 * 必須フィールドのチェック
 */
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`${field}は必須項目です`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 文字列の長さをチェック
 */
export function validateStringLength(
  value: string, 
  minLength: number, 
  maxLength: number, 
  fieldName: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!value) {
    errors.push(`${fieldName}は必須項目です`);
    return { isValid: false, errors };
  }
  
  if (value.length < minLength) {
    errors.push(`${fieldName}は${minLength}文字以上で入力してください`);
  }
  
  if (value.length > maxLength) {
    errors.push(`${fieldName}は${maxLength}文字以内で入力してください`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 数値の範囲をチェック
 */
export function validateNumberRange(
  value: number, 
  min: number, 
  max: number, 
  fieldName: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push(`${fieldName}は有効な数値である必要があります`);
    return { isValid: false, errors };
  }
  
  if (value < min) {
    errors.push(`${fieldName}は${min}以上である必要があります`);
  }
  
  if (value > max) {
    errors.push(`${fieldName}は${max}以下である必要があります`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 配列の要素数をチェック
 */
export function validateArrayLength(
  array: any[], 
  minLength: number, 
  maxLength: number, 
  fieldName: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(array)) {
    errors.push(`${fieldName}は配列である必要があります`);
    return { isValid: false, errors };
  }
  
  if (array.length < minLength) {
    errors.push(`${fieldName}は${minLength}個以上の要素が必要です`);
  }
  
  if (array.length > maxLength) {
    errors.push(`${fieldName}は${maxLength}個以下の要素である必要があります`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 列挙値のチェック
 */
export function validateEnum<T>(
  value: T, 
  enumObject: Record<string, T>, 
  fieldName: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validValues = Object.values(enumObject);
  
  if (!validValues.includes(value)) {
    errors.push(`${fieldName}は次の値から選択してください: ${validValues.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 正規表現パターンのチェック
 */
export function validatePattern(
  value: string, 
  pattern: RegExp, 
  fieldName: string, 
  errorMessage?: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!pattern.test(value)) {
    errors.push(errorMessage || `${fieldName}の形式が正しくありません`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 日付の妥当性をチェック
 */
export function validateDate(
  date: Date | string, 
  fieldName: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) {
    errors.push(`${fieldName}は有効な日付である必要があります`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 条件付きバリデーション
 */
export function validateConditional(
  condition: boolean,
  validationFn: () => { isValid: boolean; errors: string[] }
): { isValid: boolean; errors: string[] } {
  if (condition) {
    return validationFn();
  }
  
  return { isValid: true, errors: [] };
}

/**
 * 非同期バリデーション結果の統合
 */
export async function mergeAsyncValidationResults(
  ...validationPromises: Promise<{ isValid: boolean; errors: string[] }>[]
): Promise<{ isValid: boolean; errors: string[] }> {
  const results = await Promise.all(validationPromises);
  return mergeValidationResults(...results);
}

/**
 * カスタムバリデーション関数の型
 */
export type CustomValidator<T> = (value: T) => { isValid: boolean; errors: string[] } | Promise<{ isValid: boolean; errors: string[] }>;

/**
 * カスタムバリデーションの実行
 */
export async function runCustomValidation<T>(
  value: T,
  validators: CustomValidator<T>[]
): Promise<{ isValid: boolean; errors: string[] }> {
  const results = await Promise.all(
    validators.map(validator => validator(value))
  );
  
  return mergeValidationResults(...results);
}