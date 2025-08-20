/**
 * 回答サービス
 * 要件2.1: 問い合わせと回答の関連付け機能
 * 要件2.3: 回答の追加・更新・履歴管理機能
 * 要件2.4: 時系列での履歴表示機能
 */

import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

import { Response } from '../entities/response.entity';
import { ResponseHistory } from '../entities/response-history.entity';
import { Inquiry } from '../../inquiries/entities/inquiry.entity';
import {
    CreateResponseDto,
    UpdateResponseDto,
    ResponseResponseDto,
    ResponseDetailResponseDto
} from '../dto';

@Injectable()
export class ResponsesService {
    private readonly logger = new Logger(ResponsesService.name);

    constructor(
        @InjectRepository(Response)
        private readonly responseRepository: Repository<Response>,
        @InjectRepository(ResponseHistory)
        private readonly responseHistoryRepository: Repository<ResponseHistory>,
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>
    ) { }

    /**
     * 回答を作成する
     * 要件2.1: 問い合わせと回答の関連付け機能
     */
    async createResponse(
        createResponseDto: CreateResponseDto,
        userId: string
    ): Promise<ResponseResponseDto> {
        this.logger.log(`回答作成開始: 問い合わせID=${createResponseDto.inquiryId}`);

        // バリデーション実行
        await this.validateCreateResponseDto(createResponseDto);

        // 問い合わせの存在確認
        await this.validateInquiryExists(createResponseDto.inquiryId);

        try {
            // 回答エンティティを作成
            const response = this.responseRepository.create({
                ...createResponseDto,
                userId,
                isPublic: createResponseDto.isPublic || false,
                isInternal: createResponseDto.isInternal || false,
                attachmentIds: createResponseDto.attachmentIds || [],
                metadata: createResponseDto.metadata || {}
            });

            // データベースに保存
            const savedResponse = await this.responseRepository.save(response);

            // 初回作成履歴を記録
            await this.createResponseHistory(
                savedResponse.id,
                null,
                savedResponse.content,
                userId,
                'create',
                '回答が作成されました'
            );

            // 問い合わせの初回回答日時を更新（まだ設定されていない場合）
            await this.updateInquiryFirstResponseTime(createResponseDto.inquiryId);

            this.logger.log(`回答作成完了: ID=${savedResponse.id}`);

            // レスポンスDTOに変換して返却
            return plainToClass(ResponseResponseDto, savedResponse, {
                excludeExtraneousValues: true
            });

        } catch (error) {
            this.logger.error(`回答作成エラー: ${error.message}`, error.stack);
            throw new BadRequestException('回答の作成に失敗しました');
        }
    }

    /**
     * 回答を取得する（詳細情報含む）
     * 要件2.4: 時系列での履歴表示機能
     */
    async getResponse(id: string): Promise<ResponseDetailResponseDto> {
        this.logger.log(`回答取得: ID=${id}`);

        const response = await this.responseRepository.findOne({
            where: { id },
            relations: [
                'user',
                'inquiry',
                'history',
                'history.changedByUser'
            ],
            order: {
                history: {
                    changedAt: 'ASC'
                }
            }
        });

        if (!response) {
            throw new NotFoundException(`回答が見つかりません: ID=${id}`);
        }

        return plainToClass(ResponseDetailResponseDto, response, {
            excludeExtraneousValues: true
        });
    }

    /**
     * 回答を更新する
     * 要件2.3: 回答の更新・履歴管理機能
     */
    async updateResponse(
        id: string,
        updateResponseDto: UpdateResponseDto,
        updatedBy: string,
        ipAddress?: string
    ): Promise<ResponseResponseDto> {
        this.logger.log(`回答更新開始: ID=${id}`);

        // 存在確認
        const existingResponse = await this.responseRepository.findOne({
            where: { id }
        });

        if (!existingResponse) {
            throw new NotFoundException(`回答が見つかりません: ID=${id}`);
        }

        try {
            // 変更前の内容を保存
            const oldContent = existingResponse.content;

            // 更新データをマージ
            const updatedResponse = this.responseRepository.merge(
                existingResponse,
                updateResponseDto
            );

            // データベースに保存
            const savedResponse = await this.responseRepository.save(updatedResponse);

            // 履歴を記録（内容が変更された場合のみ）
            if (updateResponseDto.content && updateResponseDto.content !== oldContent) {
                await this.createResponseHistory(
                    id,
                    oldContent,
                    updateResponseDto.content,
                    updatedBy,
                    'update',
                    updateResponseDto.updateComment,
                    ipAddress
                );
            }

            this.logger.log(`回答更新完了: ID=${id}`);

            return plainToClass(ResponseResponseDto, savedResponse, {
                excludeExtraneousValues: true
            });

        } catch (error) {
            this.logger.error(`回答更新エラー: ${error.message}`, error.stack);
            throw new BadRequestException('回答の更新に失敗しました');
        }
    }

