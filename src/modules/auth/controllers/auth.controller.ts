import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    Get,
    Logger,
    Ip,
    Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from '../services';
import { LocalAuthGuard, JwtAuthGuard } from '../guards';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto';
import { AuthResult, UserContext } from '../types';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('認証')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    /**
     * ユーザーログイン
     */
    @Public()
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 1分間に5回まで
    @ApiOperation({ summary: 'ユーザーログイン' })
    @ApiResponse({
        status: 200,
        description: 'ログイン成功',
        type: AuthResult,
    })
    @ApiResponse({
        status: 401,
        description: '認証失敗',
    })
    @ApiResponse({
        status: 429,
        description: 'レート制限超過',
    })
    async login(
        @Body() loginDto: LoginDto,
        @Request() req: any,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
    ): Promise<AuthResult> {
        this.logger.log(`ログイン試行: ${loginDto.email} from ${ip}`);

        const result = await this.authService.login(req.user, {
            ip,
            userAgent,
        });

        this.logger.log(`ログイン成功: ${loginDto.email}`);
        return result;
    }

    /**
     * ユーザー登録
     */
    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // 1分間に3回まで
    @ApiOperation({ summary: 'ユーザー登録' })
    @ApiResponse({
        status: 201,
        description: 'ユーザー登録成功',
        type: AuthResult,
    })
    @ApiResponse({
        status: 400,
        description: '入力データ不正',
    })
    @ApiResponse({
        status: 409,
        description: 'ユーザーが既に存在',
    })
    async register(
        @Body() registerDto: RegisterDto,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
    ): Promise<AuthResult> {
        this.logger.log(`ユーザー登録試行: ${registerDto.email} from ${ip}`);

        const result = await this.authService.register(registerDto, {
            ip,
            userAgent,
        });

        this.logger.log(`ユーザー登録成功: ${registerDto.email}`);
        return result;
    }

    /**
     * トークンリフレッシュ
     */
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'アクセストークンリフレッシュ' })
    @ApiResponse({
        status: 200,
        description: 'トークンリフレッシュ成功',
        type: AuthResult,
    })
    @ApiResponse({
        status: 401,
        description: '無効なリフレッシュトークン',
    })
    async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResult> {
        return this.authService.refreshToken(refreshTokenDto.refreshToken);
    }

    /**
     * ログアウト
     */
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'ログアウト' })
    @ApiResponse({
        status: 200,
        description: 'ログアウト成功',
    })
    async logout(@CurrentUser() user: UserContext): Promise<{ message: string }> {
        await this.authService.logout(user.id);
        this.logger.log(`ログアウト: ${user.email}`);
        return { message: 'ログアウトしました' };
    }

    /**
     * 現在のユーザー情報取得
     */
    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: '現在のユーザー情報取得' })
    @ApiResponse({
        status: 200,
        description: 'ユーザー情報取得成功',
        type: 'object',
    })
    async getProfile(@CurrentUser() user: UserContext): Promise<UserContext> {
        return user;
    }

    /**
     * パスワード変更
     */
    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'パスワード変更' })
    @ApiResponse({
        status: 200,
        description: 'パスワード変更成功',
    })
    @ApiResponse({
        status: 400,
        description: '現在のパスワードが間違っています',
    })
    async changePassword(
        @CurrentUser() user: UserContext,
        @Body() changePasswordDto: { currentPassword: string; newPassword: string },
    ): Promise<{ message: string }> {
        await this.authService.changePassword(
            user.id,
            changePasswordDto.currentPassword,
            changePasswordDto.newPassword,
        );

        this.logger.log(`パスワード変更: ${user.email}`);
        return { message: 'パスワードを変更しました' };
    }
}