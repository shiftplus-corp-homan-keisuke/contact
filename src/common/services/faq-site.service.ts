/**
 * FAQ公開サイト管理サービス
 * 要件: 6.3, 6.4 (FAQ公開システムの実装)
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FAQ } from '../entities/faq.entity';
import { Application } from '../entities/application.entity';
import { FAQSite, FAQSiteConfig } from '../types/faq.types';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FAQSiteGenerationOptions {
  theme?: 'light' | 'dark' | 'auto';
  customCSS?: string;
  includeSearch?: boolean;
  includeCategories?: boolean;
  sortBy?: 'orderIndex' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface GeneratedSite {
  url: string;
  path: string;
  faqCount: number;
  categories: string[];
  lastGenerated: Date;
}

@Injectable()
export class FAQSiteService {
  private readonly logger = new Logger(FAQSiteService.name);
  private readonly sitesDirectory = path.join(process.cwd(), 'public', 'faq-sites');

  constructor(
    @InjectRepository(FAQ)
    private readonly faqRepository: Repository<FAQ>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  /**
   * FAQ公開サイトの生成
   * 要件: 6.3 (静的サイト生成機能の実装)
   */
  async generateFAQSite(
    appId: string,
    options: FAQSiteGenerationOptions = {}
  ): Promise<GeneratedSite> {
    this.logger.log(`FAQ公開サイト生成開始: appId=${appId}`);

    // アプリケーション存在確認
    const application = await this.applicationRepository.findOne({
      where: { id: appId }
    });

    if (!application) {
      throw new NotFoundException(`アプリケーションが見つかりません: ${appId}`);
    }

    // 公開済みFAQの取得
    const faqs = await this.getPublishedFAQs(appId, options);

    if (faqs.length === 0) {
      throw new BadRequestException('公開済みのFAQが存在しません');
    }

    // サイト生成
    const siteData = await this.buildSiteData(application, faqs, options);
    const sitePath = await this.generateStaticSite(appId, siteData, options);
    const siteUrl = this.generateSiteUrl(appId);

    const result: GeneratedSite = {
      url: siteUrl,
      path: sitePath,
      faqCount: faqs.length,
      categories: this.extractCategories(faqs),
      lastGenerated: new Date(),
    };

    this.logger.log(`FAQ公開サイト生成完了: ${result.faqCount}件のFAQ`);
    return result;
  }

  /**
   * FAQ公開サイトの更新
   * 要件: 6.4 (FAQ更新時の自動反映機能)
   */
  async updateFAQSite(appId: string): Promise<GeneratedSite> {
    this.logger.log(`FAQ公開サイト更新開始: appId=${appId}`);

    // 既存サイトの設定を取得（存在する場合）
    const existingConfig = await this.getSiteConfig(appId);
    const options: FAQSiteGenerationOptions = existingConfig || {};

    // サイト再生成
    return await this.generateFAQSite(appId, options);
  }

  /**
   * 複数アプリのFAQ公開サイト一括更新
   * 要件: 6.4 (FAQ更新時の自動反映機能)
   */
  async updateAllFAQSites(): Promise<{ [appId: string]: GeneratedSite | Error }> {
    this.logger.log('全FAQ公開サイト一括更新開始');

    const applications = await this.applicationRepository.find();
    const results: { [appId: string]: GeneratedSite | Error } = {};

    for (const app of applications) {
      try {
        // 公開済みFAQが存在するアプリのみ更新
        const publishedFAQCount = await this.faqRepository.count({
          where: { appId: app.id, isPublished: true }
        });

        if (publishedFAQCount > 0) {
          results[app.id] = await this.updateFAQSite(app.id);
        } else {
          this.logger.log(`スキップ: 公開済みFAQなし appId=${app.id}`);
        }
      } catch (error) {
        this.logger.error(`FAQ公開サイト更新エラー: appId=${app.id}`, error);
        results[app.id] = error instanceof Error ? error : new Error('不明なエラー');
      }
    }

    this.logger.log(`全FAQ公開サイト一括更新完了: ${Object.keys(results).length}アプリ`);
    return results;
  }

  /**
   * FAQ公開サイトの削除
   */
  async deleteFAQSite(appId: string): Promise<void> {
    this.logger.log(`FAQ公開サイト削除開始: appId=${appId}`);

    const sitePath = path.join(this.sitesDirectory, appId);
    
    try {
      await fs.access(sitePath);
      await fs.rm(sitePath, { recursive: true, force: true });
      this.logger.log(`FAQ公開サイト削除完了: appId=${appId}`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.warn(`FAQ公開サイトが存在しません: appId=${appId}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * FAQ公開サイトの存在確認
   */
  async checkFAQSiteExists(appId: string): Promise<boolean> {
    const sitePath = path.join(this.sitesDirectory, appId, 'index.html');
    
    try {
      await fs.access(sitePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * FAQ公開サイトの情報取得
   */
  async getFAQSiteInfo(appId: string): Promise<FAQSite | null> {
    const exists = await this.checkFAQSiteExists(appId);
    
    if (!exists) {
      return null;
    }

    const application = await this.applicationRepository.findOne({
      where: { id: appId }
    });

    if (!application) {
      return null;
    }

    const faqCount = await this.faqRepository.count({
      where: { appId, isPublished: true }
    });

    const sitePath = path.join(this.sitesDirectory, appId, 'index.html');
    const stats = await fs.stat(sitePath);

    return {
      appId,
      url: this.generateSiteUrl(appId),
      lastPublished: stats.mtime,
      faqCount,
      isActive: true,
    };
  }

  /**
   * 公開済みFAQの取得
   */
  private async getPublishedFAQs(
    appId: string,
    options: FAQSiteGenerationOptions
  ): Promise<FAQ[]> {
    const queryBuilder = this.faqRepository
      .createQueryBuilder('faq')
      .leftJoinAndSelect('faq.application', 'application')
      .where('faq.appId = :appId', { appId })
      .andWhere('faq.isPublished = :isPublished', { isPublished: true });

    // ソート設定
    const sortBy = options.sortBy || 'orderIndex';
    const sortOrder = options.sortOrder || 'ASC';
    queryBuilder.orderBy(`faq.${sortBy}`, sortOrder);

    return await queryBuilder.getMany();
  }

  /**
   * サイトデータの構築
   */
  private async buildSiteData(
    application: Application,
    faqs: FAQ[],
    options: FAQSiteGenerationOptions
  ) {
    const categories = this.extractCategories(faqs);
    const faqsByCategory = this.groupFAQsByCategory(faqs);

    return {
      application: {
        id: application.id,
        name: application.name,
        description: application.description,
      },
      faqs,
      categories,
      faqsByCategory,
      options: {
        theme: options.theme || 'light',
        includeSearch: options.includeSearch !== false,
        includeCategories: options.includeCategories !== false,
        customCSS: options.customCSS || '',
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        totalFAQs: faqs.length,
        totalCategories: categories.length,
      },
    };
  }

  /**
   * 静的サイトの生成
   * 要件: 6.3 (アプリ別FAQページの自動生成)
   */
  private async generateStaticSite(
    appId: string,
    siteData: any,
    options: FAQSiteGenerationOptions
  ): Promise<string> {
    const sitePath = path.join(this.sitesDirectory, appId);
    
    // ディレクトリ作成
    await fs.mkdir(sitePath, { recursive: true });

    // HTMLファイル生成
    const htmlContent = this.generateHTML(siteData);
    await fs.writeFile(path.join(sitePath, 'index.html'), htmlContent, 'utf8');

    // CSSファイル生成
    const cssContent = this.generateCSS(siteData.options);
    await fs.writeFile(path.join(sitePath, 'styles.css'), cssContent, 'utf8');

    // JavaScriptファイル生成（検索機能など）
    if (siteData.options.includeSearch) {
      const jsContent = this.generateJavaScript(siteData);
      await fs.writeFile(path.join(sitePath, 'script.js'), jsContent, 'utf8');
    }

    // JSON APIファイル生成（検索用）
    const jsonContent = JSON.stringify({
      faqs: siteData.faqs.map((faq: FAQ) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        tags: faq.tags,
      })),
      categories: siteData.categories,
    }, null, 2);
    await fs.writeFile(path.join(sitePath, 'data.json'), jsonContent, 'utf8');

    // サイト設定の保存
    const configContent = JSON.stringify({
      appId,
      options,
      lastGenerated: new Date().toISOString(),
    }, null, 2);
    await fs.writeFile(path.join(sitePath, 'config.json'), configContent, 'utf8');

    return sitePath;
  }

  /**
   * HTMLコンテンツの生成
   */
  private generateHTML(siteData: any): string {
    const { application, faqs, categories, faqsByCategory, options } = siteData;

    return `<!DOCTYPE html>
<html lang="ja" data-theme="${options.theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${application.name} - よくある質問</title>
    <meta name="description" content="${application.description || application.name + 'のよくある質問'}">
    <link rel="stylesheet" href="styles.css">
    ${options.customCSS ? '<style>' + options.customCSS + '</style>' : ''}
</head>
<body>
    <header class="header">
        <div class="container">
            <h1 class="title">${application.name}</h1>
            <p class="subtitle">よくある質問</p>
            ${application.description ? `<p class="description">${application.description}</p>` : ''}
        </div>
    </header>

    <main class="main">
        <div class="container">
            ${options.includeSearch ? this.generateSearchSection() : ''}
            ${options.includeCategories && categories.length > 0 ? this.generateCategoryNavigation(categories) : ''}
            
            <div class="faq-content">
                ${options.includeCategories && categories.length > 0 
                  ? this.generateCategorizedFAQs(faqsByCategory)
                  : this.generateFAQList(faqs)
                }
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p class="footer-text">
                最終更新: ${new Date().toLocaleDateString('ja-JP')} | 
                FAQ数: ${faqs.length}件
            </p>
        </div>
    </footer>

    ${options.includeSearch ? '<script src="script.js"></script>' : ''}
</body>
</html>`;
  }

  /**
   * 検索セクションの生成
   */
  private generateSearchSection(): string {
    return `
    <div class="search-section">
        <div class="search-box">
            <input type="text" id="search-input" placeholder="FAQを検索..." class="search-input">
            <button id="search-button" class="search-button">検索</button>
        </div>
        <div id="search-results" class="search-results" style="display: none;"></div>
    </div>`;
  }

  /**
   * カテゴリナビゲーションの生成
   */
  private generateCategoryNavigation(categories: string[]): string {
    const categoryLinks = categories.map(category => 
      `<a href="#category-${this.slugify(category)}" class="category-link">${category}</a>`
    ).join('');

    return `
    <nav class="category-nav">
        <h2 class="category-nav-title">カテゴリ</h2>
        <div class="category-links">
            <a href="#all" class="category-link active">すべて</a>
            ${categoryLinks}
        </div>
    </nav>`;
  }

  /**
   * カテゴリ別FAQの生成
   */
  private generateCategorizedFAQs(faqsByCategory: { [category: string]: FAQ[] }): string {
    let html = '';

    for (const [category, faqs] of Object.entries(faqsByCategory)) {
      const categoryId = category === 'その他' ? 'other' : this.slugify(category);
      
      html += `
      <section id="category-${categoryId}" class="category-section">
          <h2 class="category-title">${category}</h2>
          ${this.generateFAQList(faqs)}
      </section>`;
    }

    return html;
  }

  /**
   * FAQ一覧の生成
   */
  private generateFAQList(faqs: FAQ[]): string {
    const faqItems = faqs.map((faq, index) => `
    <div class="faq-item" data-faq-id="${faq.id}">
        <button class="faq-question" data-target="faq-answer-${index}">
            <span class="question-text">${this.escapeHtml(faq.question)}</span>
            <span class="toggle-icon">+</span>
        </button>
        <div id="faq-answer-${index}" class="faq-answer">
            <div class="answer-content">
                ${this.formatAnswer(faq.answer)}
            </div>
            ${faq.tags && faq.tags.length > 0 ? `
            <div class="faq-tags">
                ${faq.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
            </div>` : ''}
        </div>
    </div>`).join('');

    return `<div class="faq-list">${faqItems}</div>`;
  }

  /**
   * CSSコンテンツの生成
   */
  private generateCSS(options: any): string {
    const theme = options.theme || 'light';
    
    return `
/* FAQ Site Styles */
:root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
    --light-color: #f8f9fa;
    --dark-color: #343a40;
    --border-color: #dee2e6;
    --border-radius: 8px;
    --box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    --transition: all 0.3s ease;
}

[data-theme="dark"] {
    --primary-color: #0d6efd;
    --light-color: #212529;
    --dark-color: #f8f9fa;
    --border-color: #495057;
    --box-shadow: 0 2px 4px rgba(255,255,255,0.1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--dark-color);
    background-color: var(--light-color);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header */
.header {
    background: linear-gradient(135deg, var(--primary-color), #0056b3);
    color: white;
    padding: 2rem 0;
    text-align: center;
}

.title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
    margin-bottom: 1rem;
}

.description {
    font-size: 1rem;
    opacity: 0.8;
    max-width: 600px;
    margin: 0 auto;
}

/* Main Content */
.main {
    padding: 2rem 0;
    min-height: calc(100vh - 200px);
}

/* Search Section */
.search-section {
    margin-bottom: 2rem;
}

.search-box {
    display: flex;
    gap: 1rem;
    max-width: 600px;
    margin: 0 auto;
}

.search-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: 1rem;
    transition: var(--transition);
}

.search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.search-button {
    padding: 0.75rem 1.5rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    cursor: pointer;
    transition: var(--transition);
}

.search-button:hover {
    background-color: #0056b3;
}

.search-results {
    margin-top: 1rem;
    padding: 1rem;
    background-color: white;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
}

/* Category Navigation */
.category-nav {
    margin-bottom: 2rem;
    padding: 1rem;
    background-color: white;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
}

.category-nav-title {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    color: var(--dark-color);
}

.category-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.category-link {
    padding: 0.5rem 1rem;
    background-color: var(--light-color);
    color: var(--dark-color);
    text-decoration: none;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    transition: var(--transition);
    font-size: 0.9rem;
}

.category-link:hover,
.category-link.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}

/* FAQ Content */
.category-section {
    margin-bottom: 3rem;
}

.category-title {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    color: var(--dark-color);
    border-bottom: 2px solid var(--primary-color);
    padding-bottom: 0.5rem;
}

.faq-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.faq-item {
    background-color: white;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
    overflow: hidden;
    transition: var(--transition);
}

.faq-item:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.faq-question {
    width: 100%;
    padding: 1.5rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--dark-color);
    transition: var(--transition);
}

.faq-question:hover {
    background-color: var(--light-color);
}

.question-text {
    flex: 1;
    margin-right: 1rem;
}

.toggle-icon {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
    transition: var(--transition);
}

.faq-item.active .toggle-icon {
    transform: rotate(45deg);
}

.faq-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.faq-item.active .faq-answer {
    max-height: 1000px;
}

.answer-content {
    padding: 0 1.5rem 1.5rem;
    color: var(--secondary-color);
    line-height: 1.7;
}

.answer-content p {
    margin-bottom: 1rem;
}

.answer-content ul,
.answer-content ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
}

