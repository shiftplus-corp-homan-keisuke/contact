import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FAQsRepository } from '../repositories';
import { FAQ, FAQSiteConfig } from '../entities';
import { Application } from '../../inquiries/entities';
import {
    FAQSiteGenerationDto,
    FAQSiteConfigDto,
    FAQSiteResponseDto,
    FAQSiteStatusDto,
    PublishFAQSiteDto,
} from '../dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class FAQSiteService {
    private readonly logger = new Logger(FAQSiteService.name);
    private readonly siteOutputDir = path.join(process.cwd(), 'public', 'faq-sites');

    constructor(
        private readonly faqsRepository: FAQsRepository,
        @InjectRepository(FAQSiteConfig)
        private readonly siteConfigRepository: Repository<FAQSiteConfig>,
        @InjectRepository(Application)
        private readonly applicationRepository: Repository<Application>,
    ) {
        this.initializeTemplates();
    }

    /**
     * FAQ サイトを生成・公開する
     */
    async publishFAQSite(publishDto: PublishFAQSiteDto): Promise<FAQSiteResponseDto> {
        this.logger.log(`FAQ サイトを公開開始: ${publishDto.appId}`);

        // アプリケーションの存在確認
        const application = await this.applicationRepository.findOne({
            where: { id: publishDto.appId },
        });

        if (!application) {
            throw new NotFoundException(`アプリケーションが見つかりません: ${publishDto.appId}`);
        }

        // 公開対象のFAQを取得
        const faqs = await this.getPublishedFAQs(publishDto.appId, publishDto.faqIds);

        if (faqs.length === 0) {
            throw new BadRequestException('公開対象のFAQが見つかりません');
        }

        // サイト設定を取得または作成
        let siteConfig = await this.getSiteConfig(publishDto.appId);
        if (publishDto.config) {
            siteConfig = await this.updateSiteConfig(publishDto.appId, publishDto.config);
        }

        // サイトを生成
        const siteUrl = await this.generateSite(application, faqs, siteConfig);

        // 設定を更新
        await this.siteConfigRepository.update(
            { appId: publishDto.appId },
            {
                isPublished: true,
                siteUrl,
                lastGeneratedAt: new Date(),
            },
        );

        this.logger.log(`FAQ サイト公開完了: ${siteUrl}`);

        return {
            siteUrl,
            generatedAt: new Date(),
            faqCount: faqs.length,
            categories: [...new Set(faqs.map(faq => faq.category).filter(Boolean))],
        };
    }

    /**
     * FAQ サイトの状態を取得
     */
    async getFAQSiteStatus(appId: string): Promise<FAQSiteStatusDto> {
        const siteConfig = await this.getSiteConfig(appId);
        const publishedFaqCount = await this.faqsRepository.count({
            where: { appId, isPublished: true },
        });

        return {
            appId,
            isPublished: siteConfig.isPublished,
            siteUrl: siteConfig.siteUrl || '',
            lastUpdated: siteConfig.lastGeneratedAt || siteConfig.updatedAt,
            publishedFaqCount,
            config: {
                appId: siteConfig.appId,
                siteTitle: siteConfig.siteTitle,
                siteDescription: siteConfig.siteDescription,
                theme: siteConfig.theme,
                customCss: siteConfig.customCss,
                logoUrl: siteConfig.logoUrl,
                footerText: siteConfig.footerText,
                enableSearch: siteConfig.enableSearch,
                enableCategoryFilter: siteConfig.enableCategoryFilter,
            },
        };
    }

    /**
     * FAQ サイト設定を更新
     */
    async updateSiteConfig(appId: string, configDto: FAQSiteConfigDto): Promise<FAQSiteConfig> {
        let siteConfig = await this.siteConfigRepository.findOne({
            where: { appId },
        });

        if (!siteConfig) {
            siteConfig = this.siteConfigRepository.create({
                appId,
                ...configDto,
            });
        } else {
            Object.assign(siteConfig, configDto);
        }

        return await this.siteConfigRepository.save(siteConfig);
    }

    /**
     * FAQ サイトを非公開にする
     */
    async unpublishFAQSite(appId: string): Promise<void> {
        this.logger.log(`FAQ サイトを非公開化: ${appId}`);

        await this.siteConfigRepository.update(
            { appId },
            { isPublished: false },
        );

        // 生成されたサイトファイルを削除
        const siteDir = path.join(this.siteOutputDir, appId);
        try {
            await fs.rm(siteDir, { recursive: true, force: true });
            this.logger.log(`サイトファイルを削除: ${siteDir}`);
        } catch (error) {
            this.logger.warn(`サイトファイル削除に失敗: ${error.message}`);
        }
    }

    /**
     * FAQ更新時の自動反映
     */
    async handleFAQUpdate(appId: string): Promise<void> {
        this.logger.log(`FAQ更新による自動反映開始: ${appId}`);

        const siteConfig = await this.siteConfigRepository.findOne({
            where: { appId, isPublished: true },
        });

        if (!siteConfig) {
            this.logger.log(`公開されていないサイトのため自動反映をスキップ: ${appId}`);
            return;
        }

        // 自動再生成
        await this.publishFAQSite({ appId });
        this.logger.log(`FAQ更新による自動反映完了: ${appId}`);
    }

    /**
     * 公開対象のFAQを取得
     */
    private async getPublishedFAQs(appId: string, faqIds?: string[]): Promise<FAQ[]> {
        const whereCondition: any = {
            appId,
            isPublished: true,
        };

        if (faqIds && faqIds.length > 0) {
            whereCondition.id = { $in: faqIds };
        }

        return await this.faqsRepository.find({
            where: whereCondition,
            order: { orderIndex: 'ASC', createdAt: 'ASC' },
            relations: ['application'],
        });
    }

    /**
     * サイト設定を取得（存在しない場合はデフォルト設定で作成）
     */
    private async getSiteConfig(appId: string): Promise<FAQSiteConfig> {
        let siteConfig = await this.siteConfigRepository.findOne({
            where: { appId },
        });

        if (!siteConfig) {
            const application = await this.applicationRepository.findOne({
                where: { id: appId },
            });

            if (!application) {
                throw new NotFoundException(`アプリケーションが見つかりません: ${appId}`);
            }

            siteConfig = this.siteConfigRepository.create({
                appId,
                siteTitle: `${application.name} FAQ`,
                siteDescription: `${application.name}のよくある質問`,
                theme: 'default',
                enableSearch: true,
                enableCategoryFilter: true,
            });

            siteConfig = await this.siteConfigRepository.save(siteConfig);
        }

        return siteConfig;
    }

    /**
     * 静的サイトを生成
     */
    private async generateSite(
        application: Application,
        faqs: FAQ[],
        siteConfig: FAQSiteConfig,
    ): Promise<string> {
        const siteDir = path.join(this.siteOutputDir, application.id);

        // ディレクトリを作成
        await fs.mkdir(siteDir, { recursive: true });

        // FAQをカテゴリ別に分類
        const categorizedFAQs = this.categorizeFAQs(faqs);

        // テンプレートデータを準備
        const templateData = {
            siteTitle: siteConfig.siteTitle,
            siteDescription: siteConfig.siteDescription,
            logoUrl: siteConfig.logoUrl,
            footerText: siteConfig.footerText,
            enableSearch: siteConfig.enableSearch,
            enableCategoryFilter: siteConfig.enableCategoryFilter,
            application: {
                name: application.name,
                description: application.description,
            },
            faqs,
            categorizedFAQs,
            categories: Object.keys(categorizedFAQs),
            generatedAt: new Date().toISOString(),
            customCss: siteConfig.customCss,
        };

        // HTMLファイルを生成
        await this.generateHTMLFiles(siteDir, templateData, siteConfig.theme);

        // 静的アセットをコピー
        await this.copyStaticAssets(siteDir, siteConfig.theme);

        // サイトURLを生成
        const siteUrl = `/faq-sites/${application.id}/index.html`;

        return siteUrl;
    }

    /**
     * FAQをカテゴリ別に分類
     */
    private categorizeFAQs(faqs: FAQ[]): Record<string, FAQ[]> {
        const categorized: Record<string, FAQ[]> = {};

        faqs.forEach(faq => {
            const category = faq.category || 'その他';
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push(faq);
        });

        return categorized;
    }

    /**
     * HTMLファイルを生成
     */
    private async generateHTMLFiles(
        siteDir: string,
        templateData: any,
        theme: string,
    ): Promise<void> {
        const templateDir = path.join(process.cwd(), 'templates', 'faq-site', theme);

        // メインページを生成
        const indexTemplate = await this.loadTemplate(path.join(templateDir, 'index.hbs'));
        const indexHtml = indexTemplate(templateData);
        await fs.writeFile(path.join(siteDir, 'index.html'), indexHtml, 'utf-8');

        // 検索ページを生成（検索機能が有効な場合）
        if (templateData.enableSearch) {
            const searchTemplate = await this.loadTemplate(path.join(templateDir, 'search.hbs'));
            const searchHtml = searchTemplate(templateData);
            await fs.writeFile(path.join(siteDir, 'search.html'), searchHtml, 'utf-8');
        }

        // カテゴリ別ページを生成
        for (const [category, categoryFAQs] of Object.entries(templateData.categorizedFAQs)) {
            const categoryTemplate = await this.loadTemplate(path.join(templateDir, 'category.hbs'));
            const categoryData = {
                ...templateData,
                currentCategory: category,
                categoryFAQs,
            };
            const categoryHtml = categoryTemplate(categoryData);
            const categoryFileName = `category-${this.sanitizeFileName(category)}.html`;
            await fs.writeFile(path.join(siteDir, categoryFileName), categoryHtml, 'utf-8');
        }
    }

    /**
     * 静的アセットをコピー
     */
    private async copyStaticAssets(siteDir: string, theme: string): Promise<void> {
        const assetsDir = path.join(process.cwd(), 'templates', 'faq-site', theme, 'assets');
        const targetAssetsDir = path.join(siteDir, 'assets');

        try {
            await fs.mkdir(targetAssetsDir, { recursive: true });

            // CSS、JS、画像ファイルをコピー
            const assetFiles = await fs.readdir(assetsDir, { recursive: true });

            for (const file of assetFiles) {
                const srcPath = path.join(assetsDir, file);
                const destPath = path.join(targetAssetsDir, file);

                const stat = await fs.stat(srcPath);
                if (stat.isFile()) {
                    await fs.mkdir(path.dirname(destPath), { recursive: true });
                    await fs.copyFile(srcPath, destPath);
                }
            }
        } catch (error) {
            this.logger.warn(`静的アセットのコピーに失敗: ${error.message}`);
        }
    }

    /**
     * テンプレートを読み込み、コンパイル
     */
    private async loadTemplate(templatePath: string): Promise<HandlebarsTemplateDelegate> {
        try {
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            return handlebars.compile(templateContent);
        } catch (error) {
            this.logger.error(`テンプレート読み込みエラー: ${templatePath}`, error);
            throw new Error(`テンプレートファイルが見つかりません: ${templatePath}`);
        }
    }

    /**
     * ファイル名をサニタイズ
     */
    private sanitizeFileName(fileName: string): string {
        return fileName
            .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * テンプレートシステムを初期化
     */
    private async initializeTemplates(): Promise<void> {
        // Handlebarsヘルパーを登録
        handlebars.registerHelper('eq', (a, b) => a === b);
        handlebars.registerHelper('ne', (a, b) => a !== b);
        handlebars.registerHelper('gt', (a, b) => a > b);
        handlebars.registerHelper('lt', (a, b) => a < b);
        handlebars.registerHelper('and', (a, b) => a && b);
        handlebars.registerHelper('or', (a, b) => a || b);
        handlebars.registerHelper('formatDate', (date) => {
            return new Date(date).toLocaleDateString('ja-JP');
        });
        handlebars.registerHelper('truncate', (str, length) => {
            if (str && str.length > length) {
                return str.substring(0, length) + '...';
            }
            return str;
        });

        this.logger.log('FAQ サイトテンプレートシステムを初期化しました');
    }
} 