/**
 * パブリックFAQコントローラー
 * 要件7.2: FAQ取得APIの実装（認証不要）
 * 要件6.3, 6.4: FAQ公開システム
 */

import {
    Controller,
    Get,
    Param,
    Query,
    HttpStatus,
    ParseUUIDPipe,
    Logger,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';

import { FAQsService } from '../services/faqs.service';
import { FAQResponseDto, FAQFiltersDto } from '../dto';
import {
    ApiSuccessResponseDto,
    PaginatedApiResponseDto
} from '../../../common/dto/api-response.dto';
import { Public } from '../../../common/decorators';

@ApiTags('Public FAQs')
@Controller('api/v1/public/faqs')
// @UseInterceptors(CacheInterceptor) // キャッシュ機能は一時的に無効化
export class PublicFAQsController {
    private readonly logger = new Logger(PublicFAQsController.name);

    constructor(private readonly faqsService: FAQsService) { }

    /**
     * アプリ別公開FAQ一覧を取得する（認証不要）
     * 要件7.2: アプリ別FAQ取得APIの実装
     * 要件6.3: FAQ公開システム
     */
    @Get('apps/:appId')
    @Public() // 認証不要
    // @CacheTTL(300) // 5分間キャッシュ - 一時的に無効化
    @ApiOperation({
        summary: 'アプリ別公開FAQ一覧取得',
        description: '指定されたアプリケーションの公開済みFAQ一覧を取得します。認証は不要です。'
    })
    @ApiParam({
        name: 'appId',
        description: 'アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiQuery({
        name: 'category',
        required: false,
        description: 'カテゴリでフィルタリング'
    })
    @ApiQuery({
        name: 'tags',
        required: false,
        description: 'タグでフィルタリング（カンマ区切り）'
    })
    @ApiQuery({
        name: 'search',
        required: false,
        description: '検索キーワード（質問・回答内容を検索）'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'ページ番号（デフォルト: 1）',
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: '取得件数（デフォルト: 20、最大: 100）',
        example: 20
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'アプリ別公開FAQ一覧を正常に取得しました',
        type: PaginatedApiResponseDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定されたアプリケーションが見つかりません'
    })
    async getPublicFAQsByApp(
        @Param('appId', ParseUUIDPipe) appId: string,
        @Query() filters: FAQFiltersDto
    ): Promise<PaginatedApiResponseDto<FAQResponseDto>> {
        this.logger.log(`公開FAQ取得リクエスト: appId=${appId}`);

        // 公開済みのみに限定
        const publicFilters = {
            ...filters,
            isPublished: true,
            page: filters.page || 1,
            limit: Math.min(filters.limit || 20, 100), // 最大100件に制限
        };

        const result = await this.faqsService.getFAQsByAppWithPagination(appId, publicFilters);

        this.logger.log(`公開FAQ取得完了: appId=${appId}, 総件数=${result.total}`);

        return new PaginatedApiResponseDto(
            result.items as FAQResponseDto[],
            result.total,
            result.page,
            result.limit,
            'アプリ別公開FAQ一覧を正常に取得しました'
        );
    }

    /**
     * FAQ詳細を取得する（認証不要、公開済みのみ）
     * 要件7.2: FAQ取得APIの実装
     */
    @Get(':id')
    @Public() // 認証不要
    // @CacheTTL(300) // 5分間キャッシュ - 一時的に無効化
    @ApiOperation({
        summary: 'FAQ詳細取得',
        description: '指定されたIDの公開済みFAQ詳細を取得します。認証は不要です。'
    })
    @ApiParam({
        name: 'id',
        description: 'FAQ ID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ詳細を正常に取得しました',
        type: ApiSuccessResponseDto
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: '指定されたFAQが見つからないか、非公開です'
    })
    async getPublicFAQ(
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<ApiSuccessResponseDto<FAQResponseDto>> {
        this.logger.log(`公開FAQ詳細取得リクエスト: id=${id}`);

        const faq = await this.faqsService.getPublishedFAQById(id);

        this.logger.log(`公開FAQ詳細取得完了: id=${id}`);

        return new ApiSuccessResponseDto(
            faq as FAQResponseDto,
            'FAQ詳細を正常に取得しました'
        );
    }

    /**
     * FAQ検索を実行する（認証不要、公開済みのみ）
     * 要件7.2: FAQ検索・フィルタリング機能
     */
    @Get('apps/:appId/search')
    @Public() // 認証不要
    // @CacheTTL(60) // 1分間キャッシュ（検索結果は短めに） - 一時的に無効化
    @ApiOperation({
        summary: 'FAQ検索',
        description: '指定されたアプリケーションの公開済みFAQを検索します。認証は不要です。'
    })
    @ApiParam({
        name: 'appId',
        description: 'アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiQuery({
        name: 'q',
        required: true,
        description: '検索クエリ',
        example: 'ログイン'
    })
    @ApiQuery({
        name: 'category',
        required: false,
        description: 'カテゴリでフィルタリング'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'ページ番号（デフォルト: 1）',
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: '取得件数（デフォルト: 10、最大: 50）',
        example: 10
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ検索結果を正常に取得しました',
        type: PaginatedApiResponseDto
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: '検索クエリが指定されていません'
    })
    async searchPublicFAQs(
        @Param('appId', ParseUUIDPipe) appId: string,
        @Query('q') query: string,
        @Query('category') category?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10
    ): Promise<PaginatedApiResponseDto<FAQResponseDto>> {
        if (!query || query.trim().length === 0) {
            throw new Error('検索クエリが指定されていません');
        }

        this.logger.log(`公開FAQ検索リクエスト: appId=${appId}, query="${query}"`);

        const searchFilters = {
            search: query.trim(),
            category,
            isPublished: true,
            page,
            limit: Math.min(limit, 50), // 最大50件に制限
        };

        const result = await this.faqsService.searchPublishedFAQs(appId, searchFilters);

        this.logger.log(`公開FAQ検索完了: appId=${appId}, 結果件数=${result.total}`);

        return new PaginatedApiResponseDto(
            result.items as FAQResponseDto[],
            result.total,
            result.page,
            result.limit,
            'FAQ検索結果を正常に取得しました'
        );
    }

    /**
     * アプリのFAQカテゴリ一覧を取得する（認証不要）
     * 要件7.2: FAQ取得APIの実装
     */
    @Get('apps/:appId/categories')
    @Public() // 認証不要
    // @CacheTTL(600) // 10分間キャッシュ - 一時的に無効化
    @ApiOperation({
        summary: 'FAQカテゴリ一覧取得',
        description: '指定されたアプリケーションの公開済みFAQのカテゴリ一覧を取得します。'
    })
    @ApiParam({
        name: 'appId',
        description: 'アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQカテゴリ一覧を正常に取得しました',
        type: ApiSuccessResponseDto
    })
    async getPublicFAQCategories(
        @Param('appId', ParseUUIDPipe) appId: string
    ): Promise<ApiSuccessResponseDto<string[]>> {
        this.logger.log(`公開FAQカテゴリ取得リクエスト: appId=${appId}`);

        const categories = await this.faqsService.getPublishedCategories(appId);

        this.logger.log(`公開FAQカテゴリ取得完了: appId=${appId}, カテゴリ数=${categories.length}`);

        return new ApiSuccessResponseDto(
            categories,
            'FAQカテゴリ一覧を正常に取得しました'
        );
    }

    /**
     * 人気FAQ一覧を取得する（認証不要）
     * 要件7.2: FAQ取得APIの実装
     */
    @Get('apps/:appId/popular')
    @Public() // 認証不要
    // @CacheTTL(1800) // 30分間キャッシュ - 一時的に無効化
    @ApiOperation({
        summary: '人気FAQ一覧取得',
        description: '指定されたアプリケーションの人気FAQ一覧を取得します。アクセス数に基づいてランキングされます。'
    })
    @ApiParam({
        name: 'appId',
        description: 'アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: '取得件数（デフォルト: 10、最大: 20）',
        example: 10
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '人気FAQ一覧を正常に取得しました',
        type: ApiSuccessResponseDto
    })
    async getPopularFAQs(
        @Param('appId', ParseUUIDPipe) appId: string,
        @Query('limit') limit: number = 10
    ): Promise<ApiSuccessResponseDto<FAQResponseDto[]>> {
        this.logger.log(`人気FAQ取得リクエスト: appId=${appId}`);

        const faqs = await this.faqsService.getPopularFAQs(
            appId,
            Math.min(limit, 20) // 最大20件に制限
        );

        this.logger.log(`人気FAQ取得完了: appId=${appId}, 件数=${faqs.length}`);

        return new ApiSuccessResponseDto(
            faqs as FAQResponseDto[],
            '人気FAQ一覧を正常に取得しました'
        );
    }

    /**
     * 最新FAQ一覧を取得する（認証不要）
     * 要件7.2: FAQ取得APIの実装
     */
    @Get('apps/:appId/recent')
    @Public() // 認証不要
    // @CacheTTL(300) // 5分間キャッシュ - 一時的に無効化
    @ApiOperation({
        summary: '最新FAQ一覧取得',
        description: '指定されたアプリケーションの最新FAQ一覧を取得します。更新日時順でソートされます。'
    })
    @ApiParam({
        name: 'appId',
        description: 'アプリケーションID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: '取得件数（デフォルト: 10、最大: 20）',
        example: 10
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '最新FAQ一覧を正常に取得しました',
        type: ApiSuccessResponseDto
    })
    async getRecentFAQs(
        @Param('appId', ParseUUIDPipe) appId: string,
        @Query('limit') limit: number = 10
    ): Promise<ApiSuccessResponseDto<FAQResponseDto[]>> {
        this.logger.log(`最新FAQ取得リクエスト: appId=${appId}`);

        const faqs = await this.faqsService.getRecentFAQs(
            appId,
            Math.min(limit, 20) // 最大20件に制限
        );

        this.logger.log(`最新FAQ取得完了: appId=${appId}, 件数=${faqs.length}`);

        return new ApiSuccessResponseDto(
            faqs as FAQResponseDto[],
            '最新FAQ一覧を正常に取得しました'
        );
    }
}