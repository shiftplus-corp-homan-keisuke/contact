import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../users/guards/roles.guard';
import { Roles } from '../../users/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { EscalationService } from '../services/escalation.service';
import { EscalateInquiryDto, EscalationStatsDto } from '../dto/escalation.dto';
import { User } from '../../users/entities/user.entity';

/**
 * エスカレーションコントローラー
 * 問い合わせエスカレーション機能のAPI
 */
@ApiTags('エスカレーション')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('escalations')
export class EscalationController {
    constructor(private readonly escalationService: EscalationService) { }

    /**
     * 問い合わせをエスカレーション
     */
    @Post('inquiries/:inquiryId')
    @Roles('admin', 'supervisor', 'support')
    @ApiOperation({ summary: '問い合わせをエスカレーション' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: '問い合わせが正常にエスカレーションされました',
    })
    async escalateInquiry(
        @Param('inquiryId') inquiryId: string,
        @Body() escalateDto: EscalateInquiryDto,
        @CurrentUser() user: User,
    ): Promise<ApiResponseDto> {
        const escalation = await this.escalationService.escalateInquiry(
            inquiryId,
            escalateDto.escalatedTo,
            user.id,
            escalateDto.reason,
            escalateDto.comment,
        );

        return {
            success: true,
            message: '問い合わせをエスカレーションしました',
            data: escalation,
        };
    }

    /**
     * エスカレーション履歴を取得
     */
    @Get('inquiries/:inquiryId/history')
    @Roles('admin', 'supervisor', 'support')
    @ApiOperation({ summary: 'エスカレーション履歴を取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'エスカレーション履歴を正常に取得しました',
    })
    async getEscalationHistory(@Param('inquiryId') inquiryId: string): Promise<ApiResponseDto> {
        const history = await this.escalationService.getEscalationHistory(inquiryId);

        return {
            success: true,
            data: history,
        };
    }

    /**
     * エスカレーション統計を取得
     */
    @Get('stats')
    @Roles('admin', 'supervisor')
    @ApiOperation({ summary: 'エスカレーション統計を取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'エスカレーション統計を正常に取得しました',
    })
    async getEscalationStats(@Query() query: EscalationStatsDto): Promise<ApiResponseDto> {
        const stats = await this.escalationService.getEscalationStats(
            query.appId,
            query.startDate ? new Date(query.startDate) : undefined,
            query.endDate ? new Date(query.endDate) : undefined,
        );

        return {
            success: true,
            data: stats,
        };
    }

    /**
     * ユーザー別エスカレーション統計を取得
     */
    @Get('users/:userId/stats')
    @Roles('admin', 'supervisor')
    @ApiOperation({ summary: 'ユーザー別エスカレーション統計を取得' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'ユーザー別エスカレーション統計を正常に取得しました',
    })
    async getUserEscalationStats(
        @Param('userId') userId: string,
        @Query() query: EscalationStatsDto,
    ): Promise<ApiResponseDto> {
        const stats = await this.escalationService.getUserEscalationStats(
            userId,
            query.startDate ? new Date(query.startDate) : undefined,
            query.endDate ? new Date(query.endDate) : undefined,
        );

        return {
            success: true,
            data: stats,
        };
    }
}