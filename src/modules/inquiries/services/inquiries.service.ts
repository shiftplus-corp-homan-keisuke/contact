/**
 * 問い合わせサービス
 * 要件1: 問い合わせ登録機能
 * 要件2: 問い合わせ・回答管理機能
 * 要件8: 検索・フィルタリング機能
 */

import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    Inject
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In, IsNull, Not } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import { Inquiry, InquiryStatus } from '../entities/inquiry.entity';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';
import { Application } from '../entities/application.entity';
import { Response } from '../../responses/entities/response.entity';
import { WorkflowService } from './workflow.service';
import {
    CreateInquiryDto,
    UpdateInquiryDto,
    UpdateInquiryStatusDto,
    SearchInquiryDto,
    InquiryResponseDto,
    InquiryDetailResponseDto
} from '../dto';
import { PaginatedResponseDto } from '../../../common/types/pagination.types';

@Injectable()
export class InquiriesService {
    private readonly logger = new Logger(InquiriesService.name);

    constructor(
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
        @InjectRepository(InquiryStatusHistory)
        private readonly statusHistoryRepository: Repository<InquiryStatusHistory>,
        @InjectRepository(Application)
        private readonly applicationRepository: Repository<Application>,
        @InjectRepository(Response)
        private readonly responseRepository: Repository<Response>,
        private readonly workflowService: WorkflowService
    ) { }

    /**
     * 問い合わせを作成する
     * 要件1.1, 1.3, 1.4: 問い合わせ登録機能
     */
    async createInquiry(
        createInquiryDto: CreateInquiryDto,
        createdBy?: string
    ): Promise<InquiryResponseDto> {
        this.logger.log(`問い合わせ作成開始: ${createInquiryDto.title}`);

        // バリデーション実行
        await this.validateCreateInquiryDto(createInquiryDto);

        // 対象アプリケーションの存在確認
        await this.validateApplicationExists(createInquiryDto.appId);

        try {
            // 問い合わせエンティティを作成
            const inquiry = this.inquiryRepository.create({
                ...createInquiryDto,
                // 一意ID生成とタイムスタンプ自動付与はBaseEntityで自動処理
                status: 'new', // 初期状態は「新規」
                priority: createInquiryDto.priority || 'medium', // デフォルト優先度
                tags: createInquiryDto.tags || [],
                metadata: createInquiryDto.metadata || {}
            });

            // データベースに保存
            const savedInquiry = await this.inquiryRepository.save(inquiry);

            // 初期状態履歴を記録
            await this.createStatusHistory(
                savedInquiry.id,
                null,
                'new',
                createdBy,
                '問い合わせが作成されました'
            );

            this.logger.log(`問い合わせ作成完了: ID=${savedInquiry.id}`);

            // レスポンスDTOに変換して返却
            return plainToClass(InquiryResponseDto, savedInquiry, {
                excludeExtraneousValues: true
            });

        } catch (error) {
            this.logger.error(`問い合わせ作成エラー: ${error.message}`, error.stack);
            throw new BadRequestException('問い合わせの作成に失敗しました');
        }
    }

    /**
     * 問い合わせを取得する（詳細情報含む）
     * 要件1.1: 問い合わせ取得機能
     */
    async getInquiry(id: string): Promise<InquiryDetailResponseDto> {
        this.logger.log(`問い合わせ取得: ID=${id}`);

        const inquiry = await this.inquiryRepository.findOne({
            where: { id },
            relations: [
                'app',
                'assignedUser',
                'statusHistory',
                'statusHistory.changedByUser'
            ],
            order: {
                statusHistory: {
                    changedAt: 'DESC'
                }
            }
        });

        if (!inquiry) {
            throw new NotFoundException(`問い合わせが見つかりません: ID=${id}`);
        }

        return plainToClass(InquiryDetailResponseDto, inquiry, {
            excludeExtraneousValues: true
        });
    }