.answer-content li {
    margin-bottom: 0.5rem;
}

.faq-tags {
    padding: 0 1.5rem 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.tag {
    padding: 0.25rem 0.75rem;
    background-color: var(--light-color);
    color: var(--secondary-color);
    border-radius: 15px;
    font-size: 0.8rem;
    border: 1px solid var(--border-color);
}

/* Footer */
.footer {
    background-color: var(--dark-color);
    color: white;
    padding: 1.5rem 0;
    text-align: center;
    margin-top: 3rem;
}

.footer-text {
    font-size: 0.9rem;
    opacity: 0.8;
}

/* Responsive Design */
@media (max-width: 768px) {
    .container {
        padding: 0 15px;
    }
    
    .title {
        font-size: 2rem;
    }
    
    .search-box {
        flex-direction: column;
    }
    
    .category-links {
        justify-content: center;
    }
    
    .faq-question {
        padding: 1rem;
        font-size: 1rem;
    }
    
    .answer-content {
        padding: 0 1rem 1rem;
    }
}

/* Dark Theme */
[data-theme="dark"] body {
    background-color: #121212;
    color: #e0e0e0;
}

[data-theme="dark"] .faq-item {
    background-color: #1e1e1e;
    border: 1px solid #333;
}

[data-theme="dark"] .category-nav {
    background-color: #1e1e1e;
    border: 1px solid #333;
}

[data-theme="dark"] .search-results {
    background-color: #1e1e1e;
    border-color: #333;
}
`;
  }

  /**
   * JavaScriptコンテンツの生成
   */
  private generateJavaScript(siteData: any): string {
    return `
// FAQ Site JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeFAQ();
    initializeSearch();
    initializeCategoryNavigation();
    initializeThemeToggle();
});

