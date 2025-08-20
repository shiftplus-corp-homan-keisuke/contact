import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from 'class-validator';
import { ValidationUtils } from '../utils';

/**
 * 強力なパスワードかどうかを検証するデコレーター
 */
export function IsStrongPassword(minLength: number = 8, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isStrongPassword',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [minLength],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [minLen] = args.constraints;
                    return typeof value === 'string' && ValidationUtils.isStrongPassword(value, minLen);
                },
                defaultMessage(args: ValidationArguments) {
                    const [minLen] = args.constraints;
                    return `パスワードは${minLen}文字以上で、大文字・小文字・数字・特殊文字を含む必要があります`;
                },
            },
        });
    };
}

/**
 * 安全なファイル名かどうかを検証するデコレーター
 */
export function IsSafeFilename(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isSafeFilename',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    return typeof value === 'string' && ValidationUtils.isSafeFilename(value);
                },
                defaultMessage() {
                    return 'ファイル名に危険な文字が含まれています';
                },
            },
        });
    };
}

/**
 * SQLインジェクションのリスクがないかを検証するデコレーター
 */
export function IsNotSqlInjection(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isNotSqlInjection',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    return typeof value === 'string' && !ValidationUtils.hasSqlInjectionRisk(value);
                },
                defaultMessage() {
                    return '入力値にSQLインジェクションのリスクがあります';
                },
            },
        });
    };
}

/**
 * XSS攻撃のリスクがないかを検証するデコレーター
 */
export function IsNotXss(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isNotXss',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    return typeof value === 'string' && !ValidationUtils.hasXssRisk(value);
                },
                defaultMessage() {
                    return '入力値にXSS攻撃のリスクがあります';
                },
            },
        });
    };
}

/**
 * 日本の電話番号形式かどうかを検証するデコレーター
 */
export function IsJapanesePhoneNumber(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isJapanesePhoneNumber',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    return typeof value === 'string' && ValidationUtils.isValidPhoneNumber(value);
                },
                defaultMessage() {
                    return '正しい日本の電話番号形式で入力してください';
                },
            },
        });
    };
}