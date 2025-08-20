/**
 * 回答コントローラー
 * 要件2.1: 問い合わせと回答の関連付け機能
 * 要件2.3: 回答の追加・更新・履歴管理機能
 * 要件2.4: 時系列での履歴表示機能
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpStatus,
    Logger,
    ParseUUIDPipe,
    ValidationPipe,
    UsePipes
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth
} from '@nestjs/swagger';

import { ResponsesService } from '../services/responses.service';
import {
    CreateResponseDto,
    UpdateResponseDto,
    ResponseResponseDto,
    ResponseDetailResponseDto
} from '../dto';
import { ResponseHistory } from '../entities/response-history.entity';

// 認証ガードは後で実装予定
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('responses')
@Controller('api/v1/responses')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ResponsesController {
    private readonly logger = new Logger(ResponsesController.name);

    constructor(private readonly responsesService: ResponsesService) { }

    /**
     * 回答を作成する
     * 要件2.1: 問い合わせと回答の関連付け機能
     */
    @Post()
    @ApiOperation({
        summary: '回答を作成',
        description: '指定された問い合わせに対する回答を作成します。'
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: '回答が正常に作成されました',
        type: ResponseResponseDto
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '入力データに不備があります'
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: '認証が必要です'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async createResponse(
        @Body() createResponseDto: CreateResponseDto,
        @Request() req?: any
    ): Promise<ResponseResponseDto> {
        this.logger.log(`回答作成リクエスト: 問い合わせID=${createResponseDto.inquiryId}`);

        // 認証実装後にユーザーIDを取得
        const userId = req?.user?.id || 'system';

        const result = await this.responsesService.createResponse(
            createResponseDto,
            userId
        );

        this.logger.log(`回答作成完了: ID=${result.id}`);
        return result;
    }

    /**
     * 回答詳細を取得する
     * 要件2.4: 時系列での履歴表示機能
     */
    @Get(':id')
    @ApiOperation({
        summary: '回答詳細を取得',
        description: '指定されたIDの回答詳細情報を取得します。履歴情報を含みます。'
    })
    @ApiParam({
        name: 'id',
        description: '回答ID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '回答詳細を正常に取得しました',
        type: ResponseDetailResponseDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された回答が見つかりません'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async getResponse(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<ResponseDetailResponseDto> {
        this.logger.log(`回答詳細取得リクエスト: ID=${id}`);

        const result = await this.responsesService.getResponse(id);

        this.logger.log(`回答詳細取得完了: ID=${id}`);
        return result;
    }

    /**
     * 回答を更新する
     * 要件2.3: 回答の更新・履歴管理機能
     */
    @Put(':id')
    @ApiOperation({
        summary: '回答を更新',
        description: '指定されたIDの回答情報を更新します。更新履歴が記録されます。'
    })
    @ApiParam({
        name: 'id',
        description: '回答ID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '回答が正常に更新されました',
        type: ResponseResponseDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された回答が見つかりません'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '入力データに不備があります'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async updateResponse(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateResponseDto: UpdateResponseDto,
        @Request() req?: any
    ): Promise<ResponseResponseDto> {
        this.logger.log(`回答更新リクエスト: ID=${id}`);

        // 認証実装後にユーザーIDを取得
        const updatedBy = req?.user?.id || 'system';
        const ipAddress = req?.ip;

        const result = await this.responsesService.updateResponse(
            id,
            updateResponseDto,
            updatedBy,
            ipAddress
        );

        this.logger.log(`回答更新完了: ID=${id}`);
        return result;
    }

    /**
     * 回答を削除する
     */
    @Delete(':id')
    @ApiOperation({
        summary: '回答を削除',
        description: '指定されたIDの回答を削除します。削除履歴が記録されます。'
    })
    @ApiParam({
        name: 'id',
        description: '回答ID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.NO_CONTENT,
        description: '回答が正常に削除されました'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された回答が見つかりません'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async deleteResponse(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req?: any
    ): Promise<void> {
        this.logger.log(`回答削除リクエスト: ID=${id}`);

        // 認証実装後にユーザーIDを取得
        const deletedBy = req?.user?.id || 'system';
        const ipAddress = req?.ip;

        await this.responsesService.deleteResponse(id, deletedBy, ipAddress);

        this.logger.log(`回答削除完了: ID=${id}`);
    }

    /**
     * 回答履歴を取得する
     * 要件2.3, 2.4: 履歴管理・表示機能
     */
    @Get(':id/history')
    @ApiOperation({
        summary: '回答履歴を取得',
        description: '指定されたIDの回答の更新履歴を時系列で取得します。'
    })
    @ApiParam({
        name: 'id',
        description: '回答ID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '回答履歴を正常に取得しました',
        type: [ResponseHistory]
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された回答が見つかりません'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async getResponseHistory(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<ResponseHistory[]> {
        this.logger.log(`回答履歴取得リクエスト: ID=${id}`);

        const result = await this.responsesService.getResponseHistory(id);

        this.logger.log(`回答履歴取得完了: ID=${id}, 履歴件数=${result.length}`);
        return result;
    }
}

/**
 * 問い合わせ関連の回答コントローラー
 * 問い合わせに紐づく回答の操作を提供
 */
@ApiTags('inquiries')
@Controller('api/v1/inquiries/:inquiryId/responses')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class InquiryResponsesController {
    private readonly logger = new Logger(InquiryResponsesController.name);

    constructor(private readonly responsesService: ResponsesService) { }

    /**
     * 問い合わせに関連する回答一覧を取得する
     * 要件2.1: 問い合わせと回答の関連付け機能
     * 要件2.4: 時系列での履歴表示機能
     */
    @Get()
    @ApiOperation({
        summary: '問い合わせの回答一覧を取得',
        description: '指定された問い合わせに関連する回答を時系列で取得します。'
    })
    @ApiParam({
        name: 'inquiryId',
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440001'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '回答一覧を正常に取得しました',
        type: [ResponseResponseDto]
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された問い合わせが見つかりません'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async getResponsesByInquiry(
        @Param('inquiryId', ParseUUIDPipe) inquiryId: string
    ): Promise<ResponseResponseDto[]> {
        this.logger.log(`問い合わせ回答一覧取得リクエスト: 問い合わせID=${inquiryId}`);

        const result = await this.responsesService.getResponsesByInquiry(inquiryId);

        this.logger.log(`問い合わせ回答一覧取得完了: 問い合わせID=${inquiryId}, 回答件数=${result.length}`);
        return result;
    }
}