    /**
     * 問い合わせを更新する
     * 要件1.1, 1.3: 問い合わせ更新機能
     */
    async updateInquiry(
        id: string,
        updateInquiryDto: UpdateInquiryDto,
        updatedBy?: string
    ): Promise<InquiryResponseDto> {
        this.logger.log(`問い合わせ更新開始: ID=${id}`);

        // 存在確認
        const existingInquiry = await this.inquiryRepository.findOne({
            where: { id }
        });

        if (!existingInquiry) {
            throw new NotFoundException(`問い合わせが見つかりません: ID=${id}`);
        }

        try {
            // 更新データをマージ
            const updatedInquiry = this.inquiryRepository.merge(
                existingInquiry,
                updateInquiryDto
            );

            // データベースに保存
            const savedInquiry = await this.inquiryRepository.save(updatedInquiry);

            this.logger.log(`問い合わせ更新完了: ID=${id}`);

            return plainToClass(InquiryResponseDto, savedInquiry, {
                excludeExtraneousValues: true
            });

        } catch (error) {
            this.logger.error(`問い合わせ更新エラー: ${error.message}`, error.stack);
            throw new BadRequestException('問い合わせの更新に失敗しました');
        }
    }

    /**
     * 問い合わせ状態を更新する
     * 要件2.2, 2.3: 状態管理機能（ワークフローサービスを使用）
     */
    async updateInquiryStatus(
        id: string,
        updateStatusDto: UpdateInquiryStatusDto,
        updatedBy: string,
        ipAddress?: string
    ): Promise<InquiryResponseDto> {
        this.logger.log(`問い合わせ状態更新開始: ID=${id}, 新状態=${updateStatusDto.status}`);

        try {
            // ワークフローサービスを使用して状態変更を実行
            const updatedInquiry = await this.workflowService.executeStatusChange(
                id,
                updateStatusDto.status,
                updatedBy,
                updateStatusDto.comment,
                ipAddress
            );

            this.logger.log(`問い合わせ状態更新完了: ID=${id}, 新状態=${updateStatusDto.status}`);

            return plainToClass(InquiryResponseDto, updatedInquiry, {
                excludeExtraneousValues: true
            });

        } catch (error) {
            this.logger.error(`問い合わせ状態更新エラー: ${error.message}`, error.stack);
            throw error; // ワークフローサービスからのエラーをそのまま再スロー
        }
    }

    /**
     * 問い合わせを検索・フィルタリングする
     * 要件8: 検索・フィルタリング機能
     */
    async searchInquiries(
        searchDto: SearchInquiryDto
    ): Promise<PaginatedResponseDto<InquiryResponseDto>> {
        this.logger.log(`問い合わせ検索開始: クエリ=${searchDto.query}`);

        const queryBuilder = this.createSearchQueryBuilder(searchDto);

        // 総件数を取得
        const total = await queryBuilder.getCount();

        // ページネーション適用
        const { page = 1, limit = 20 } = searchDto;
        const offset = (page - 1) * limit;

        queryBuilder
            .skip(offset)
            .take(limit);

        // ソート適用
        this.applySorting(queryBuilder, searchDto);

        // 結果を取得
        const inquiries = await queryBuilder.getMany();

        // DTOに変換
        const inquiryDtos = inquiries.map(inquiry =>
            plainToClass(InquiryResponseDto, inquiry, {
                excludeExtraneousValues: true
            })
        );

        this.logger.log(`問い合わせ検索完了: 総件数=${total}, 取得件数=${inquiries.length}`);

        return new PaginatedResponseDto(inquiryDtos, total, page, limit);
    }

    /**
     * 問い合わせ履歴を取得する
     * 要件2.3, 2.4: 履歴表示機能
     */
    async getInquiryHistory(id: string): Promise<InquiryStatusHistory[]> {
        this.logger.log(`問い合わせ履歴取得: ID=${id}`);

        // 問い合わせの存在確認
        const inquiry = await this.inquiryRepository.findOne({
            where: { id }
        });

        if (!inquiry) {
            throw new NotFoundException(`問い合わせが見つかりません: ID=${id}`);
        }

        // 履歴を時系列順で取得
        const history = await this.statusHistoryRepository.find({
            where: { inquiryId: id },
            relations: ['changedByUser'],
            order: { changedAt: 'ASC' }
        });

        return history;
    }

    /**
     * バリデーション: 問い合わせ作成DTO
     */
    private async validateCreateInquiryDto(dto: CreateInquiryDto): Promise<void> {
        // DTOインスタンスに変換してからバリデーション
        const dtoInstance = plainToClass(CreateInquiryDto, dto);
        const errors = await validate(dtoInstance);
        if (errors.length > 0) {
            const errorMessages = errors.map(error =>
                Object.values(error.constraints || {}).join(', ')
            ).join('; ');
            throw new BadRequestException(`入力データに不備があります: ${errorMessages}`);
        }
    }