// FAQ アコーディオン機能
function initializeFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.closest('.faq-item');
            const isActive = faqItem.classList.contains('active');
            
            // 他のFAQを閉じる（オプション）
            // document.querySelectorAll('.faq-item.active').forEach(item => {
            //     if (item !== faqItem) {
            //         item.classList.remove('active');
            //     }
            // });
            
            // 現在のFAQをトグル
            faqItem.classList.toggle('active');
        });
    });
}

// 検索機能
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchButton || !searchResults) return;
    
    let faqData = null;
    
    // FAQ データの読み込み
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            faqData = data;
        })
        .catch(error => {
            console.error('FAQ データの読み込みに失敗しました:', error);
        });
    
    // 検索実行
    function performSearch() {
        if (!faqData) return;
        
        const query = searchInput.value.trim().toLowerCase();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        const results = faqData.faqs.filter(faq => {
            return faq.question.toLowerCase().includes(query) ||
                   faq.answer.toLowerCase().includes(query) ||
                   (faq.tags && faq.tags.some(tag => tag.toLowerCase().includes(query)));
        });
        
        displaySearchResults(results, query);
    }
    
    // 検索結果の表示
    function displaySearchResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = '<p class="no-results">検索結果が見つかりませんでした。</p>';
        } else {
            const resultsHTML = results.map(faq => {
                const highlightedQuestion = highlightText(faq.question, query);
                const highlightedAnswer = highlightText(faq.answer.substring(0, 200) + '...', query);
                
                return \`
                <div class="search-result-item" data-faq-id="\$\{faq.id\}">
                    <h4 class="result-question">\$\{highlightedQuestion\}</h4>
                    <p class="result-answer">\$\{highlightedAnswer\}</p>
                    \$\{faq.category ? \`<span class="result-category">\$\{faq.category\}</span>\` : ''\}
                </div>\`;
            }).join('');
            
            searchResults.innerHTML = \`
                <h3>検索結果 (\${results.length}件)</h3>
                \${resultsHTML}
            \`;
        }
        
        searchResults.style.display = 'block';
        
        // 検索結果クリック時のスクロール
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const faqId = this.dataset.faqId;
                const faqElement = document.querySelector(\`[data-faq-id="\${faqId}"]\`);
                if (faqElement) {
                    faqElement.scrollIntoView({ behavior: 'smooth' });
                    faqElement.classList.add('active');
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                }
            });
        });
    }
    
    // テキストハイライト
    function highlightText(text, query) {
        const regex = new RegExp(\`(\${escapeRegExp(query)})\`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    // 正規表現エスケープ
    function escapeRegExp(string) {
        return string.replace(/[.*+?^\$\{}()|[\\\\]\\\\]/g, '\\\\\\\\$&');
    }
    
    // イベントリスナー
    searchButton.addEventListener('click', performSearch);　
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // リアルタイム検索（オプション）
    searchInput.addEventListener('input', debounce(performSearch, 300));
    
    // デバウンス関数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// カテゴリナビゲーション
function initializeCategoryNavigation() {
    const categoryLinks = document.querySelectorAll('.category-link');
    
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // アクティブ状態の更新
            categoryLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // カテゴリセクションへのスクロール
            const href = this.getAttribute('href');
            if (href === '#all') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const targetSection = document.querySelector(href);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

// テーマ切り替え（オプション）
function initializeThemeToggle() {
    // テーマ切り替えボタンがある場合の処理
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
    
    // 保存されたテーマの復元
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
}
`;
  }

  /**
   * カテゴリの抽出
   */
  private extractCategories(faqs: FAQ[]): string[] {
    const categories = new Set<string>();
    
    faqs.forEach(faq => {
      if (faq.category) {
        categories.add(faq.category);
      }
    });
    
    return Array.from(categories).sort();
  }

  /**
   * カテゴリ別FAQのグループ化
   */
  private groupFAQsByCategory(faqs: FAQ[]): { [category: string]: FAQ[] } {
    const grouped: { [category: string]: FAQ[] } = {};
    
    faqs.forEach(faq => {
      const category = faq.category || 'その他';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(faq);
    });
    
    return grouped;
  }

  /**
   * サイトURLの生成
   */
  private generateSiteUrl(appId: string): string {
    const baseUrl = process.env.FAQ_SITE_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/faq-sites/${appId}`;
  }

  /**
   * サイト設定の取得
   */
  private async getSiteConfig(appId: string): Promise<FAQSiteGenerationOptions | null> {
    const configPath = path.join(this.sitesDirectory, appId, 'config.json');
    
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent);
      return config.options || null;
    } catch {
      return null;
    }
  }

  /**
   * 文字列のスラッグ化
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * HTMLエスケープ
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 回答のフォーマット
   */
  private formatAnswer(answer: string): string {
    // 改行をHTMLの改行に変換
    let formatted = this.escapeHtml(answer).replace(/\n/g, '<br>');
    
    // URLをリンクに変換
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return formatted;
  }
}