import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import { Response } from '../../responses/entities/response.entity';
import { FAQ } from '../../faqs/entities/faq.entity';
import {
    SearchCriteria,
    FullTextSearchResult,
    PaginatedResult,
    SearchFilters,
} from '../types/search.types';

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(Response)
        private readonly responseRepository: Repository<Response>,
        @InjectRepository(FAQ)
        private readonly faqRepository: Repository<FAQ>,
    ) { }

    /**
     * 全文検索を実行
     * 要件8.1, 8.2, 8.4対応
     */
    async fullTextSearch(criteria: SearchCriteria): Promise<PaginatedResult<FullTextSearchResult>> {
        this.logger.log(`全文検索実行: query="${criteria.query}"`);

        const { query, filters, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = criteria;

        // 検索結果を格納する配列
        const allResults: FullTextSearchResult[] = [];

        // 問い合わせの検索
        const inquiryResults = await this.searchInquiries(query, filters, sortBy, sortOrder);
        allResults.push(...inquiryResults);

        // 回答の検索
        const responseResults = await this.searchResponses(query, filters, sortBy, sortOrder);
        allResults.push(...responseResults);

        // FAQの検索
        const faqResults = await this.searchFAQs(query, filters, sortBy, sortOrder);
        allResults.push(...faqResults);

        // スコアでソート
        allResults.sort((a, b) => b.score - a.score);

        // ページネーション
        const total = allResults.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const items = allResults.slice(offset, offset + limit);

        return {
            items,
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        };
    }

    /**
     * 問い合わせの全文検索
     */
    private async searchInquiries(
        query: string,
        filters?: SearchFilters,
        sortBy: string = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc',
    ): Promise<FullTextSearchResult[]> {
        let queryBuilder = this.inquiryRepository
            .createQueryBuilder('inquiry')
            .leftJoinAndSelect('inquiry.app', 'app')
            .leftJoinAndSelect('inquiry.assignedUser', 'user')
            .select([
                'inquiry.id',
                'inquiry.title',
                'inquiry.content',
                'inquiry.status',
                'inquiry.priority',
                'inquiry.category',
                'inquiry.customerEmail',
                'inquiry.customerName',
                'inquiry.createdAt',
                'inquiry.updatedAt',
                'app.id',
                'app.name',
                'user.id',
                'user.name',
            ]);

        // PostgreSQL全文検索を使用
        queryBuilder = queryBuilder.where(
            `to_tsvector('japanese', inquiry.title || ' ' || inquiry.content) @@ plainto_tsquery('japanese', :query)`,
            { query },
        );

        // フィルター条件を適用
        queryBuilder = this.applyInquiryFilters(queryBuilder, filters);

        // ソート条件を適用
        queryBuilder = queryBuilder.orderBy(`inquiry.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

        const inquiries = await queryBuilder.getMany();

        return inquiries.map((inquiry) => ({
            id: inquiry.id,
            title: inquiry.title,
            content: inquiry.content,
            type: 'inquiry' as const,
            score: this.calculateTextScore(query, inquiry.title + ' ' + inquiry.content),
            highlights: this.extractHighlights(query, inquiry.title + ' ' + inquiry.content),
            metadata: {
                appId: inquiry.app?.id,
                appName: inquiry.app?.name,
                status: inquiry.status,
                priority: inquiry.priority,
                category: inquiry.category,
                customerEmail: inquiry.customerEmail,
                customerName: inquiry.customerName,
                assignedTo: inquiry.assignedUser?.id,
                assignedUserName: inquiry.assignedUser?.name,
            },
            createdAt: inquiry.createdAt,
        }));
    }

    /**
     * 回答の全文検索
     */
    private async searchResponses(
        query: string,
        filters?: SearchFilters,
        sortBy: string = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc',
    ): Promise<FullTextSearchResult[]> {
        let queryBuilder = this.responseRepository
            .createQueryBuilder('response')
            .leftJoinAndSelect('response.inquiry', 'inquiry')
            .leftJoinAndSelect('inquiry.app', 'app')
            .leftJoinAndSelect('response.user', 'user')
            .select([
                'response.id',
                'response.content',
                'response.isPublic',
                'response.createdAt',
                'response.updatedAt',
                'inquiry.id',
                'inquiry.title',
                'inquiry.status',
                'inquiry.priority',
                'inquiry.category',
                'app.id',
                'app.name',
                'user.id',
                'user.name',
            ]);

        // PostgreSQL全文検索を使用
        queryBuilder = queryBuilder.where(
            `to_tsvector('japanese', response.content) @@ plainto_tsquery('japanese', :query)`,
            { query },
        );

        // フィルター条件を適用（問い合わせベース）
        queryBuilder = this.applyResponseFilters(queryBuilder, filters);

        // ソート条件を適用
        queryBuilder = queryBuilder.orderBy(`response.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

        const responses = await queryBuilder.getMany();

        return responses.map((response) => ({
            id: response.id,
            title: `回答: ${response.inquiry.title}`,
            content: response.content,
            type: 'response' as const,
            score: this.calculateTextScore(query, response.content),
            highlights: this.extractHighlights(query, response.content),
            metadata: {
                inquiryId: response.inquiry.id,
                inquiryTitle: response.inquiry.title,
                appId: response.inquiry.app?.id,
                appName: response.inquiry.app?.name,
                status: response.inquiry.status,
                priority: response.inquiry.priority,
                category: response.inquiry.category,
                isPublic: response.isPublic,
                respondedBy: response.user?.id,
                respondedByName: response.user?.name,
            },
            createdAt: response.createdAt,
        }));
    }

    /**
     * FAQの全文検索
     */
    private async searchFAQs(
        query: string,
        filters?: SearchFilters,
        sortBy: string = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc',
    ): Promise<FullTextSearchResult[]> {
        let queryBuilder = this.faqRepository
            .createQueryBuilder('faq')
            .leftJoinAndSelect('faq.application', 'app')
            .select([
                'faq.id',
                'faq.question',
                'faq.answer',
                'faq.category',
                'faq.orderIndex',
                'faq.isPublished',
                'faq.createdAt',
                'faq.updatedAt',
                'app.id',
                'app.name',
            ]);

        // PostgreSQL全文検索を使用
        queryBuilder = queryBuilder.where(
            `to_tsvector('japanese', faq.question || ' ' || faq.answer) @@ plainto_tsquery('japanese', :query)`,
            { query },
        );

        // フィルター条件を適用
        queryBuilder = this.applyFAQFilters(queryBuilder, filters);

        // ソート条件を適用
        queryBuilder = queryBuilder.orderBy(`faq.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

        const faqs = await queryBuilder.getMany();

        return faqs.map((faq) => ({
            id: faq.id,
            title: faq.question,
            content: faq.answer,
            type: 'faq' as const,
            score: this.calculateTextScore(query, faq.question + ' ' + faq.answer),
            highlights: this.extractHighlights(query, faq.question + ' ' + faq.answer),
            metadata: {
                appId: faq.application?.id,
                appName: faq.application?.name,
                category: faq.category,
                orderIndex: faq.orderIndex,
                isPublished: faq.isPublished,
            },
            createdAt: faq.createdAt,
        }));
    }

    /**
     * 問い合わせのフィルター条件を適用
     */
    private applyInquiryFilters(
        queryBuilder: SelectQueryBuilder<Inquiry>,
        filters?: SearchFilters,
    ): SelectQueryBuilder<Inquiry> {
        if (!filters) return queryBuilder;

        if (filters.appId) {
            queryBuilder = queryBuilder.andWhere('inquiry.appId = :appId', { appId: filters.appId });
        }

        if (filters.status && filters.status.length > 0) {
            queryBuilder = queryBuilder.andWhere('inquiry.status IN (:...status)', { status: filters.status });
        }

        if (filters.category && filters.category.length > 0) {
            queryBuilder = queryBuilder.andWhere('inquiry.category IN (:...category)', { category: filters.category });
        }

        if (filters.assignedTo) {
            queryBuilder = queryBuilder.andWhere('inquiry.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
        }

        if (filters.priority && filters.priority.length > 0) {
            queryBuilder = queryBuilder.andWhere('inquiry.priority IN (:...priority)', { priority: filters.priority });
        }

        if (filters.customerEmail) {
            queryBuilder = queryBuilder.andWhere('inquiry.customerEmail = :customerEmail', {
                customerEmail: filters.customerEmail,
            });
        }

        if (filters.startDate) {
            queryBuilder = queryBuilder.andWhere('inquiry.createdAt >= :startDate', { startDate: filters.startDate });
        }

        if (filters.endDate) {
            queryBuilder = queryBuilder.andWhere('inquiry.createdAt <= :endDate', { endDate: filters.endDate });
        }

        return queryBuilder;
    }

    /**
     * 回答のフィルター条件を適用
     */
    private applyResponseFilters(
        queryBuilder: SelectQueryBuilder<Response>,
        filters?: SearchFilters,
    ): SelectQueryBuilder<Response> {
        if (!filters) return queryBuilder;

        if (filters.appId) {
            queryBuilder = queryBuilder.andWhere('inquiry.appId = :appId', { appId: filters.appId });
        }

        if (filters.status && filters.status.length > 0) {
            queryBuilder = queryBuilder.andWhere('inquiry.status IN (:...status)', { status: filters.status });
        }

        if (filters.category && filters.category.length > 0) {
            queryBuilder = queryBuilder.andWhere('inquiry.category IN (:...category)', { category: filters.category });
        }

        if (filters.priority && filters.priority.length > 0) {
            queryBuilder = queryBuilder.andWhere('inquiry.priority IN (:...priority)', { priority: filters.priority });
        }

        if (filters.startDate) {
            queryBuilder = queryBuilder.andWhere('response.createdAt >= :startDate', { startDate: filters.startDate });
        }

        if (filters.endDate) {
            queryBuilder = queryBuilder.andWhere('response.createdAt <= :endDate', { endDate: filters.endDate });
        }

        return queryBuilder;
    }

    /**
     * FAQのフィルター条件を適用
     */
    private applyFAQFilters(
        queryBuilder: SelectQueryBuilder<FAQ>,
        filters?: SearchFilters,
    ): SelectQueryBuilder<FAQ> {
        if (!filters) return queryBuilder;

        if (filters.appId) {
            queryBuilder = queryBuilder.andWhere('faq.applicationId = :appId', { appId: filters.appId });
        }

        if (filters.category && filters.category.length > 0) {
            queryBuilder = queryBuilder.andWhere('faq.category IN (:...category)', { category: filters.category });
        }

        if (filters.startDate) {
            queryBuilder = queryBuilder.andWhere('faq.createdAt >= :startDate', { startDate: filters.startDate });
        }

        if (filters.endDate) {
            queryBuilder = queryBuilder.andWhere('faq.createdAt <= :endDate', { endDate: filters.endDate });
        }

        return queryBuilder;
    }

    /**
     * テキストスコアを計算（簡易実装）
     */
    private calculateTextScore(query: string, text: string): number {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const textLower = text.toLowerCase();

        let score = 0;
        for (const term of queryTerms) {
            const matches = (textLower.match(new RegExp(term, 'g')) || []).length;
            score += matches;
        }

        // テキストの長さで正規化
        return score / Math.max(text.length / 100, 1);
    }

    /**
     * ハイライト部分を抽出
     */
    private extractHighlights(query: string, text: string, maxHighlights: number = 3): string[] {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const highlights: string[] = [];

        for (const term of queryTerms) {
            const regex = new RegExp(`(.{0,30})(${term})(.{0,30})`, 'gi');
            const matches = text.match(regex);

            if (matches) {
                highlights.push(...matches.slice(0, maxHighlights - highlights.length));
                if (highlights.length >= maxHighlights) break;
            }
        }

        return highlights;
    }
}