    /**
     * バリデーション: アプリケーション存在確認
     */
    private async validateApplicationExists(appId: string): Promise<void> {
        const app = await this.applicationRepository.findOne({
            where: { id: appId, isActive: true }
        });

        if (!app) {
            throw new BadRequestException(`指定されたアプリケーションが見つかりません: ${appId}`);
        }
    }

    /**
     * 状態履歴を作成する
     */
    private async createStatusHistory(
        inquiryId: string,
        oldStatus: InquiryStatus | null,
        newStatus: InquiryStatus,
        changedBy?: string,
        comment?: string,
        ipAddress?: string
    ): Promise<void> {
        const statusHistory = this.statusHistoryRepository.create({
            inquiryId,
            oldStatus,
            newStatus,
            changedBy: changedBy || 'system',
            comment,
            ipAddress,
            metadata: {}
        });

        await this.statusHistoryRepository.save(statusHistory);
    }

    /**
     * 検索クエリビルダーを作成する
     */
    private createSearchQueryBuilder(searchDto: SearchInquiryDto): SelectQueryBuilder<Inquiry> {
        const queryBuilder = this.inquiryRepository
            .createQueryBuilder('inquiry')
            .leftJoinAndSelect('inquiry.app', 'app')
            .leftJoinAndSelect('inquiry.assignedUser', 'assignedUser');

        // 全文検索
        if (searchDto.query) {
            queryBuilder.andWhere(
                '(inquiry.title ILIKE :query OR inquiry.content ILIKE :query)',
                { query: `%${searchDto.query}%` }
            );
        }

        // アプリケーションフィルター
        if (searchDto.appId) {
            queryBuilder.andWhere('inquiry.appId = :appId', { appId: searchDto.appId });
        }

        // 状態フィルター
        if (searchDto.status && searchDto.status.length > 0) {
            queryBuilder.andWhere('inquiry.status IN (:...status)', { status: searchDto.status });
        }

        // 優先度フィルター
        if (searchDto.priority && searchDto.priority.length > 0) {
            queryBuilder.andWhere('inquiry.priority IN (:...priority)', { priority: searchDto.priority });
        }

        // カテゴリフィルター
        if (searchDto.category && searchDto.category.length > 0) {
            queryBuilder.andWhere('inquiry.category IN (:...category)', { category: searchDto.category });
        }

        // 担当者フィルター
        if (searchDto.assignedTo) {
            queryBuilder.andWhere('inquiry.assignedTo = :assignedTo', { assignedTo: searchDto.assignedTo });
        }

        // 顧客メールフィルター
        if (searchDto.customerEmail) {
            queryBuilder.andWhere('inquiry.customerEmail = :customerEmail', { customerEmail: searchDto.customerEmail });
        }

        // 日付範囲フィルター
        if (searchDto.createdAtFrom) {
            queryBuilder.andWhere('inquiry.createdAt >= :createdAtFrom', { createdAtFrom: searchDto.createdAtFrom });
        }
        if (searchDto.createdAtTo) {
            queryBuilder.andWhere('inquiry.createdAt <= :createdAtTo', { createdAtTo: searchDto.createdAtTo });
        }

        // タグフィルター
        if (searchDto.tags && searchDto.tags.length > 0) {
            queryBuilder.andWhere('inquiry.tags && :tags', { tags: searchDto.tags });
        }

        // 未割り当てフィルター
        if (searchDto.unassignedOnly) {
            queryBuilder.andWhere('inquiry.assignedTo IS NULL');
        }

        // 初回回答待ちフィルター
        if (searchDto.awaitingFirstResponse) {
            queryBuilder.andWhere('inquiry.firstResponseAt IS NULL');
        }

        return queryBuilder;
    }

    /**
     * ソートを適用する
     */
    private applySorting(queryBuilder: SelectQueryBuilder<Inquiry>, searchDto: SearchInquiryDto): void {
        const { sortBy = 'createdAt', sortOrder = 'DESC' } = searchDto;

        // ソート可能なフィールドを制限
        const allowedSortFields = [
            'createdAt',
            'updatedAt',
            'title',
            'status',
            'priority',
            'customerEmail'
        ];

        if (allowedSortFields.includes(sortBy)) {
            queryBuilder.orderBy(`inquiry.${sortBy}`, sortOrder);
        } else {
            // デフォルトソート
            queryBuilder.orderBy('inquiry.createdAt', 'DESC');
        }
    }
}