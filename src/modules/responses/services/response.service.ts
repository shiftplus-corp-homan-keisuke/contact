/**
 * 回答サービス
 * 要件: 2.1, 2.2, 2.3 (回答管理機能)
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Response } from '../entities/response.entity';
import { Inquiry } from '../../../modules/inquiries/entities/inquiry.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { Template } from '../../../common/entities/template.entity';
import { ResponseRepository } from '../repositories/response.repository';
import { InquiryRepository } from '../../../modules/inquiries/repositories/inquiry.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { TemplateRepository } from '../../../common/repositories/template.repository';
import { EmailService } from '../../../common/services/email.service';
import { NotificationService } from '../../../common/services/notification.service';
import { TemplateService } from '../../templates/services/template.service';
import { AnalyticsGateway } from '../../../common/gateways/analytics.gateway';
import {
  CreateResponseDto,
  UpdateResponseDto,
  ResponseDto,
  ResponseDetailDto,
  ResponseHistoryDto,
} from '../../../common/dto/response.dto';
import { ResponseStatus } from '../../../common/types/response.types';
import { InquiryStatus } from '../../../common/types/inquiry.types';
import { validateResponseUpdate } from '../../../common/validators/response.validators';

@Injectable()
export class ResponseService {
  private readonly logger = new Logger(ResponseService.name);

  constructor(
    private readonly responseRepository: ResponseRepository,
    private readonly inquiryRepository: InquiryRepository,
    private readonly userRepository: UserRepository,
    private readonly templateRepository: TemplateRepository,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly templateService: TemplateService,
    private readonly analyticsGateway: AnalyticsGateway,
  ) {}

  /**
   * 回答作成
   * 要件: 2.1 - 問い合わせに対する回答の作成と送信
   */
  async createResponse(
    createResponseDto: CreateResponseDto,
    userId: string,
    files?: Express.Multer.File[],
  ): Promise<ResponseDto> {
    try {
      // バリデーション
      const validation = validateResponseData(createResponseDto);
      if (!validation.isValid) {
        throw new BadRequestException(validation.errors.join(', '));
      }

      // 問い合わせの存在確認
      const inquiry = await this.inquiryRepository.findOne({
        where: { id: createResponseDto.inquiryId },
        relations: ['application'],
      });
      if (!inquiry) {
        throw new NotFoundException('問い合わせが見つかりません');
      }

      // ユーザーの存在確認
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundException('ユーザーが見つかりません');
      }

      // 回答作成
      const response = this.responseRepository.create({
        ...createResponseDto,
        userId,
        status: createResponseDto.isInternal ? ResponseStatus.INTERNAL : ResponseStatus.DRAFT,
      });

      const savedResponse = await this.responseRepository.save(response);

      // ファイル添付の処理
      if (files && files.length > 0) {
        // ファイル処理ロジック（実装は省略）
      }

      // 問い合わせのステータス更新
      if (!createResponseDto.isInternal) {
        await this.updateInquiryStatus(inquiry, InquiryStatus.IN_PROGRESS);
      }

      // リアルタイム通知
      this.analyticsGateway.emitResponseCreated({
        responseId: savedResponse.id,
        inquiryId: savedResponse.inquiryId,
        userId,
        isInternal: savedResponse.isInternal,
      });

      return this.mapToDto(savedResponse);
    } catch (error) {
      this.logger.error(`回答作成エラー: ${error.message}`);
      throw error;
    }
  }

  /**
   * 問い合わせの回答一覧取得
   * 要件: 2.2 - 回答履歴の管理と表示
   */
  async getResponsesByInquiry(
    inquiryId: string,
    includeInternal: boolean = false,
    userId: string,
  ): Promise<ResponseDto[]> {
    // 問い合わせの存在確認
    const inquiry = await this.inquiryRepository.findOne({ where: { id: inquiryId } });
    if (!inquiry) {
      throw new NotFoundException('問い合わせが見つかりません');
    }

    const whereConditions: any = { inquiryId };
    
    // 内部メモを含まない場合
    if (!includeInternal) {
      whereConditions.isInternal = false;
    }

    const responses = await this.responseRepository.find({
      where: whereConditions,
      relations: ['user', 'files'],
      order: { createdAt: 'ASC' },
    });

    return responses.map(response => this.mapToDto(response));
  }

  /**
   * 回答詳細取得
   * 要件: 2.2 - 回答の詳細情報表示
   */
  async getResponse(id: string, userId: string): Promise<ResponseDetailDto> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: [
        'inquiry',
        'inquiry.application',
        'user',
        'files',
        'history',
        'history.changedByUser',
      ],
    });

    if (!response) {
      throw new NotFoundException('回答が見つかりません');
    }

    return this.mapToDetailDto(response);
  }

  /**
   * 回答更新
   * 要件: 2.3 - 回答の編集と更新機能
   */
  async updateResponse(
    id: string,
    updateResponseDto: UpdateResponseDto,
    userId: string,
  ): Promise<ResponseDto> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!response) {
      throw new NotFoundException('回答が見つかりません');
    }

    // 権限チェック（作成者または管理者のみ編集可能）
    if (response.userId !== userId) {
      // 管理者権限チェック（実装は省略）
      throw new ForbiddenException('この回答を編集する権限がありません');
    }

    // 送信済みの回答は編集不可
    if (response.status === ResponseStatus.SENT) {
      throw new BadRequestException('送信済みの回答は編集できません');
    }

    // 変更履歴の記録
    await this.responseRepository.createHistory({
      responseId: id,
      oldContent: response.content,
      newContent: updateResponseDto.content || response.content,
      changedBy: userId,
      changeType: 'update',
    });

    // 更新データの適用
    Object.assign(response, updateResponseDto);
    response.updatedAt = new Date();

    const updatedResponse = await this.responseRepository.save(response);

    // リアルタイム通知
    this.analyticsGateway.emitResponseUpdated({
      responseId: id,
      changes: updateResponseDto,
      updatedBy: userId,
    });

    return this.mapToDto(updatedResponse);
  }

  /**
   * 回答削除
   */
  async deleteResponse(id: string, userId: string): Promise<void> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!response) {
      throw new NotFoundException('回答が見つかりません');
    }

    // 権限チェック
    if (response.userId !== userId) {
      // 管理者権限チェック（実装は省略）
      throw new ForbiddenException('この回答を削除する権限がありません');
    }

    // 送信済みの回答は削除不可
    if (response.status === ResponseStatus.SENT) {
      throw new BadRequestException('送信済みの回答は削除できません');
    }

    await this.responseRepository.remove(response);

    // リアルタイム通知
    this.analyticsGateway.emitResponseDeleted({
      responseId: id,
      deletedBy: userId,
    });
  }

  /**
   * 回答送信
   * 要件: 2.1 - 回答の送信管理
   */
  async sendResponse(id: string, userId: string): Promise<ResponseDto> {
    const response = await this.responseRepository.findOne({
      where: { id },
      relations: ['inquiry', 'inquiry.application', 'user'],
    });

    if (!response) {
      throw new NotFoundException('回答が見つかりません');
    }

    // 内部メモは送信不可
    if (response.isInternal) {
      throw new BadRequestException('内部メモは送信できません');
    }

    // 既に送信済み
    if (response.status === ResponseStatus.SENT) {
      throw new BadRequestException('この回答は既に送信済みです');
    }

    // メール送信
    try {
      await this.emailService.sendResponseEmail({
        to: response.inquiry.customerEmail,
        subject: `Re: ${response.inquiry.title}`,
        content: response.content,
        inquiryId: response.inquiryId,
        responseId: response.id,
      });

      // ステータス更新
      response.status = ResponseStatus.SENT;
      response.sentAt = new Date();
      response.updatedAt = new Date();

      const updatedResponse = await this.responseRepository.save(response);

      // 問い合わせのステータス更新
      await this.updateInquiryStatus(response.inquiry, InquiryStatus.WAITING_FOR_CUSTOMER);

      // 通知送信
      await this.notificationService.sendResponseNotification({
        inquiryId: response.inquiryId,
        responseId: response.id,
        customerEmail: response.inquiry.customerEmail,
        appId: response.inquiry.appId,
      });

      // リアルタイム通知
      this.analyticsGateway.emitResponseSent({
        responseId: id,
        inquiryId: response.inquiryId,
        sentBy: userId,
      });

      return this.mapToDto(updatedResponse);
    } catch (error) {
      this.logger.error(`回答送信エラー: ${error.message}`);
      throw new BadRequestException('回答の送信に失敗しました');
    }
  }

  /**
   * 回答履歴取得
   * 要件: 2.2 - 回答の変更履歴管理
   */
  async getResponseHistory(id: string, userId: string): Promise<ResponseHistoryDto[]> {
    const response = await this.responseRepository.findOne({ where: { id } });
    if (!response) {
      throw new NotFoundException('回答が見つかりません');
    }

    const history = await this.responseRepository.getHistory(id);
    
    return history.map(item => ({
      id: item.id,
      changeType: item.changeType,
      oldContent: item.oldContent,
      newContent: item.newContent,
      changedBy: item.changedByUser ? {
        id: item.changedByUser.id,
        name: item.changedByUser.name,
      } : undefined,
      changedAt: item.changedAt,
    }));
  }

  /**
   * テンプレートから回答作成
   * 要件: 2.3 - テンプレートを使用した回答作成
   */
  async createResponseFromTemplate(
    inquiryId: string,
    templateId: string,
    variables: Record<string, any>,
    userId: string,
  ): Promise<ResponseDto> {
    // 問い合わせの存在確認
    const inquiry = await this.inquiryRepository.findOne({
      where: { id: inquiryId },
      relations: ['application'],
    });
    if (!inquiry) {
      throw new NotFoundException('問い合わせが見つかりません');
    }

    // テンプレートの存在確認
    const template = await this.templateRepository.findOne({ where: { id: templateId } });
    if (!template) {
      throw new NotFoundException('テンプレートが見つかりません');
    }

    // テンプレートの処理
    const processedContent = await this.templateService.processTemplate(
      template.content,
      {
        ...variables,
        inquiry: {
          title: inquiry.title,
          content: inquiry.content,
          customerName: inquiry.customerName,
          customerEmail: inquiry.customerEmail,
        },
      },
    );

    // 回答作成
    const createResponseDto: CreateResponseDto = {
      inquiryId,
      content: processedContent,
      isInternal: false,
    };

    return this.createResponse(createResponseDto, userId);
  }

  /**
   * 下書き保存
   * 要件: 2.3 - 下書き機能
   */
  async saveDraft(createResponseDto: CreateResponseDto, userId: string): Promise<ResponseDto> {
    // 問い合わせの存在確認
    const inquiry = await this.inquiryRepository.findOne({
      where: { id: createResponseDto.inquiryId },
    });
    if (!inquiry) {
      throw new NotFoundException('問い合わせが見つかりません');
    }

    // 下書きとして保存
    const response = this.responseRepository.create({
      ...createResponseDto,
      userId,
      status: ResponseStatus.DRAFT,
    });

    const savedResponse = await this.responseRepository.save(response);
    return this.mapToDto(savedResponse);
  }

  /**
   * ユーザーの下書き一覧取得
   * 要件: 2.3 - 下書き管理機能
   */
  async getUserDrafts(userId: string): Promise<ResponseDto[]> {
    const drafts = await this.responseRepository.find({
      where: {
        userId,
        status: ResponseStatus.DRAFT,
      },
      relations: ['inquiry', 'inquiry.application'],
      order: { updatedAt: 'DESC' },
    });

    return drafts.map(draft => this.mapToDto(draft));
  }

  /**
   * 問い合わせステータス更新
   */
  private async updateInquiryStatus(inquiry: Inquiry, status: InquiryStatus): Promise<void> {
    inquiry.status = status;
    inquiry.updatedAt = new Date();
    await this.inquiryRepository.save(inquiry);
  }

  /**
   * DTOマッピング
   */
  private mapToDto(response: Response): ResponseDto {
    return {
      id: response.id,
      inquiryId: response.inquiryId,
      content: response.content,
      isInternal: response.isInternal,
      status: response.status,
      userId: response.userId,
      user: response.user ? {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
      } : undefined,
      sentAt: response.sentAt,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }

  /**
   * 詳細DTOマッピング
   */
  private mapToDetailDto(response: Response): ResponseDetailDto {
    return {
      ...this.mapToDto(response),
      inquiry: response.inquiry ? {
        id: response.inquiry.id,
        title: response.inquiry.title,
        status: response.inquiry.status,
        application: response.inquiry.application ? {
          id: response.inquiry.application.id,
          name: response.inquiry.application.name,
        } : undefined,
      } : undefined,
      files: response.files?.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        uploadedAt: file.uploadedAt,
      })) || [],
    };
  }
}