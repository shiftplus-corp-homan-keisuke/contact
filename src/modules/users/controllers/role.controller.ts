/**
 * 役割管理コントローラー
 * 要件: 5.1, 5.2, 5.3, 5.4 (権限管理機能)
 */

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
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RoleService } from '../services/role.service';
import { PermissionService } from '../services/permission.service';
import { CreateRoleRequest, UpdateRoleRequest, ResourceType, ActionType } from '../../../common/types/role.types';
import { Role } from '../entities/role.entity';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * 役割作成
   * 要件: 5.1 - 役割ベースの権限管理
   */
  @Post()
  @RequirePermission(ResourceType.ROLE, ActionType.CREATE)
  @ApiOperation({ summary: '新しい役割を作成' })
  @ApiResponse({ status: 201, description: '役割が正常に作成されました' })
  @ApiResponse({ status: 400, description: '入力データが無効です' })
  @ApiResponse({ status: 409, description: '役割名が既に存在します' })
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Body() createRoleRequest: CreateRoleRequest): Promise<Role> {
    return this.roleService.createRole(createRoleRequest);
  }

  /**
   * 役割一覧取得
   */
  @Get()
  @RequirePermission(ResourceType.ROLE, ActionType.READ)
  @ApiOperation({ summary: '全ての役割を取得' })
  @ApiResponse({ status: 200, description: '役割一覧を正常に取得しました' })
  async getAllRoles(): Promise<Role[]> {
    return this.roleService.getAllRoles();
  }

  /**
   * 役割詳細取得
   */
  @Get(':id')
  @RequirePermission(ResourceType.ROLE, ActionType.READ)
  @ApiOperation({ summary: '指定された役割の詳細を取得' })
  @ApiResponse({ status: 200, description: '役割詳細を正常に取得しました' })
  @ApiResponse({ status: 404, description: '役割が見つかりません' })
  async getRoleById(@Param('id') roleId: string): Promise<Role> {
    return this.roleService.getRoleById(roleId);
  }

  /**
   * 役割更新
   */
  @Put(':id')
  @RequirePermission(ResourceType.ROLE, ActionType.UPDATE)
  @ApiOperation({ summary: '役割を更新' })
  @ApiResponse({ status: 200, description: '役割が正常に更新されました' })
  @ApiResponse({ status: 400, description: '入力データが無効です' })
  @ApiResponse({ status: 404, description: '役割が見つかりません' })
  @ApiResponse({ status: 409, description: '役割名が既に存在します' })
  async updateRole(
    @Param('id') roleId: string,
    @Body() updateRoleRequest: UpdateRoleRequest,
  ): Promise<Role> {
    return this.roleService.updateRole(roleId, updateRoleRequest);
  }

  /**
   * 役割削除
   */
  @Delete(':id')
  @RequirePermission(ResourceType.ROLE, ActionType.DELETE)
  @ApiOperation({ summary: '役割を削除' })
  @ApiResponse({ status: 204, description: '役割が正常に削除されました' })
  @ApiResponse({ status: 404, description: '役割が見つかりません' })
  @ApiResponse({ status: 409, description: 'ユーザーが割り当てられているため削除できません' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') roleId: string): Promise<void> {
    return this.roleService.deleteRole(roleId);
  }

  /**
   * ユーザーに役割を割り当て
   * 要件: 5.1 - ユーザーに役割が割り当てられる時の権限付与
   */
  @Post(':roleId/assign/:userId')
  @RequirePermission(ResourceType.USER, ActionType.ASSIGN)
  @ApiOperation({ summary: 'ユーザーに役割を割り当て' })
  @ApiResponse({ status: 200, description: '役割が正常に割り当てられました' })
  @ApiResponse({ status: 404, description: 'ユーザーまたは役割が見つかりません' })
  async assignRoleToUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.permissionService.assignRoleToUser(userId, roleId);
    return { message: '役割が正常に割り当てられました' };
  }

  /**
   * ユーザーの権限一覧取得
   */
  @Get('user/:userId/permissions')
  @RequirePermission(ResourceType.USER, ActionType.READ)
  @ApiOperation({ summary: 'ユーザーの権限一覧を取得' })
  @ApiResponse({ status: 200, description: 'ユーザーの権限一覧を正常に取得しました' })
  async getUserPermissions(@Param('userId') userId: string) {
    const permissions = await this.permissionService.getUserPermissions(userId);
    return { permissions };
  }

  /**
   * 権限チェック
   * 要件: 5.2 - ユーザーが機能にアクセス時の権限確認
   */
  @Post('check-permission')
  @ApiOperation({ summary: '権限チェック' })
  @ApiResponse({ status: 200, description: '権限チェック結果を返します' })
  async checkPermission(
    @CurrentUser('userId') userId: string,
    @Body() checkData: { resource: string; action: string },
  ): Promise<{ hasPermission: boolean }> {
    const hasPermission = await this.permissionService.checkPermission(
      userId,
      checkData.resource,
      checkData.action,
    );
    return { hasPermission };
  }

  /**
   * 事前定義された役割の初期化
   */
  @Post('initialize')
  @RequirePermission(ResourceType.ROLE, ActionType.CREATE)
  @ApiOperation({ summary: '事前定義された役割を初期化' })
  @ApiResponse({ status: 200, description: '事前定義された役割が正常に作成されました' })
  async initializePredefinedRoles(): Promise<{ message: string }> {
    await this.permissionService.createPredefinedRoles();
    return { message: '事前定義された役割が正常に作成されました' };
  }
}