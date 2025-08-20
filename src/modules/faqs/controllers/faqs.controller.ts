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
    HttpStatus,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { FAQsService } from '../services';
import { CreateFAQDto, UpdateFAQDto, FAQResponseDto, FAQFiltersDto, FAQGenerationOptionsDto, FAQClusterResponseDto } from '../dto';
import { BaseResponseDto } from '../../../common/dto';
import {
    ApiSuccessResponseDto,
    CreatedResponseDto,
    UpdatedResponseDto,
    DeletedResponseDto,
    PaginatedApiResponseDto
} from '../../../common/dto/api-response.dto';

@ApiTags('FAQs')
@Controller('api/v1/faqs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FAQsController {
    constructor(private readonly faqsService: FAQsService) { }

    @Post()
    @RequirePermissions('faq:create')
    @ApiOperation({ summary: 'FAQ作成' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'FAQ作成成功',
        type: FAQResponseDto,
    })
    async createFAQ(@Body() createFAQDto: CreateFAQDto): Promise<BaseResponseDto<FAQResponseDto>> {
        const faq = await this.faqsService.createFAQ(createFAQDto);
        return {
            success: true,
            data: faq as FAQResponseDto,
            message: 'FAQを作成しました',
        };
    }

    @Get(':id')
    @RequirePermissions('faq:read')
    @ApiOperation({ summary: 'FAQ詳細取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ詳細取得成功',
        type: FAQResponseDto,
    })
    async getFAQ(@Param('id', ParseUUIDPipe) id: string): Promise<BaseResponseDto<FAQResponseDto>> {
        const faq = await this.faqsService.getFAQById(id);
        return {
            success: true,
            data: faq as FAQResponseDto,
        };
    }

    @Get()
    @RequirePermissions('faq:read')
    @ApiOperation({ summary: 'FAQ一覧取得' })
    @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
    @ApiQuery({ name: 'category', required: false, description: 'カテゴリ' })
    @ApiQuery({ name: 'isPublished', required: false, description: '公開状態' })
    @ApiQuery({ name: 'tags', required: false, description: 'タグ（カンマ区切り）' })
    @ApiQuery({ name: 'search', required: false, description: '検索キーワード' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ一覧取得成功',
        type: [FAQResponseDto],
    })
    async getFAQs(@Query() filters: FAQFiltersDto): Promise<BaseResponseDto<FAQResponseDto[]>> {
        const faqs = filters.appId
            ? await this.faqsService.getFAQsByApp(filters.appId, filters)
            : await this.faqsService.getAllFAQs(filters);

        return {
            success: true,
            data: faqs as FAQResponseDto[],
        };
    }

    @Put(':id')
    @RequirePermissions('faq:update')
    @ApiOperation({ summary: 'FAQ更新' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ更新成功',
        type: FAQResponseDto,
    })
    async updateFAQ(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateFAQDto: UpdateFAQDto,
    ): Promise<BaseResponseDto<FAQResponseDto>> {
        const faq = await this.faqsService.updateFAQ(id, updateFAQDto);
        return {
            success: true,
            data: faq as FAQResponseDto,
            message: 'FAQを更新しました',
        };
    }

    @Delete(':id')
    @RequirePermissions('faq:delete')
    @ApiOperation({ summary: 'FAQ削除' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ削除成功',
    })
    async deleteFAQ(@Param('id', ParseUUIDPipe) id: string): Promise<BaseResponseDto<null>> {
        await this.faqsService.deleteFAQ(id);
        return {
            success: true,
            data: null,
            message: 'FAQを削除しました',
        };
    }

    @Put(':id/publish')
    @RequirePermissions('faq:publish')
    @ApiOperation({ summary: 'FAQ公開' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ公開成功',
        type: FAQResponseDto,
    })
    async publishFAQ(@Param('id', ParseUUIDPipe) id: string): Promise<BaseResponseDto<FAQResponseDto>> {
        const faq = await this.faqsService.publishFAQ(id);
        return {
            success: true,
            data: faq as FAQResponseDto,
            message: 'FAQを公開しました',
        };
    }

    @Put(':id/unpublish')
    @RequirePermissions('faq:publish')
    @ApiOperation({ summary: 'FAQ非公開' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ非公開成功',
        type: FAQResponseDto,
    })
    async unpublishFAQ(@Param('id', ParseUUIDPipe) id: string): Promise<BaseResponseDto<FAQResponseDto>> {
        const faq = await this.faqsService.unpublishFAQ(id);
        return {
            success: true,
            data: faq as FAQResponseDto,
            message: 'FAQを非公開にしました',
        };
    }

    @Get('apps/:appId/published')
    @RequirePermissions('faq:read')
    @ApiOperation({ summary: '公開済みFAQ取得（認証必要）' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '公開済みFAQ取得成功',
        type: ApiSuccessResponseDto,
    })
    async getPublishedFAQs(
        @Param('appId', ParseUUIDPipe) appId: string,
    ): Promise<ApiSuccessResponseDto<FAQResponseDto[]>> {
        const faqs = await this.faqsService.getPublishedFAQs(appId);
        return new ApiSuccessResponseDto(
            faqs as FAQResponseDto[],
            '公開済みFAQを正常に取得しました'
        );
    }

    @Get('categories')
    @RequirePermissions('faq:read')
    @ApiOperation({ summary: 'カテゴリ一覧取得' })
    @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'カテゴリ一覧取得成功',
        type: [String],
    })
    async getCategories(@Query('appId') appId?: string): Promise<BaseResponseDto<string[]>> {
        const categories = await this.faqsService.getCategories(appId);
        return {
            success: true,
            data: categories,
        };
    }

    @Get('tags')
    @RequirePermissions('faq:read')
    @ApiOperation({ summary: 'タグ一覧取得' })
    @ApiQuery({ name: 'appId', required: false, description: 'アプリケーションID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'タグ一覧取得成功',
        type: [String],
    })
    async getTags(@Query('appId') appId?: string): Promise<BaseResponseDto<string[]>> {
        const tags = await this.faqsService.getTags(appId);
        return {
            success: true,
            data: tags,
        };
    }

    @Get('apps/:appId/analytics')
    @RequirePermissions('faq:read')
    @ApiOperation({ summary: 'FAQ分析データ取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ分析データ取得成功',
    })
    async getFAQAnalytics(@Param('appId', ParseUUIDPipe) appId: string): Promise<BaseResponseDto<any>> {
        const analytics = await this.faqsService.getFAQAnalytics(appId);
        return {
            success: true,
            data: analytics,
        };
    }

    @Put(':id/order')
    @RequirePermissions('faq:update')
    @ApiOperation({ summary: 'FAQ表示順序更新' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ表示順序更新成功',
        type: FAQResponseDto,
    })
    async updateFAQOrder(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('orderIndex') orderIndex: number,
    ): Promise<BaseResponseDto<FAQResponseDto>> {
        const faq = await this.faqsService.updateFAQOrder(id, orderIndex);
        return {
            success: true,
            data: faq as FAQResponseDto,
            message: 'FAQ表示順序を更新しました',
        };
    }

    @Put('bulk/publish')
    @RequirePermissions('faq:publish')
    @ApiOperation({ summary: '複数FAQ一括公開状態更新' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '複数FAQ一括公開状態更新成功',
        type: [FAQResponseDto],
    })
    async bulkUpdatePublishStatus(
        @Body() body: { ids: string[]; isPublished: boolean },
    ): Promise<BaseResponseDto<FAQResponseDto[]>> {
        const faqs = await this.faqsService.bulkUpdatePublishStatus(body.ids, body.isPublished);
        return {
            success: true,
            data: faqs as FAQResponseDto[],
            message: `${faqs.length}件のFAQの公開状態を更新しました`,
        };
    }

    @Post('apps/:appId/generate')
    @RequirePermissions('faq:generate')
    @ApiOperation({ summary: '自動FAQ生成' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: '自動FAQ生成成功',
        type: [FAQResponseDto],
    })
    async generateFAQ(
        @Param('appId', ParseUUIDPipe) appId: string,
        @Body() options: FAQGenerationOptionsDto,
    ): Promise<BaseResponseDto<FAQResponseDto[]>> {
        // DTOをオプション型に変換
        const generationOptions = {
            minClusterSize: options.minClusterSize,
            maxClusters: options.maxClusters,
            similarityThreshold: options.similarityThreshold,
            dateRange: options.startDate && options.endDate ? {
                startDate: new Date(options.startDate),
                endDate: new Date(options.endDate),
            } : undefined,
            categories: options.categories,
        };

        const faqs = await this.faqsService.generateFAQ(appId, generationOptions);
        return {
            success: true,
            data: faqs as FAQResponseDto[],
            message: `${faqs.length}件のFAQを自動生成しました`,
        };
    }

    @Post('apps/:appId/generate/preview')
    @RequirePermissions('faq:generate')
    @ApiOperation({ summary: 'FAQ生成プレビュー' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ生成プレビュー成功',
        type: [FAQClusterResponseDto],
    })
    async previewFAQGeneration(
        @Param('appId', ParseUUIDPipe) appId: string,
        @Body() options: FAQGenerationOptionsDto,
    ): Promise<BaseResponseDto<FAQClusterResponseDto[]>> {
        // DTOをオプション型に変換
        const generationOptions = {
            minClusterSize: options.minClusterSize,
            maxClusters: options.maxClusters,
            similarityThreshold: options.similarityThreshold,
            dateRange: options.startDate && options.endDate ? {
                startDate: new Date(options.startDate),
                endDate: new Date(options.endDate),
            } : undefined,
            categories: options.categories,
        };

        const clusters = await this.faqsService.previewGeneratedFAQ(appId, generationOptions);
        return {
            success: true,
            data: clusters as FAQClusterResponseDto[],
            message: `${clusters.length}件のFAQ候補を生成しました`,
        };
    }
}