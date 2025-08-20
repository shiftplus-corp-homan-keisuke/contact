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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../users/guards/roles.guard';
import { Roles } from '../../users/decorators/roles.decorator';
import { NotificationsService } from '../services';
import {
    CreateNotificationRuleDto,
    UpdateNotificationRuleDto,
    SendNotificationDto,
    UpdateUserNotificationSettingsDto,
    NotificationRuleResponseDto,
    NotificationLogResponseDto,
} from '../dto';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';

@ApiTags('通知管理')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post('rules')
    @Roles('admin', 'support')
    @ApiOperation({ summary: '通知ルール作成' })
    @ApiResponse({ status: HttpStatus.CREATED, description: '通知ルールが作成されました' })
    async createNotificationRule(
        @Body() dto: CreateNotificationRuleDto,
        @Request() req: any,
    ): Promise<ApiResponseDto<NotificationRuleResponseDto>> {
        const rule = await this.notificationsService.createNotificationRule(dto, req.user.id);

        return {
            success: true,
            data: {
                id: rule.id,
                name: rule.name,
                trigger: rule.trigger,
                conditions: rule.conditions,
                actions: rule.actions,
                isActive: rule.isActive,
                createdBy: rule.createdBy,
                createdAt: rule.createdAt,
                updatedAt: rule.updatedAt,
            },
            message: '通知ルールが作成されました',
        };
    }

    @Get('rules')
    @Roles('admin', 'support')
    @ApiOperation({ summary: '通知ルール一覧取得' })
    @ApiResponse({ status: HttpStatus.OK, description: '通知ルール一覧' })
    async getNotificationRules(
        @Request() req: any,
    ): Promise<ApiResponseDto<NotificationRuleResponseDto[]>> {
        const rules = await this.notificationsService.getNotificationRules(req.user.id);

        const data = rules.map(rule => ({
            id: rule.id,
            name: rule.name,
            trigger: rule.trigger,
            conditions: rule.conditions,
            actions: rule.actions,
            isActive: rule.isActive,
            createdBy: rule.createdBy,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt,
        }));

        return {
            success: true,
            data,
            message: '通知ルール一覧を取得しました',
        };
    }

    @Get('rules/:id')
    @Roles('admin', 'support')
    @ApiOperation({ summary: '通知ルール詳細取得' })
    @ApiResponse({ status: HttpStatus.OK, description: '通知ルール詳細' })
    async getNotificationRule(
        @Param('id') id: string,
    ): Promise<ApiResponseDto<NotificationRuleResponseDto>> {
        const rule = await this.notificationsService.getNotificationRule(id);

        return {
            success: true,
            data: {
                id: rule.id,
                name: rule.name,
                trigger: rule.trigger,
                conditions: rule.conditions,
                actions: rule.actions,
                isActive: rule.isActive,
                createdBy: rule.createdBy,
                createdAt: rule.createdAt,
                updatedAt: rule.updatedAt,
            },
            message: '通知ルール詳細を取得しました',
        };
    }

    @Put('rules/:id')
    @Roles('admin', 'support')
    @ApiOperation({ summary: '通知ルール更新' })
    @ApiResponse({ status: HttpStatus.OK, description: '通知ルールが更新されました' })
    async updateNotificationRule(
        @Param('id') id: string,
        @Body() dto: UpdateNotificationRuleDto,
    ): Promise<ApiResponseDto<NotificationRuleResponseDto>> {
        const rule = await this.notificationsService.updateNotificationRule(id, dto);

        return {
            success: true,
            data: {
                id: rule.id,
                name: rule.name,
                trigger: rule.trigger,
                conditions: rule.conditions,
                actions: rule.actions,
                isActive: rule.isActive,
                createdBy: rule.createdBy,
                createdAt: rule.createdAt,
                updatedAt: rule.updatedAt,
            },
            message: '通知ルールが更新されました',
        };
    }

    @Delete('rules/:id')
    @Roles('admin', 'support')
    @ApiOperation({ summary: '通知ルール削除' })
    @ApiResponse({ status: HttpStatus.OK, description: '通知ルールが削除されました' })
    async deleteNotificationRule(
        @Param('id') id: string,
    ): Promise<ApiResponseDto<null>> {
        await this.notificationsService.deleteNotificationRule(id);

        return {
            success: true,
            data: null,
            message: '通知ルールが削除されました',
        };
    }

    @Post('send')
    @Roles('admin', 'support')
    @ApiOperation({ summary: '手動通知送信' })
    @ApiResponse({ status: HttpStatus.OK, description: '通知が送信されました' })
    async sendNotification(
        @Body() dto: SendNotificationDto,
        @Request() req: any,
    ): Promise<ApiResponseDto<null>> {
        await this.notificationsService.sendNotification({
            ...dto,
            triggeredBy: req.user.id,
        });

        return {
            success: true,
            data: null,
            message: '通知が送信されました',
        };
    }

    @Get('settings')
    @ApiOperation({ summary: 'ユーザー通知設定取得' })
    @ApiResponse({ status: HttpStatus.OK, description: 'ユーザー通知設定' })
    async getUserNotificationSettings(
        @Request() req: any,
    ): Promise<ApiResponseDto<any>> {
        const settings = await this.notificationsService.getUserNotificationSettings(req.user.id);

        return {
            success: true,
            data: settings,
            message: 'ユーザー通知設定を取得しました',
        };
    }

    @Put('settings')
    @ApiOperation({ summary: 'ユーザー通知設定更新' })
    @ApiResponse({ status: HttpStatus.OK, description: 'ユーザー通知設定が更新されました' })
    async updateUserNotificationSettings(
        @Body() dto: UpdateUserNotificationSettingsDto,
        @Request() req: any,
    ): Promise<ApiResponseDto<null>> {
        await this.notificationsService.updateUserNotificationSettings(req.user.id, dto);

        return {
            success: true,
            data: null,
            message: 'ユーザー通知設定が更新されました',
        };
    }

    @Get('logs')
    @Roles('admin', 'support')
    @ApiOperation({ summary: '通知ログ取得' })
    @ApiResponse({ status: HttpStatus.OK, description: '通知ログ一覧' })
    async getNotificationLogs(
        @Query('channel') channel?: string,
        @Query('status') status?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ): Promise<ApiResponseDto<{ logs: NotificationLogResponseDto[]; total: number }>> {
        const filters: any = {};

        if (channel) filters.channel = channel;
        if (status) filters.status = status;
        if (dateFrom) filters.dateFrom = new Date(dateFrom);
        if (dateTo) filters.dateTo = new Date(dateTo);

        const result = await this.notificationsService.getNotificationLogs(
            filters,
            Number(page),
            Number(limit),
        );

        const data = {
            logs: result.logs.map(log => ({
                id: log.id,
                channel: log.channel,
                recipient: log.recipient,
                subject: log.subject,
                status: log.status,
                sentAt: log.sentAt,
                createdAt: log.createdAt,
            })),
            total: result.total,
        };

        return {
            success: true,
            data,
            message: '通知ログを取得しました',
        };
    }
}