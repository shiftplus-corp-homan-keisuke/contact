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
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ApiKeysService } from '../services/api-keys.service';
import { RateLimitService } from '../services/rate-limit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../users/guards/permissions.guard';
import { CreateApiKeyDto, UpdateApiKeyDto, GetUsageStatsDto } from '../dto/api-key.dto';
import { ApiKey } from '../entities/api-key.entity';
import { Permission } from '../../users/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserContext } from '../../auth/types/auth.types';

@ApiTags('APIキー管理')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ApiKeysController {
    private readonly logger = new Logger(ApiKeysController.name);

    constructor(
        private readonly apiKeysService: ApiKeysService,
        private readonly rateLimitService: RateLimitService,
    ) { }

    /**
     * APIキー一覧取得
     */
    @Get()
    @Permission('api-key', 'read')
    @ApiOperation({ summary: 'APIキー一覧取得' })
    @ApiResponse({
        status: 200,
        description: 'APIキー一覧取得成功',
        type: [ApiKey],
    })
    async findAll(): Promise<ApiKey[]> {
        return this.apiKeysService.findAll();
    }

    /**
     * APIキー詳細取得
     */
    @Get(':id')
    @Permission('api-key', 'read')
    @ApiOperation({ summary: 'APIキー詳細取得' })
    @ApiResponse({
        status: 200,
        description: 'APIキー詳細取得成功',
        type: ApiKey,
    })
    @ApiResponse({
        status: 404,
        description: 'APIキーが見つかりません',
    })
    async findOne(@Param('id') id: string): Promise<ApiKey> {
        return this.apiKeysService.findById(id);
    }

    /**
     * APIキー作成
     */
    @Post()
    @Permission('api-key', 'create')
    @ApiOperation({ summary: 'APIキー作成' })
    @ApiResponse({
        status: 201,
        description: 'APIキー作成成功',
        schema: {
            type: 'object',
            properties: {
                apiKey: { $ref: '#/components/schemas/ApiKey' },
                plainKey: { type: 'string', description: 'プレーンなAPIキー（一度だけ表示）' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: '入力データ不正',
    })
    async create(
        @Body() createApiKeyDto: CreateApiKeyDto,
        @CurrentUser() user: UserContext,
    ): Promise<{ apiKey: ApiKey; plainKey: string }> {
        this.logger.log(`APIキー作成: ${createApiKeyDto.name} by ${user.email}`);

        const createDto = {
            ...createApiKeyDto,
            createdBy: user.id,
        };

        return this.apiKeysService.create(createDto);
    }

    /**
     * APIキー更新
     */
    @Put(':id')
    @Permission('api-key', 'update')
    @ApiOperation({ summary: 'APIキー更新' })
    @ApiResponse({
        status: 200,
        description: 'APIキー更新成功',
        type: ApiKey,
    })
    @ApiResponse({
        status: 404,
        description: 'APIキーが見つかりません',
    })
    async update(
        @Param('id') id: string,
        @Body() updateApiKeyDto: UpdateApiKeyDto,
        @CurrentUser() user: UserContext,
    ): Promise<ApiKey> {
        this.logger.log(`APIキー更新: ${id} by ${user.email}`);
        return this.apiKeysService.update(id, updateApiKeyDto);
    }

    /**
     * APIキー削除
     */
    @Delete(':id')
    @Permission('api-key', 'delete')
    @ApiOperation({ summary: 'APIキー削除' })
    @ApiResponse({
        status: 200,
        description: 'APIキー削除成功',
    })
    @ApiResponse({
        status: 404,
        description: 'APIキーが見つかりません',
    })
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: UserContext,
    ): Promise<{ message: string }> {
        this.logger.log(`APIキー削除: ${id} by ${user.email}`);
        await this.apiKeysService.remove(id);
        return { message: 'APIキーを削除しました' };
    }

    /**
     * APIキー再生成
     */
    @Post(':id/regenerate')
    @Permission('api-key', 'update')
    @ApiOperation({ summary: 'APIキー再生成' })
    @ApiResponse({
        status: 200,
        description: 'APIキー再生成成功',
        schema: {
            type: 'object',
            properties: {
                apiKey: { $ref: '#/components/schemas/ApiKey' },
                plainKey: { type: 'string', description: '新しいプレーンなAPIキー' },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'APIキーが見つかりません',
    })
    async regenerate(
        @Param('id') id: string,
        @CurrentUser() user: UserContext,
    ): Promise<{ apiKey: ApiKey; plainKey: string }> {
        this.logger.log(`APIキー再生成: ${id} by ${user.email}`);
        return this.apiKeysService.regenerate(id);
    }

    /**
     * APIキー使用統計取得
     */
    @Get(':id/usage-stats')
    @Permission('api-key', 'read')
    @ApiOperation({ summary: 'APIキー使用統計取得' })
    @ApiResponse({
        status: 200,
        description: '使用統計取得成功',
    })
    async getUsageStats(
        @Param('id') id: string,
        @Query() query: GetUsageStatsDto,
    ): Promise<any> {
        return this.apiKeysService.getUsageStats(id, query.days);
    }

    /**
     * レート制限違反検出
     */
    @Get('violations/detect')
    @Permission('api-key', 'read')
    @ApiOperation({ summary: 'レート制限違反検出' })
    @ApiResponse({
        status: 200,
        description: '違反検出成功',
    })
    async detectViolations(): Promise<any> {
        return this.rateLimitService.detectRateLimitViolations();
    }

    /**
     * 疑わしいパターン検出
     */
    @Get('patterns/suspicious')
    @Permission('api-key', 'read')
    @ApiOperation({ summary: '疑わしいAPIキー使用パターン検出' })
    @ApiResponse({
        status: 200,
        description: 'パターン検出成功',
    })
    async detectSuspiciousPatterns(): Promise<any> {
        return this.rateLimitService.detectSuspiciousPatterns();
    }

    /**
     * 使用レポート生成
     */
    @Get('reports/usage')
    @Permission('api-key', 'read')
    @ApiOperation({ summary: 'APIキー使用レポート生成' })
    @ApiResponse({
        status: 200,
        description: 'レポート生成成功',
    })
    async generateUsageReport(@Query('days') days: number = 7): Promise<any> {
        return this.rateLimitService.generateUsageReport(days);
    }
}