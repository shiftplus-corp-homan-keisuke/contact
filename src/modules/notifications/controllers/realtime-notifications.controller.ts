import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser } from '../../../common/decorators';
import { User } from '../../users/entities';
import { RealtimeNotificationService } from '../services';
import { NotificationRequest } from '../types';
import { ApiResponseDto } from '../../../common/dto';

@ApiTags('realtime-notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('realtime-notifications')
export class RealtimeNotificationsController {
    constructor(
        private realtimeNotificationService: RealtimeNotificationService,
    ) { }

    @Post('send')
    @ApiOperation({ summary: '即座通知の送信' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: '通知が正常に送信されました',
        type: ApiResponseDto,
    })
    async sendInstantNotification(
        @Body() request: {
            userIds: string[];
            notification: NotificationRequest;
        },
        @CurrentUser() user: User,
    ): Promise<ApiResponseDto<void>> {
        await this.realtimeNotificationService.sendInstantNotification(
            request.userIds,
            {
                ...request.notification,
                triggeredBy: user.id,
            },
        );

        return {
            success: true,
            message: '即座通知を送信しました',
        };
    }

    @Post('maintenance')
    @ApiOperation({ summary: 'メンテナンス通知の送信' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'メンテナンス通知が正常に送信されました',
        type: ApiResponseDto,
    })
    async sendMaintenanceNotification(
        @Body() request: {
            message: string;
            scheduledTime: string;
            duration: number;
        },
    ): Promise<ApiResponseDto<void>> {
        await this.realtimeNotificationService.sendMaintenanceNotification(
            request.message,
            new Date(request.scheduledTime),
            request.duration,
        );

        return {
            success: true,
            message: 'メンテナンス通知を送信しました',
        };
    }

    @Get('status')
    @ApiOperation({ summary: 'リアルタイム通知の状態取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'リアルタイム通知の状態を取得しました',
        type: ApiResponseDto,
    })
    async getRealtimeStatus(): Promise<ApiResponseDto<{
        connectedUsers: string[];
        totalConnections: number;
        userConnections: Record<string, number>;
    }>> {
        const status = this.realtimeNotificationService.getRealtimeStatus();

        return {
            success: true,
            data: status,
            message: 'リアルタイム通知の状態を取得しました',
        };
    }

    @Get('user/:userId/online')
    @ApiOperation({ summary: 'ユーザーのオンライン状態確認' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'ユーザーのオンライン状態を取得しました',
        type: ApiResponseDto,
    })
    async checkUserOnlineStatus(
        @Param('userId') userId: string,
    ): Promise<ApiResponseDto<{ isOnline: boolean }>> {
        const isOnline = this.realtimeNotificationService.isUserOnline(userId);

        return {
            success: true,
            data: { isOnline },
            message: 'ユーザーのオンライン状態を取得しました',
        };
    }
}