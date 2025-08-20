import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpStatus,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { FAQSiteService } from '../services';
import { BaseResponseDto } from '../../../common/dto';
import {
    FAQSiteConfigDto,
    FAQSiteResponseDto,
    FAQSiteStatusDto,
    PublishFAQSiteDto,
} from '../dto';

@ApiTags('FAQ Site')
@Controller('faq-sites')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FAQSiteController {
    constructor(private readonly faqSiteService: FAQSiteService) { }

    @Post('publish')
    @RequirePermissions('faq:publish')
    @ApiOperation({ summary: 'FAQ サイトを公開' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'FAQ サイトが正常に公開されました',
        type: FAQSiteResponseDto,
    })
    async publishSite(@Body() publishDto: PublishFAQSiteDto): Promise<BaseResponseDto<FAQSiteResponseDto>> {
        const result = await this.faqSiteService.publishFAQSite(publishDto);
        return {
            success: true,
            data: result,
        };
    }

    @Get(':appId/status')
    @RequirePermissions('faq:read')
    @ApiOperation({ summary: 'FAQ サイトの状態を取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ サイトの状態',
        type: FAQSiteStatusDto,
    })
    async getSiteStatus(@Param('appId', ParseUUIDPipe) appId: string): Promise<BaseResponseDto<FAQSiteStatusDto>> {
        const result = await this.faqSiteService.getFAQSiteStatus(appId);
        return {
            success: true,
            data: result,
        };
    }

    @Put(':appId/config')
    @RequirePermissions('faq:publish')
    @ApiOperation({ summary: 'FAQ サイト設定を更新' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ サイト設定が更新されました',
    })
    async updateSiteConfig(
        @Param('appId', ParseUUIDPipe) appId: string,
        @Body() configDto: FAQSiteConfigDto,
    ): Promise<BaseResponseDto<null>> {
        await this.faqSiteService.updateSiteConfig(appId, configDto);
        return {
            success: true,
            data: null,
        };
    }

    @Delete(':appId/unpublish')
    @RequirePermissions('faq:publish')
    @ApiOperation({ summary: 'FAQ サイトを非公開にする' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ サイトが非公開になりました',
    })
    async unpublishSite(@Param('appId', ParseUUIDPipe) appId: string): Promise<BaseResponseDto<null>> {
        await this.faqSiteService.unpublishFAQSite(appId);
        return {
            success: true,
            data: null,
        };
    }

    @Post(':appId/regenerate')
    @RequirePermissions('faq:publish')
    @ApiOperation({ summary: 'FAQ サイトを再生成' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'FAQ サイトが再生成されました',
        type: FAQSiteResponseDto,
    })
    async regenerateSite(@Param('appId', ParseUUIDPipe) appId: string): Promise<BaseResponseDto<FAQSiteResponseDto>> {
        const result = await this.faqSiteService.publishFAQSite({ appId });
        return {
            success: true,
            data: result,
        };
    }
}