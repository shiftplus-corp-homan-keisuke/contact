/**
 * 問い合わせコントローラー
 * 要件1: 問い合わせ登録機能
 * 要件2: 問い合わせ・回答管理機能
 * 要件7: API機能
 * 要件8: 検索・フィルタリング機能
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
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
    ApiQuery,
    ApiBearerAuth,
    ApiKeyAuth
} from '@nestjs/swagger';

import { InquiriesService } from '../services/inquiries.service';
import {
    CreateInquiryDto,
    UpdateInquiryDto,
    UpdateInquiryStatusDto,
    SearchInquiryDto,
    InquiryResponseDto,
    InquiryDetailResponseDto
} from '../dto';
import { PaginatedResponseDto } from '../../../common/types/pagination.types';
import { InquiryStatusHistory } from '../entities/inquiry-status-history.entity';

// API共通レスポンス形式
import {
    ApiSuccessResponseDto,
    CreatedResponseDto,
    UpdatedResponseDto,
    PaginatedApiResponseDto,
    API_ERROR_CODES
} from '../../../common/dto/api-response.dto';

// 検索機能
import { SearchService } from '../../search/services/search.service';
import { VectorService, RAGContext } from '../../search/services/vector.service';
import { VectorizationService } from '../../search/services/vectorization.service';
import { HybridSearchService } from '../../search/services/hybrid-search.service';
import { SearchCriteriaDto, PaginatedSearchResultDto } from '../../search/dto/search.dto';
import { HybridSearchRequestDto, PaginatedHybridSearchResultDto } from '../../search/dto/hybrid-search.dto';

// API認証
import { ApiKeyAuth } from '../../api-keys/decorators/api-key-auth.decorator';
import { ApiKeyContext as ApiKeyContextDecorator } from '../../api-keys/decorators/api-key-context.decorator';
import { ApiKeyContext } from '../../api-keys/types/api-key.types';

@ApiTags('inquiries')
@Controller('api/v1/inquiries')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class InquiriesController {
    private readonly logger = new Logger(InquiriesController.name);

    constructor(
        private readonly inquiriesService: InquiriesService,
        private readonly searchService: SearchService,
        private readonly vectorService: VectorService,
        private readonly vectorizationService: VectorizationService,
        private readonly hybridSearchService: HybridSearchService
    ) { }

    /**
     * 問い合わせを作成する
     * 要件1.1, 1.3, 1.4: 問い合わせ登録機能
     * 要件7.2: API経由での問い合わせ登録
     */
    @Post()
    @ApiOperation({
        summary: '問い合わせを作成',
        description: '新しい問い合わせを登録します。管理画面またはAPI経由で利用可能です。'
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: '問い合わせが正常に作成されました',
        type: CreatedResponseDto
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '入力データに不備があります'
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: '認証が必要です'
    })
    @ApiKeyAuth({ windowMs: 60000, max: 100 }) // 1分間に100リクエスト
    async createInquiry(
        @Body() createInquiryDto: CreateInquiryDto,
        @ApiKeyContextDecorator() apiKeyContext: ApiKeyContext,
        @Request() req?: any
    ): Promise<CreatedResponseDto<InquiryResponseDto>> {
        this.logger.log(`問い合わせ作成リクエスト: ${createInquiryDto.title}`);

        // APIキーからアプリケーションIDを取得
        const appId = apiKeyContext?.appId;
        if (createInquiryDto.appId && createInquiryDto.appId !== appId) {
            throw new Error('指定されたアプリケーションIDが認証情報と一致しません');
        }

        // アプリケーションIDが指定されていない場合は認証情報から設定
        if (!createInquiryDto.appId) {
            createInquiryDto.appId = appId;
        }

        const createdBy = req?.user?.id || 'api_user';

        const result = await this.inquiriesService.createInquiry(
            createInquiryDto,
            createdBy
        );

        this.logger.log(`問い合わせ作成完了: ID=${result.id}`);
        return new CreatedResponseDto(result, '問い合わせが正常に作成されました');
    }

    /**
     * 問い合わせを検索・一覧取得する
     * 要件8: 検索・フィルタリング機能
     */
    @Get()
    @ApiOperation({
        summary: '問い合わせを検索・一覧取得',
        description: '条件を指定して問い合わせを検索します。ページネーション対応。'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '問い合わせ一覧を正常に取得しました',
        type: PaginatedApiResponseDto
    })
    @ApiQuery({ name: 'query', required: false, description: '検索クエリ（タイトル・内容）' })
    @ApiQuery({ name: 'appId', required: false, description: '対象アプリケーションID' })
    @ApiQuery({ name: 'status', required: false, description: '問い合わせ状態（複数指定可）' })
    @ApiQuery({ name: 'priority', required: false, description: '優先度（複数指定可）' })
    @ApiQuery({ name: 'page', required: false, description: 'ページ番号（デフォルト: 1）' })
    @ApiQuery({ name: 'limit', required: false, description: '取得件数（デフォルト: 20）' })
    @ApiKeyAuth({ windowMs: 60000, max: 200 }) // 1分間に200リクエスト
    async searchInquiries(
        @Query() searchDto: SearchInquiryDto,
        @ApiKeyContextDecorator() apiKeyContext: ApiKeyContext
    ): Promise<PaginatedApiResponseDto<InquiryResponseDto>> {
        this.logger.log(`問い合わせ検索リクエスト: クエリ=${searchDto.query}, appId=${apiKeyContext?.appId}`);

        // APIキーのアプリケーションIDでフィルタリング
        const filteredSearchDto = {
            ...searchDto,
            appId: searchDto.appId || apiKeyContext?.appId,
        };

        const result = await this.inquiriesService.searchInquiries(filteredSearchDto);

        this.logger.log(`問い合わせ検索完了: 総件数=${result.meta.total}`);
        return new PaginatedApiResponseDto(
            result.data,
            result.meta.total,
            result.meta.page,
            result.meta.limit,
            '問い合わせ一覧を正常に取得しました'
        );
    }

    /**
     * 問い合わせ詳細を取得する
     * 要件1.1: 問い合わせ取得機能
     * 要件2.3, 2.4: 履歴表示機能
     */
    @Get(':id')
    @ApiOperation({
        summary: '問い合わせ詳細を取得',
        description: '指定されたIDの問い合わせ詳細情報を取得します。関連データと履歴を含みます。'
    })
    @ApiParam({
        name: 'id',
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '問い合わせ詳細を正常に取得しました',
        type: ApiSuccessResponseDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された問い合わせが見つかりません'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async getInquiry(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<ApiSuccessResponseDto<InquiryDetailResponseDto>> {
        this.logger.log(`問い合わせ詳細取得リクエスト: ID=${id}`);

        const result = await this.inquiriesService.getInquiry(id);

        this.logger.log(`問い合わせ詳細取得完了: ID=${id}`);
        return new ApiSuccessResponseDto(result, '問い合わせ詳細を正常に取得しました');
    }

    /**
     * 問い合わせを更新する
     * 要件1.1, 1.3: 問い合わせ更新機能
     */
    @Put(':id')
    @ApiOperation({
        summary: '問い合わせを更新',
        description: '指定されたIDの問い合わせ情報を更新します。'
    })
    @ApiParam({
        name: 'id',
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '問い合わせが正常に更新されました',
        type: UpdatedResponseDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された問い合わせが見つかりません'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '入力データに不備があります'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async updateInquiry(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateInquiryDto: UpdateInquiryDto,
        @Request() req?: any
    ): Promise<UpdatedResponseDto<InquiryResponseDto>> {
        this.logger.log(`問い合わせ更新リクエスト: ID=${id}`);

        // 認証実装後にユーザーIDを取得
        const updatedBy = req?.user?.id;

        const result = await this.inquiriesService.updateInquiry(
            id,
            updateInquiryDto,
            updatedBy
        );

        this.logger.log(`問い合わせ更新完了: ID=${id}`);
        return new UpdatedResponseDto(result, '問い合わせが正常に更新されました');
    }

    /**
     * 問い合わせ状態を更新する
     * 要件2.2, 2.3: 状態管理機能
     */
    @Patch(':id/status')
    @ApiOperation({
        summary: '問い合わせ状態を更新',
        description: '指定されたIDの問い合わせの状態を変更します。状態変更履歴が記録されます。'
    })
    @ApiParam({
        name: 'id',
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '問い合わせ状態が正常に更新されました',
        type: UpdatedResponseDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された問い合わせが見つかりません'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '入力データに不備があります'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async updateInquiryStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateStatusDto: UpdateInquiryStatusDto,
        @Request() req?: any
    ): Promise<UpdatedResponseDto<InquiryResponseDto>> {
        this.logger.log(`問い合わせ状態更新リクエスト: ID=${id}, 新状態=${updateStatusDto.status}`);

        // 認証実装後にユーザーIDを取得
        const updatedBy = req?.user?.id || 'system';
        const ipAddress = req?.ip;

        const result = await this.inquiriesService.updateInquiryStatus(
            id,
            updateStatusDto,
            updatedBy,
            ipAddress
        );

        this.logger.log(`問い合わせ状態更新完了: ID=${id}`);
        return new UpdatedResponseDto(result, '問い合わせ状態が正常に更新されました');
    }

    /**
     * 全文検索を実行する
     * 要件8.1, 8.2, 8.4: 全文検索・フィルタリング・ページネーション機能
     */
    @Post('search')
    @ApiOperation({
        summary: '全文検索を実行',
        description: '問い合わせ、回答、FAQを横断して全文検索を実行します。PostgreSQL全文検索機能を使用。'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '検索結果を正常に取得しました',
        type: PaginatedSearchResultDto
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '検索条件に不備があります'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async fullTextSearch(
        @Body() searchCriteria: SearchCriteriaDto
    ): Promise<PaginatedSearchResultDto> {
        this.logger.log(`全文検索リクエスト: クエリ="${searchCriteria.query}"`);

        const result = await this.searchService.fullTextSearch({
            query: searchCriteria.query,
            filters: searchCriteria.filters ? {
                appId: searchCriteria.filters.appId,
                status: searchCriteria.filters.status,
                category: searchCriteria.filters.category,
                assignedTo: searchCriteria.filters.assignedTo,
                priority: searchCriteria.filters.priority,
                customerEmail: searchCriteria.filters.customerEmail,
                startDate: searchCriteria.filters.startDate ? new Date(searchCriteria.filters.startDate) : undefined,
                endDate: searchCriteria.filters.endDate ? new Date(searchCriteria.filters.endDate) : undefined,
            } : undefined,
            sortBy: searchCriteria.sortBy,
            sortOrder: searchCriteria.sortOrder,
            page: searchCriteria.page,
            limit: searchCriteria.limit,
        });

        this.logger.log(`全文検索完了: 総件数=${result.total}`);

        const searchResults = result.items.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content,
            type: item.type,
            score: item.score,
            highlights: item.highlights,
            metadata: item.metadata,
            createdAt: item.createdAt,
        }));

        return new PaginatedApiResponseDto(
            searchResults,
            result.total,
            result.page,
            result.limit,
            '検索結果を正常に取得しました'
        );
    }

    /**
     * ベクトル検索を実行する
     * 要件3.1, 3.2: ベクトル検索とRAG機能
     */
    @Post('vector-search')
    @ApiOperation({
        summary: 'ベクトル検索を実行',
        description: 'テキストをベクトル化して類似する問い合わせ・回答・FAQを検索します。'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'ベクトル検索結果を正常に取得しました'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '検索条件に不備があります'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async vectorSearch(
        @Body() body: { query: string; limit?: number; appId?: string; category?: string }
    ) {
        this.logger.log(`ベクトル検索リクエスト: query="${body.query}"`);

        // クエリをベクトル化
        const queryVector = await this.vectorService.embedText(body.query);

        // ベクトル検索を実行
        const results = await this.vectorService.vectorSearch(queryVector, body.limit || 10);

        // フィルタリング
        let filteredResults = results;
        if (body.appId) {
            filteredResults = filteredResults.filter(result => result.metadata.appId === body.appId);
        }
        if (body.category) {
            filteredResults = filteredResults.filter(result => result.metadata.category === body.category);
        }

        this.logger.log(`ベクトル検索完了: 結果件数=${filteredResults.length}`);
        return new ApiSuccessResponseDto({
            query: body.query,
            results: filteredResults,
            totalResults: filteredResults.length,
        }, 'ベクトル検索結果を正常に取得しました');
    }

    /**
     * RAG検索を実行する
     * 要件3.2: RAG機能
     */
    @Post('rag-search')
    @ApiOperation({
        summary: 'RAG検索を実行',
        description: 'RAG（Retrieval-Augmented Generation）機能を使用して関連情報を検索します。'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'RAG検索結果を正常に取得しました'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '検索条件に不備があります'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async ragSearch(
        @Body() body: { query: string; appId?: string; category?: string; maxResults?: number }
    ) {
        this.logger.log(`RAG検索リクエスト: query="${body.query}"`);

        const context: RAGContext = {
            appId: body.appId,
            category: body.category,
            maxResults: body.maxResults,
        };

        const result = await this.vectorService.ragSearch(body.query, context);

        this.logger.log(`RAG検索完了: 結果件数=${result.totalResults}`);
        return new ApiSuccessResponseDto(result, 'RAG検索結果を正常に取得しました');
    }

    /**
     * ハイブリッド検索を実行する
     * 要件8.3, 3.2: 全文検索とベクトル検索の統合、スコア正規化と重み付け機能
     */
    @Post('hybrid-search')
    @ApiOperation({
        summary: 'ハイブリッド検索を実行',
        description: '全文検索とベクトル検索を組み合わせて、最適な検索結果を提供します。スコアの正規化と重み付けを行います。'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'ハイブリッド検索結果を正常に取得しました',
        type: PaginatedHybridSearchResultDto
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '検索条件に不備があります'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async hybridSearch(
        @Body() searchRequest: HybridSearchRequestDto
    ): Promise<PaginatedHybridSearchResultDto> {
        this.logger.log(`ハイブリッド検索リクエスト: query="${searchRequest.query}"`);

        const startTime = Date.now();

        // ハイブリッド検索を実行
        const searchResult = await this.hybridSearchService.hybridSearch(
            searchRequest.query,
            {
                vectorWeight: searchRequest.vectorWeight || 0.5,
                textWeight: searchRequest.textWeight || 0.5,
                limit: searchRequest.limit || 20,
                filters: searchRequest.filters,
            }
        );

        // ユーザーコンテキストがある場合はランキングを適用
        let finalResults = searchResult.items;
        if (searchRequest.userContext) {
            finalResults = await this.hybridSearchService.rankSearchResults(
                searchResult.items,
                searchRequest.query,
                searchRequest.userContext
            );
        }

        const searchTime = Date.now() - startTime;

        const response: PaginatedHybridSearchResultDto = {
            items: finalResults.map(item => ({
                id: item.id,
                title: item.title,
                content: item.content,
                type: item.type,
                vectorScore: item.vectorScore,
                textScore: item.textScore,
                combinedScore: item.combinedScore,
                highlights: item.highlights,
                metadata: item.metadata,
                createdAt: item.createdAt,
            })),
            total: searchResult.total,
            page: searchResult.page,
            limit: searchResult.limit,
            totalPages: searchResult.totalPages,
            hasNext: searchResult.hasNext,
            hasPrev: searchResult.hasPrev,
            searchStats: {
                textResultsCount: finalResults.filter(r => r.textScore > 0).length,
                vectorResultsCount: finalResults.filter(r => r.vectorScore > 0).length,
                combinedResultsCount: finalResults.filter(r => r.textScore > 0 && r.vectorScore > 0).length,
                searchTime,
            },
        };

        this.logger.log(`ハイブリッド検索完了: 結果件数=${finalResults.length}, 検索時間=${searchTime}ms`);
        return response;
    }

    /**
     * 問い合わせをベクトル化する
     * 要件3.1: 問い合わせのベクトル化と保存機能
     */
    @Post(':id/vectorize')
    @ApiOperation({
        summary: '問い合わせをベクトル化',
        description: '指定された問い合わせをベクトル化してベクトルデータベースに保存します。'
    })
    @ApiParam({
        name: 'id',
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '問い合わせのベクトル化が完了しました'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された問い合わせが見つかりません'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async vectorizeInquiry(
        @Param('id', ParseUUIDPipe) id: string
    ) {
        this.logger.log(`問い合わせベクトル化リクエスト: ID=${id}`);

        await this.vectorizationService.vectorizeInquiry(id);

        this.logger.log(`問い合わせベクトル化完了: ID=${id}`);
        return new ApiSuccessResponseDto(
            { inquiryId: id },
            '問い合わせのベクトル化が正常に完了しました'
        );
    }

    /**
     * 問い合わせ履歴を取得する
     * 要件2.3, 2.4: 履歴表示機能
     */
    @Get(':id/history')
    @ApiOperation({
        summary: '問い合わせ履歴を取得',
        description: '指定されたIDの問い合わせの状態変更履歴を時系列で取得します。'
    })
    @ApiParam({
        name: 'id',
        description: '問い合わせID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '問い合わせ履歴を正常に取得しました',
        type: ApiSuccessResponseDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定された問い合わせが見つかりません'
    })
    // @UseGuards(JwtAuthGuard) // 認証実装後に有効化
    // @ApiBearerAuth()
    async getInquiryHistory(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<ApiSuccessResponseDto<InquiryStatusHistory[]>> {
        this.logger.log(`問い合わせ履歴取得リクエスト: ID=${id}`);

        const result = await this.inquiriesService.getInquiryHistory(id);

        this.logger.log(`問い合わせ履歴取得完了: ID=${id}, 履歴件数=${result.length}`);
        return new ApiSuccessResponseDto(result, '問い合わせ履歴を正常に取得しました');
    }
}