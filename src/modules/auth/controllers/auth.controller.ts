/**
 * 認証コントローラー
 * 要件: 4.1, 4.2 (ユーザー管理機能)
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthService } from '../services/auth.service';
import { LoginDto, CreateUserDto, UpdateUserDto, AuthResponseDto } from '../dto/auth.dto';
import { ResourceType, ActionType } from '../../../common/types/role.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * ユーザーログイン
   * 要件: 4.2 - 認証情報を検証してアクセスを許可または拒否
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ユーザーログイン' })
  @ApiResponse({ status: 200, description: 'ログイン成功', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: '認証に失敗しました' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto, ipAddress, userAgent);
    return result;
  }

  /**
   * トークン更新
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'アクセストークン更新' })
  @ApiResponse({ status: 200, description: 'トークン更新成功' })
  @ApiResponse({ status: 401, description: '無効なリフレッシュトークンです' })
  async refreshToken(@Body() body: { refreshToken: string }) {
    const result = await this.authService.refreshToken(body.refreshToken);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 現在のユーザー情報取得
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '現在のユーザー情報を取得' })
  @ApiResponse({ status: 200, description: 'ユーザー情報取得成功' })
  @ApiResponse({ status: 401, description: '認証が必要です' })
  async getCurrentUser(@CurrentUser() user: any) {
    const fullUser = await this.authService.getUserById(user.userId);
    return {
      success: true,
      data: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        role: {
          id: fullUser.role.id,
          name: fullUser.role.name,
          permissions: fullUser.role.permissions,
        },
        createdAt: fullUser.createdAt,
        updatedAt: fullUser.updatedAt,
      },
    };
  }

  /**
   * ユーザー作成
   * 要件: 4.1 - ユーザー情報を保存し、認証情報を生成
   */
  @Post('users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.USER, ActionType.CREATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新しいユーザーを作成' })
  @ApiResponse({ status: 201, description: 'ユーザー作成成功' })
  @ApiResponse({ status: 400, description: '入力データが無効です' })
  @ApiResponse({ status: 409, description: 'メールアドレスが既に使用されています' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('userId') createdBy: string,
  ) {
    const user = await this.authService.createUser(createUserDto, createdBy);
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  /**
   * ユーザー更新
   * 要件: 4.3 - ユーザー情報更新時の変更履歴記録
   */
  @Put('users/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.USER, ActionType.UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ユーザー情報を更新' })
  @ApiResponse({ status: 200, description: 'ユーザー更新成功' })
  @ApiResponse({ status: 400, description: '入力データが無効です' })
  @ApiResponse({ status: 404, description: 'ユーザーが見つかりません' })
  @ApiResponse({ status: 409, description: 'メールアドレスが既に使用されています' })
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('userId') updatedBy: string,
  ) {
    const user = await this.authService.updateUser(userId, updateUserDto, updatedBy);
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  /**
   * ユーザー履歴取得
   */
  @Get('users/:id/history')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ResourceType.USER, ActionType.READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ユーザーの変更履歴を取得' })
  @ApiResponse({ status: 200, description: 'ユーザー履歴取得成功' })
  @ApiResponse({ status: 404, description: 'ユーザーが見つかりません' })
  async getUserHistory(@Param('id') userId: string) {
    const history = await this.authService.getUserHistory(userId);
    return {
      success: true,
      data: history,
    };
  }

  /**
   * トークン検証
   */
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'トークンの有効性を検証' })
  @ApiResponse({ status: 200, description: 'トークンは有効です' })
  @ApiResponse({ status: 401, description: '無効なトークンです' })
  async validateToken(@CurrentUser() user: any) {
    return {
      success: true,
      data: {
        valid: true,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          permissions: user.permissions,
        },
      },
    };
  }
}