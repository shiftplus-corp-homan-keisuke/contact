/**
 * 問い合わせサービス
 * 要件: 1.1, 1.3, 1.4 (問い合わせ登録・管理機能)
 */

import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { Application } from '../../../common/entities/application.entity';
import { User } from '../../users/entities/user.entity';
import { UserRepository } from '../../users/repositories/user.repository';
import { CreateInquiryDto, UpdateInquiryDto } from '../../../common/dto/inquiry.dto';
import { SearchInquiriesDto, SearchResultDto } from '../../../common/dto/search.dto';
import { InquiryStatus, InquiryPriority, ValidationResult, ValidationError } from '../../../common/types/inquiry.types';
import { SearchService } from '../../../common/services/search.service';
import { VectorService } from '../../search/services/vector.service';
import { HybridSearchService } from '../../search/services/hybrid-search.service';
import { AnalyticsGateway } from '../../../common/gateways/analytics.gateway';

@Injectable()
export class InquiryService {
  private readonly logger = new Logger(InquiryService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly userRepository: UserRepository,
    private readonly searchService: SearchService,
    private readonly vectorService: VectorService,
    private readonly hybridSearchService: HybridSearchService,
    @Inject(forwardRef(() => AnalyticsGateway))
    private readonly analyticsGateway: AnalyticsGateway,
  ) {}

  /**
   * 問い合わせを作成する
   * 要件: 1.1, 1.3 (問い合わせ登録機能)
   */
  async createInquiry(createInquiryDto: CreateInquiryDto): Promise<Inquiry> {
    this.logger.log(`問い合わせ作成開始: ${createInquiryDto.title}`);

    // バリデーション実行
    const validationResult = await this.validateInquiryData(createInquiryDto);
    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors.map(error => error.message).join(', ');
      throw new BadRequestException(`入力データに不備があります: ${errorMessages}`);
    }

    // アプリケーションの存在確認
    const application = await this.applicationRepository.findOne({
      where: { id: createInquiryDto.appId }
    });
    if (!application) {
      throw new BadRequestException('指定されたアプリケーションが見つかりません');
    }

    // 問い合わせエンティティの作成
    const inquiry = this.inquiryRepository.create({
      ...createInquiryDto,
      status: InquiryStatus.NEW,
      priority: createInquiryDto.priority || InquiryPriority.MEDIUM,
    });

    // データベースに保存
    const savedInquiry = await this.inquiryRepository.save(inquiry);
    
    this.logger.log(`問い合わせ作成完了: ID=${savedInquiry.id}`);
    
    // ベクトル化して保存（要件3.1）
    try {
      await this.vectorService.storeInquiryVector(savedInquiry);
    } catch (error) {
      this.logger.error(`ベクトル化エラー: ${error.message}`, error.stack);
      // ベクトル化エラーは問い合わせ作成を阻害しない
    }
    
    // 登録完了通知（要件1.5）
    await this.notifyInquiryCreated(savedInquiry);

