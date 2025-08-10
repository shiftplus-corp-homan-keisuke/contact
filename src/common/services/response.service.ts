/**
 * 回答サービス
 * 要件: 2.1, 2.3, 2.4 (回答管理機能)
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from '../entities/response.entity';
import { ResponseHistory } from '../entities/response-history.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { User } from '../entities/user.entity';
import { CreateResponseDto, UpdateResponseDto } from '../dto/response.dto';

@Injectable()
export class ResponseService {
  private readonly logger = new Logger(ResponseService.name);

  constructor(
    @InjectRepository(Response)
    private readonly responseRepository: Repository<Response>,
    @InjectRepository(ResponseHistory)
    private readonly responseHistoryRepository: Repository<ResponseHistory>,
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 回答を追加する
   * 要件: 2.1 (問い合わせと回答の関連付け機能)
   */
  async addResponse(createResponseDto: CreateResponseDto, userId: string): Promise<Response> {
    this.logger.log(`回答追加開始: 問い合わせID=${createResponseDto.inquiryId}, ユーザーID=${userId}`);

    // 問い合わせの存在確認
    const inquiry = await this.inquiryRepository.findOne({
      where: { id: createResponseDto.inquiryId }
    });
    if (!inquiry) {
      throw new BadRequestException('指定された問い合わせが見つかりません');
    }

    // ユーザーの存在確認
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });
    if (!user) {
      throw new BadRequestException('指定されたユーザーが見つかりません');
    }

    // 回答エンティティの作成
    const response = this.responseRepository.create({
      inquiryId: createResponseDto.inquiryId,
      userId: userId,
      content: createResponseDto.content,
      isPublic: createResponseDto.isPublic || false,
    });

    // データベースに保存
    const savedResponse = await this.responseRepository.save(response);
    
    this.logger.log(`回答追加完了: ID=${savedResponse.id}`);

    return savedResponse;
  }

  /**
   * 回答を更新する
   * 要件: 2.3, 2.4 (回答の更新・履歴管理機能)
   */
  async updateResponse(responseId: string, updateResponseDto: UpdateResponseDto, userId: string): Promise<Response> {
    this.logger.log(`回答更新開始: ID=${responseId}, ユーザーID=${userId}`);

    // 既存の回答を取得
    const existingResponse = await this.responseRepository.findOne({
      where: { id: responseId },
      relations: ['user', 'inquiry'],
    });

    if (!existingResponse) {
      throw new NotFoundException('指定された回答が見つかりません');
    }

    // 履歴記録（内容が変更される場合のみ）
    if (updateResponseDto.content && updateResponseDto.content !== existingResponse.content) {
      await this.recordResponseHistory(responseId, existingResponse.content, updateResponseDto.content, userId);
    }

    // 更新データをマージ
    Object.assign(existingResponse, updateResponseDto);

    // データベースに保存
    const updatedResponse = await this.responseRepository.save(existingResponse);
    
    this.logger.log(`回答更新完了: ID=${responseId}`);

    return updatedResponse;
  }

  /**
   * 回答を取得する
   * 要件: 2.1 (回答取得機能)
   */
  async getResponse(responseId: string): Promise<Response> {
    this.logger.log(`回答取得: ID=${responseId}`);

    const response = await this.responseRepository.findOne({
      where: { id: responseId },
      relations: ['user', 'inquiry', 'history', 'history.changedByUser'],
    });

    if (!response) {
      throw new NotFoundException('指定された回答が見つかりません');
    }

    return response;
  }

  /**
   * 問い合わせに関連する回答一覧を取得する
   * 要件: 2.3 (時系列での履歴表示機能)
   */
  async getResponsesByInquiry(inquiryId: string): Promise<Response[]> {
    this.logger.log(`問い合わせ回答一覧取得: 問い合わせID=${inquiryId}`);

    // 問い合わせの存在確認
    const inquiry = await this.inquiryRepository.findOne({
      where: { id: inquiryId }
    });
    if (!inquiry) {
      throw new NotFoundException('指定された問い合わせが見つかりません');
    }

    const responses = await this.responseRepository.find({
      where: { inquiryId },
      relations: ['user', 'history', 'history.changedByUser'],
      order: { createdAt: 'ASC' }, // 時系列順
    });

    return responses;
  }

  /**
   * 回答履歴を取得する
   * 要件: 2.4 (履歴管理機能)
   */
  async getResponseHistory(responseId: string): Promise<ResponseHistory[]> {
    this.logger.log(`回答履歴取得: 回答ID=${responseId}`);

    // 回答の存在確認
    const response = await this.responseRepository.findOne({
      where: { id: responseId }
    });
    if (!response) {
      throw new NotFoundException('指定された回答が見つかりません');
    }

    const history = await this.responseHistoryRepository.find({
      where: { responseId },
      relations: ['changedByUser'],
      order: { changedAt: 'DESC' }, // 新しい順
    });

    return history;
  }

  /**
   * 回答を削除する
   */
  async deleteResponse(responseId: string): Promise<void> {
    this.logger.log(`回答削除: ID=${responseId}`);

    const response = await this.getResponse(responseId);
    
    // 履歴も含めて削除
    await this.responseHistoryRepository.delete({ responseId });
    await this.responseRepository.remove(response);
    
    this.logger.log(`回答削除完了: ID=${responseId}`);
  }

  /**
   * 回答履歴を記録する
   * 要件: 2.4 (回答更新履歴の保持)
   */
  private async recordResponseHistory(
    responseId: string,
    oldContent: string,
    newContent: string,
    changedBy: string
  ): Promise<ResponseHistory> {
    this.logger.log(`回答履歴記録: 回答ID=${responseId}`);

    const history = this.responseHistoryRepository.create({
      responseId,
      oldContent,
      newContent,
      changedBy,
    });

    const savedHistory = await this.responseHistoryRepository.save(history);
    
    this.logger.log(`回答履歴記録完了: ID=${savedHistory.id}`);

    return savedHistory;
  }

  /**
   * 公開回答のみを取得する（顧客向け）
   * 要件: 2.1 (公開回答の取得)
   */
  async getPublicResponsesByInquiry(inquiryId: string): Promise<Response[]> {
    this.logger.log(`公開回答一覧取得: 問い合わせID=${inquiryId}`);

    const responses = await this.responseRepository.find({
      where: { 
        inquiryId,
        isPublic: true 
      },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return responses;
  }

  /**
   * 回答統計を取得する
   */
  async getResponseStats(inquiryId?: string): Promise<{
    totalResponses: number;
    publicResponses: number;
    privateResponses: number;
    averageResponseTime?: number;
  }> {
    this.logger.log(`回答統計取得: 問い合わせID=${inquiryId || 'all'}`);

    const whereCondition = inquiryId ? { inquiryId } : {};

    const [totalResponses, publicResponses] = await Promise.all([
      this.responseRepository.count({ where: whereCondition }),
      this.responseRepository.count({ where: { ...whereCondition, isPublic: true } }),
    ]);

    const privateResponses = totalResponses - publicResponses;

    return {
      totalResponses,
      publicResponses,
      privateResponses,
    };
  }
}