    /**
     * 問い合わせに関連する回答一覧を取得する
     * 要件2.1: 問い合わせと回答の関連付け機能
     * 要件2.4: 時系列での履歴表示機能
     */
    async getResponsesByInquiry(inquiryId: string): Promise<ResponseResponseDto[]> {
        this.logger.log(`問い合わせ回答一覧取得: 問い合わせID=${inquiryId}`);

        // 問い合わせの存在確認
        await this.validateInquiryExists(inquiryId);

        // 回答を時系列順で取得
        const responses = await this.responseRepository.find({
            where: { inquiryId },
            relations: ['user'],
            order: { createdAt: 'ASC' }
        });

        return responses.map(response =>
            plainToClass(ResponseResponseDto, response, {
                excludeExtraneousValues: true
            })
        );
    }

    /**
     * 回答履歴を取得する
     * 要件2.3, 2.4: 履歴管理・表示機能
     */
    async getResponseHistory(id: string): Promise<ResponseHistory[]> {
        this.logger.log(`回答履歴取得: ID=${id}`);

        // 回答の存在確認
        const response = await this.responseRepository.findOne({
            where: { id }
        });

        if (!response) {
            throw new NotFoundException(`回答が見つかりません: ID=${id}`);
        }

        // 履歴を時系列順で取得
        const history = await this.responseHistoryRepository.find({
            where: { responseId: id },
            relations: ['changedByUser'],
            order: { changedAt: 'ASC' }
        });

        return history;
    }

    /**
     * 回答を削除する（ソフトデリート）
     */
    async deleteResponse(
        id: string,
        deletedBy: string,
        ipAddress?: string
    ): Promise<void> {
        this.logger.log(`回答削除開始: ID=${id}`);

        // 存在確認
        const existingResponse = await this.responseRepository.findOne({
            where: { id }
        });

        if (!existingResponse) {
            throw new NotFoundException(`回答が見つかりません: ID=${id}`);
        }

        try {
            // 削除履歴を記録
            await this.createResponseHistory(
                id,
                existingResponse.content,
                null,
                deletedBy,
                'delete',
                '回答が削除されました',
                ipAddress
            );

            // ソフトデリート実行
            await this.responseRepository.softDelete(id);

            this.logger.log(`回答削除完了: ID=${id}`);

        } catch (error) {
            this.logger.error(`回答削除エラー: ${error.message}`, error.stack);
            throw new BadRequestException('回答の削除に失敗しました');
        }
    }

    /**
     * バリデーション: 回答作成DTO
     */
    private async validateCreateResponseDto(dto: CreateResponseDto): Promise<void> {
        // DTOインスタンスに変換してからバリデーション
        const dtoInstance = plainToClass(CreateResponseDto, dto);
        const errors = await validate(dtoInstance);
        if (errors.length > 0) {
            const errorMessages = errors.map(error =>
                Object.values(error.constraints || {}).join(', ')
            ).join('; ');
            throw new BadRequestException(`入力データに不備があります: ${errorMessages}`);
        }
    }

    /**
     * バリデーション: 問い合わせ存在確認
     */
    private async validateInquiryExists(inquiryId: string): Promise<void> {
        const inquiry = await this.inquiryRepository.findOne({
            where: { id: inquiryId }
        });

        if (!inquiry) {
            throw new BadRequestException(`指定された問い合わせが見つかりません: ${inquiryId}`);
        }
    }

    /**
     * 回答履歴を作成する
     */
    private async createResponseHistory(
        responseId: string,
        oldContent: string | null,
        newContent: string | null,
        changedBy: string,
        changeType: string,
        comment?: string,
        ipAddress?: string
    ): Promise<void> {
        const responseHistory = this.responseHistoryRepository.create({
            responseId,
            oldContent,
            newContent,
            changedBy,
            changeType,
            comment,
            ipAddress,
            metadata: {}
        });

        await this.responseHistoryRepository.save(responseHistory);
    }

    /**
     * 問い合わせの初回回答日時を更新する
     */
    private async updateInquiryFirstResponseTime(inquiryId: string): Promise<void> {
        const inquiry = await this.inquiryRepository.findOne({
            where: { id: inquiryId }
        });

        if (inquiry && !inquiry.firstResponseAt) {
            await this.inquiryRepository.update(inquiryId, {
                firstResponseAt: new Date()
            });
        }
    }
}