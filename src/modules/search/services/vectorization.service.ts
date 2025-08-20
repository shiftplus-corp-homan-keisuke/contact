import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VectorService, VectorMetadata } from './vector.service';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { FAQ } from '../../faqs/entities/faq.entity';

@Injectable()
export class VectorizationService {
    private readonly logger = new Logger(VectorizationService.name);

    constructor(
        private readonly vectorService: VectorService,
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(Response)
        private readonly responseRepository: Repository<Response>,
        @InjectRepository(FAQ)
        private readonly faqRepository: Repository<FAQ>,
    ) { }

    /**
     * 問い合わせをベクトル化して保存する
     * 要件3.1対応: 問い合わせのベクトル化と保存機能
     */
    async vectorizeInquiry(inquiryId: string): Promise<void> {
        try {
            const inquiry = await this.inquiryRepository.findOne({
                where: { id: inquiryId },
                relations: ['app'],
            });

            if (!inquiry) {
                throw new Error(`Inquiry not found: ${inquiryId}`);
            }

            // タイトルと内容を結合してベクトル化
            const text = `${inquiry.title} ${inquiry.content}`;
            const vector = await this.vectorService.embedText(text);

            const metadata: VectorMetadata = {
                id: inquiry.id,
                type: 'inquiry',
                appId: inquiry.appId,
                category: inquiry.category,
                status: inquiry.status,
                createdAt: inquiry.createdAt.toISOString(),
                title: inquiry.title,
            };

            await this.vectorService.storeVector(inquiry.id, vector, metadata);
            this.logger.log(`問い合わせベクトル化完了: ID=${inquiryId}`);
        } catch (error) {
            this.logger.error(`問い合わせベクトル化エラー: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * 回答をベクトル化して保存する
     * 要件3.1対応: 回答のベクトル化と保存機能
     */
    async vectorizeResponse(responseId: string): Promise<void> {
        try {
            const response = await this.responseRepository.findOne({
                where: { id: responseId },
                relations: ['inquiry', 'inquiry.app'],
            });

            if (!response) {
                throw new Error(`Response not found: ${responseId}`);
            }

            // 回答内容をベクトル化
            const vector = await this.vectorService.embedText(response.content);

            const metadata: VectorMetadata = {
                id: response.id,
                type: 'response',
                appId: response.inquiry.appId,
                category: response.inquiry.category,
                status: response.inquiry.status,
                createdAt: response.createdAt.toISOString(),
                title: `回答: ${response.inquiry.title}`,
            };

            await this.vectorService.storeVector(response.id, vector, metadata);
            this.logger.log(`回答ベクトル化完了: ID=${responseId}`);
        } catch (error) {
            this.logger.error(`回答ベクトル化エラー: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * FAQをベクトル化して保存する
     * 要件3.1対応: FAQのベクトル化と保存機能
     */
    async vectorizeFAQ(faqId: string): Promise<void> {
        try {
            const faq = await this.faqRepository.findOne({
                where: { id: faqId },
                relations: ['application'],
            });

            if (!faq) {
                throw new Error(`FAQ not found: ${faqId}`);
            }

            // 質問と回答を結合してベクトル化
            const text = `${faq.question} ${faq.answer}`;
            const vector = await this.vectorService.embedText(text);

            const metadata: VectorMetadata = {
                id: faq.id,
                type: 'faq',
                appId: faq.applicationId,
                category: faq.category,
                createdAt: faq.createdAt.toISOString(),
                title: faq.question,
            };

            await this.vectorService.storeVector(faq.id, vector, metadata);
            this.logger.log(`FAQベクトル化完了: ID=${faqId}`);
        } catch (error) {
            this.logger.error(`FAQベクトル化エラー: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * 問い合わせのベクトルを更新する
     * 要件3.2対応: 問い合わせ内容が更新された時のベクトル更新
     */
    async updateInquiryVector(inquiryId: string): Promise<void> {
        await this.vectorizeInquiry(inquiryId);
    }

    /**
     * 回答のベクトルを更新する
     */
    async updateResponseVector(responseId: string): Promise<void> {
        await this.vectorizeResponse(responseId);
    }

    /**
     * FAQのベクトルを更新する
     */
    async updateFAQVector(faqId: string): Promise<void> {
        await this.vectorizeFAQ(faqId);
    }

    /**
     * ベクトルを削除する
     */
    async deleteVector(id: string): Promise<void> {
        await this.vectorService.deleteVector(id);
        this.logger.log(`ベクトル削除完了: ID=${id}`);
    }

    /**
     * 既存の全データをベクトル化する（初期化用）
     */
    async vectorizeAllExistingData(): Promise<void> {
        this.logger.log('既存データの一括ベクトル化開始');

        try {
            // 問い合わせの一括ベクトル化
            const inquiries = await this.inquiryRepository.find({
                relations: ['app'],
            });

            this.logger.log(`問い合わせベクトル化開始: ${inquiries.length}件`);
            for (const inquiry of inquiries) {
                try {
                    await this.vectorizeInquiry(inquiry.id);
                } catch (error) {
                    this.logger.error(`問い合わせベクトル化スキップ: ID=${inquiry.id}, エラー=${error.message}`);
                }
            }

            // 回答の一括ベクトル化
            const responses = await this.responseRepository.find({
                relations: ['inquiry', 'inquiry.app'],
            });

            this.logger.log(`回答ベクトル化開始: ${responses.length}件`);
            for (const response of responses) {
                try {
                    await this.vectorizeResponse(response.id);
                } catch (error) {
                    this.logger.error(`回答ベクトル化スキップ: ID=${response.id}, エラー=${error.message}`);
                }
            }

            // FAQの一括ベクトル化
            const faqs = await this.faqRepository.find({
                relations: ['application'],
            });

            this.logger.log(`FAQベクトル化開始: ${faqs.length}件`);
            for (const faq of faqs) {
                try {
                    await this.vectorizeFAQ(faq.id);
                } catch (error) {
                    this.logger.error(`FAQベクトル化スキップ: ID=${faq.id}, エラー=${error.message}`);
                }
            }

            const stats = this.vectorService.getStats();
            this.logger.log(`既存データの一括ベクトル化完了: 総ベクトル数=${stats.totalVectors}`);
        } catch (error) {
            this.logger.error(`一括ベクトル化エラー: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * アプリ別のベクトル化統計を取得する
     */
    async getVectorizationStats(): Promise<{
        totalVectors: number;
        inquiryVectors: number;
        responseVectors: number;
        faqVectors: number;
    }> {
        const inquiryCount = await this.inquiryRepository.count();
        const responseCount = await this.responseRepository.count();
        const faqCount = await this.faqRepository.count();
        const vectorStats = this.vectorService.getStats();

        return {
            totalVectors: vectorStats.totalVectors,
            inquiryVectors: inquiryCount,
            responseVectors: responseCount,
            faqVectors: faqCount,
        };
    }
}