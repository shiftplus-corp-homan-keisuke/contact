/**
 * 問い合わせバリデーション関数のテスト
 * 要件: 1.1, 1.3, 1.4 (問い合わせ登録機能のテスト)
 */

import { 
  validateInquiryTitle, 
  validateInquiryContent, 
  validateInquiryPriority,
  validateSearchQuery 
} from '../../../modules/inquiries/validators/inquiry.validators';
import { InquiryPriority } from '../../types/inquiry.types';

describe('Inquiry Validators', () => {
  describe('validateInquiryTitle', () => {
    it('有効なタイトルを受け入れる', () => {
      const validTitles = [
        'ログインできません',
        'アプリがクラッシュする問題について',
        'データの同期に関する質問'
      ];

      validTitles.forEach(title => {
        const result = validateInquiryTitle(title);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('空のタイトルを拒否する', () => {
      const result = validateInquiryTitle('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('タイトルは必須項目です');
    });

    it('空白のみのタイトルを拒否する', () => {
      const result = validateInquiryTitle('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('タイトルは必須項目です');
    });

    it('長すぎるタイトルを拒否する', () => {
      const longTitle = 'A'.repeat(501);
      const result = validateInquiryTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('タイトルは500文字以内で入力してください');
    });

    it('HTMLタグを含むタイトルを拒否する', () => {
      const htmlTitle = '<script>alert("xss")</script>タイトル';
      const result = validateInquiryTitle(htmlTitle);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('タイトルにHTMLタグは使用できません');
    });
  });

  describe('validateInquiryContent', () => {
    it('有効な内容を受け入れる', () => {
      const validContent = 'アプリを起動しようとすると、エラーメッセージが表示されて起動できません。解決方法を教えてください。';
      const result = validateInquiryContent(validContent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空の内容を拒否する', () => {
      const result = validateInquiryContent('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内容は必須項目です');
    });

    it('空白のみの内容を拒否する', () => {
      const result = validateInquiryContent('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内容は必須項目です');
    });

    it('短すぎる内容を拒否する', () => {
      const result = validateInquiryContent('短い');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内容は10文字以上で入力してください');
    });

    it('長すぎる内容を拒否する', () => {
      const longContent = 'A'.repeat(10001);
      const result = validateInquiryContent(longContent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内容は10000文字以内で入力してください');
    });
  });

  describe('validateInquiryPriority', () => {
    it('有効な優先度を受け入れる', () => {
      const validPriorities = Object.values(InquiryPriority);
      
      validPriorities.forEach(priority => {
        const result = validateInquiryPriority(priority);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('無効な優先度を拒否する', () => {
      const result = validateInquiryPriority('invalid_priority');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('優先度は次の値から選択してください');
    });

    it('空の優先度を受け入れる（オプショナル）', () => {
      const result = validateInquiryPriority('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSearchQuery', () => {
    it('有効な検索クエリを受け入れる', () => {
      const validQueries = [
        'ログイン エラー',
        'アプリ クラッシュ',
        '同期 問題'
      ];

      validQueries.forEach(query => {
        const result = validateSearchQuery(query);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('長すぎる検索クエリを拒否する', () => {
      const longQuery = 'A'.repeat(1001);
      const result = validateSearchQuery(longQuery);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('検索クエリは1000文字以内で入力してください');
    });

    it('SQLインジェクションの可能性がある検索クエリを拒否する', () => {
      const dangerousQueries = [
        'SELECT * FROM users',
        "'; DROP TABLE users; --",
        'UNION SELECT password FROM users',
        '/* comment */ SELECT',
        '1 OR 1=1'
      ];

      dangerousQueries.forEach(query => {
        const result = validateSearchQuery(query);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('検索クエリに不正な文字列が含まれています');
      });
    });

    it('空の検索クエリを受け入れる', () => {
      const result = validateSearchQuery('');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});