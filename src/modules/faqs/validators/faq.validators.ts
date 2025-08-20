import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isValidFAQContent', async: false })
export class IsValidFAQContentConstraint implements ValidatorConstraintInterface {
    validate(text: string, args: ValidationArguments) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        // 最小文字数チェック
        if (text.trim().length < 10) {
            return false;
        }

        // 最大文字数チェック
        if (text.length > 5000) {
            return false;
        }

        // HTMLタグの基本的なチェック（セキュリティ）
        const dangerousTags = /<script|<iframe|<object|<embed|<form/i;
        if (dangerousTags.test(text)) {
            return false;
        }

        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return 'FAQ内容は10文字以上5000文字以下で、危険なHTMLタグを含まないようにしてください';
    }
}

@ValidatorConstraint({ name: 'isValidFAQTags', async: false })
export class IsValidFAQTagsConstraint implements ValidatorConstraintInterface {
    validate(tags: string[], args: ValidationArguments) {
        if (!tags || !Array.isArray(tags)) {
            return true; // オプショナルなので空でもOK
        }

        // タグ数の制限
        if (tags.length > 10) {
            return false;
        }

        // 各タグの文字数制限
        for (const tag of tags) {
            if (typeof tag !== 'string' || tag.trim().length === 0 || tag.length > 50) {
                return false;
            }
        }

        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return 'タグは最大10個まで、各タグは1文字以上50文字以下にしてください';
    }
}

export const FAQ_VALIDATION_RULES = {
    QUESTION_MIN_LENGTH: 5,
    QUESTION_MAX_LENGTH: 500,
    ANSWER_MIN_LENGTH: 10,
    ANSWER_MAX_LENGTH: 5000,
    CATEGORY_MAX_LENGTH: 100,
    TAG_MAX_LENGTH: 50,
    MAX_TAGS: 10,
} as const;