    return savedInquiry;
  }

  /**
   * 問い合わせを取得する
   * 要件: 1.1 (問い合わせ取得機能)
   */
  async getInquiry(id: string): Promise<Inquiry> {
    this.logger.log(`問い合わせ取得: ID=${id}`);

    const inquiry = await this.inquiryRepository.findOne({
      where: { id },
      relations: ['application', 'assignedUser', 'responses', 'statusHistory'],
    });

    if (!inquiry) {
      throw new NotFoundException('指定された問い合わせが見つかりません');
    }

    return inquiry;
  }

  /**
   * 問い合わせを更新する
   * 要件: 1.1 (問い合わせ更新機能)
   */
  async updateInquiry(id: string, updateInquiryDto: UpdateInquiryDto): Promise<Inquiry> {
    this.logger.log(`問い合わせ更新開始: ID=${id}`);

    // 既存の問い合わせを取得
    const existingInquiry = await this.getInquiry(id);

    // 担当者の存在確認（指定されている場合）
    if (updateInquiryDto.assignedTo) {
      const user = await this.userRepository.findById(updateInquiryDto.assignedTo);
      if (!user) {
        throw new BadRequestException('指定された担当者が見つかりません');
      }
    }

    // 更新データをマージ
    Object.assign(existingInquiry, updateInquiryDto);

    // データベースに保存
    const updatedInquiry = await this.inquiryRepository.save(existingInquiry);
    
    // ベクトルデータの更新（要件3.3）
    if (updateInquiryDto.title || updateInquiryDto.content) {
      try {
        await this.vectorService.storeInquiryVector(updatedInquiry);
      } catch (error) {
        this.logger.error(`ベクトル更新エラー: ${error.message}`, error.stack);
        // ベクトル更新エラーは問い合わせ更新を阻害しない
      }
    }
    
    this.logger.log(`問い合わせ更新完了: ID=${id}`);

    return updatedInquiry;
  }

  /**
   * 問い合わせ一覧を取得する
   * 要件: 8.1, 8.4 (検索・フィルタリング機能)
   */
  async getInquiries(page: number = 1, limit: number = 20): Promise<{
    items: Inquiry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log(`問い合わせ一覧取得: page=${page}, limit=${limit}`);

    const [items, total] = await this.inquiryRepository.findAndCount({
      relations: ['application', 'assignedUser'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 問い合わせを検索・フィルタリングする
   * 要件: 8.1, 8.2, 8.4 (検索・フィルタリング機能)
   */
  async searchInquiries(searchDto: SearchInquiriesDto): Promise<SearchResultDto<Inquiry>> {
    this.logger.log(`問い合わせ検索実行: query="${searchDto.query}"`);
    return await this.searchService.searchInquiries(searchDto);
  }

  /**
   * 問い合わせデータのバリデーション
   * 要件: 1.4 (必須項目バリデーション)
   */
  async validateInquiryData(inquiryData: CreateInquiryDto): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // 必須項目チェック
    if (!inquiryData.title || inquiryData.title.trim() === '') {
      errors.push({
        field: 'title',
        message: 'タイトルは必須項目です',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!inquiryData.content || inquiryData.content.trim() === '') {
      errors.push({
        field: 'content',
        message: '内容は必須項目です',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!inquiryData.appId || inquiryData.appId.trim() === '') {
      errors.push({
        field: 'appId',
        message: '対象アプリは必須項目です',
        code: 'REQUIRED_FIELD'
      });
    }

    // 文字数制限チェック
    if (inquiryData.title && inquiryData.title.length > 500) {
      errors.push({
        field: 'title',
        message: 'タイトルは500文字以内で入力してください',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    }

    // メールアドレス形式チェック
    if (inquiryData.customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inquiryData.customerEmail)) {
        errors.push({
          field: 'customerEmail',
          message: '有効なメールアドレスを入力してください',
          code: 'INVALID_EMAIL_FORMAT'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 問い合わせ作成通知
   * 要件: 1.5 (登録完了通知), 9.1 (リアルタイムデータ更新機能)
   */
  private async notifyInquiryCreated(inquiry: Inquiry): Promise<void> {
    try {
      this.logger.log(`問い合わせ作成通知送信: ID=${inquiry.id}`);
      
      // リアルタイム分析更新通知
      await this.analyticsGateway.notifyInquiryCreated({
        id: inquiry.id,
        title: inquiry.title,
        appId: inquiry.appId,
        status: inquiry.status,
        priority: inquiry.priority,
        category: inquiry.category,
        createdAt: inquiry.createdAt
      });
      
      // 実際の通知処理は通知サービスで実装予定
      // ここでは基本的なログ出力のみ
      this.logger.log(`新規問い合わせが登録されました: ${inquiry.title}`);
      
    } catch (error) {
      this.logger.error(`通知送信エラー: ${error.message}`, error.stack);
      // 通知エラーは問い合わせ作成を阻害しない
    }
  }

  /**
   * 問い合わせを削除する（論理削除）
   */
  async deleteInquiry(id: string): Promise<void> {
    this.logger.log(`問い合わせ削除: ID=${id}`);

    const inquiry = await this.getInquiry(id);
    
    // 論理削除の実装（必要に応じて）
    // ここでは物理削除を実装
    await this.inquiryRepository.remove(inquiry);
    
    this.logger.log(`問い合わせ削除完了: ID=${id}`);
  }
}