/**
 * ユーザーバリデーション関数のテスト
 * 要件: 4.1, 4.2 (ユーザー管理機能のテスト)
 */

import { validateEmail, validatePassword, validateUserName } from '../user.validators';

describe('User Validators', () => {
  describe('validateEmail', () => {
    it('有効なメールアドレスを受け入れる', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.jp',
        'admin+test@company.org'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('無効なメールアドレスを拒否する', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    it('有効なパスワードを受け入れる', () => {
      const validPasswords = [
        'Password123!',
        'MySecure@Pass1',
        'Complex$Password9'
      ];

      validPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('短すぎるパスワードを拒否する', () => {
      const result = validatePassword('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードは8文字以上である必要があります');
    });

    it('長すぎるパスワードを拒否する', () => {
      const longPassword = 'A'.repeat(130) + '1!';
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードは128文字以内である必要があります');
    });

    it('小文字が含まれていないパスワードを拒否する', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードには小文字を含む必要があります');
    });

    it('大文字が含まれていないパスワードを拒否する', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードには大文字を含む必要があります');
    });

    it('数字が含まれていないパスワードを拒否する', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードには数字を含む必要があります');
    });

    it('特殊文字が含まれていないパスワードを拒否する', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('パスワードには特殊文字(@$!%*?&)を含む必要があります');
    });
  });

  describe('validateUserName', () => {
    it('有効な名前を受け入れる', () => {
      const validNames = [
        '田中太郎',
        'John Doe',
        '山田 花子',
        'Alice Smith-Johnson'
      ];

      validNames.forEach(name => {
        const result = validateUserName(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('空の名前を拒否する', () => {
      const result = validateUserName('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('名前は必須項目です');
    });

    it('空白のみの名前を拒否する', () => {
      const result = validateUserName('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('名前は必須項目です');
    });

    it('長すぎる名前を拒否する', () => {
      const longName = 'A'.repeat(256);
      const result = validateUserName(longName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('名前は255文字以内で入力してください');
    });

    it('不正な文字を含む名前を拒否する', () => {
      const invalidNames = [
        '<script>alert("xss")</script>',
        'Name with "quotes"',
        "Name with 'single quotes'",
        'Name with & ampersand'
      ];

      invalidNames.forEach(name => {
        const result = validateUserName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('名前に使用できない文字が含まれています');
      });
    });
  });
});