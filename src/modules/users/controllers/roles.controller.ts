import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { RolesService } from '../services/roles.service';
import { PermissionsService } from '../services/permissions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CreateRoleDto, UpdateRoleDto, CheckPermissionDto, CheckMultiplePermissionsDto } from '../dto/role.dto';
import { Role } from '../entities/role.entity';
import { RequireSystemAdmin, Permission } from '../decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserContext } from '../../auth/types/auth.types';

@ApiTags('役割管理')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
    private readonly logger = new Logger(RolesController.name);

    constructor(
        private readonly rolesService: RolesService,
        private readonly permissionsService: PermissionsService,
    ) { }

    /**
     * 役割一覧取得
     */
    @Get()
    @Permission('role', 'read')
    @ApiOperation({ summary: '役割一覧取得' })
    @ApiResponse({
        status: 200,
        description: '役割一覧取得成功',
        type: [Role],
    })
    async findAll(): Promise<Role[]> {
        return this.rolesService.findAll();
    }

    /**
     * 役割詳細取得
     */
    @Get(':id')
    @Permission('role', 'read')
    @ApiOperation({ summary: '役割詳細取得' })
    @ApiResponse({
        status: 200,
        description: '役割詳細取得成功',
        type: Role,
    })
    @ApiResponse({
        status: 404,
        description: '役割が見つかりません',
    })
    async findOne(@Param('id') id: string): Promise<Role> {
        return this.rolesService.findById(id);
    }

    /**
     * 役割作成
     */
    @Post()
    @Permission('role', 'create')
    @ApiOperation({ summary: '役割作成' })
    @ApiResponse({
        status: 201,
        description: '役割作成成功',
        type: Role,
    })
    @ApiResponse({
        status: 400,
        description: '入力データ不正',
    })
    @ApiResponse({
        status: 409,
        description: '役割名が既に存在',
    })
    async create(
        @Body() createRoleDto: CreateRoleDto,
        @CurrentUser() user: UserContext,
    ): Promise<Role> {
        this.logger.log(`役割作成: ${createRoleDto.name} by ${user.email}`);
        return this.rolesService.create(createRoleDto);
    }

    /**
     * 役割更新
     */
    @Put(':id')
    @Permission('role', 'update')
    @ApiOperation({ summary: '役割更新' })
    @ApiResponse({
        status: 200,
        description: '役割更新成功',
        type: Role,
    })
    @ApiResponse({
        status: 404,
        description: '役割が見つかりません',
    })
    async update(
        @Param('id') id: string,
        @Body() updateRoleDto: UpdateRoleDto,
        @CurrentUser() user: UserContext,
    ): Promise<Role> {
        this.logger.log(`役割更新: ${id} by ${user.email}`);
        return this.rolesService.update(id, updateRoleDto);
    }

    /**
     * 役割削除
     */
    @Delete(':id')
    @Permission('role', 'delete')
    @ApiOperation({ summary: '役割削除' })
    @ApiResponse({
        status: 200,
        description: '役割削除成功',
    })
    @ApiResponse({
        status: 404,
        description: '役割が見つかりません',
    })
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: UserContext,
    ): Promise<{ message: string }> {
        this.logger.log(`役割削除: ${id} by ${user.email}`);
        await this.rolesService.remove(id);
        return { message: '役割を削除しました' };
    }

    /**
     * デフォルト役割作成
     */
    @Post('default')
    @RequireSystemAdmin()
    @ApiOperation({ summary: 'デフォルト役割作成' })
    @ApiResponse({
        status: 201,
        description: 'デフォルト役割作成成功',
    })
    async createDefaultRoles(@CurrentUser() user: UserContext): Promise<{ message: string }> {
        this.logger.log(`デフォルト役割作成 by ${user.email}`);
        await this.rolesService.createDefaultRoles();
        return { message: 'デフォルト役割を作成しました' };
    }

    /**
     * 利用可能な権限一覧取得
     */
    @Get('permissions/available')
    @Permission('role', 'read')
    @ApiOperation({ summary: '利用可能な権限一覧取得' })
    @ApiResponse({
        status: 200,
        description: '権限一覧取得成功',
    })
    async getAvailablePermissions(): Promise<{
        permissions: Record<string, string[]>;
        descriptions: Record<string, string>;
    }> {
        return {
            permissions: this.permissionsService.getAvailablePermissions(),
            descriptions: this.permissionsService.getPermissionDescriptions(),
        };
    }

    /**
     * ユーザーの権限チェック
     */
    @Post('permissions/check')
    @Permission('role', 'read')
    @ApiOperation({ summary: 'ユーザーの権限チェック' })
    @ApiResponse({
        status: 200,
        description: '権限チェック成功',
    })
    async checkPermission(
        @Body() checkPermissionDto: CheckPermissionDto,
        @CurrentUser() user: UserContext,
    ): Promise<{ hasPermission: boolean }> {
        const hasPermission = await this.permissionsService.checkPermission(
            user.id,
            checkPermissionDto.resource,
            checkPermissionDto.action,
        );

        return { hasPermission };
    }

    /**
     * ユーザーの複数権限チェック
     */
    @Post('permissions/check-multiple')
    @Permission('role', 'read')
    @ApiOperation({ summary: 'ユーザーの複数権限チェック' })
    @ApiResponse({
        status: 200,
        description: '複数権限チェック成功',
    })
    async checkMultiplePermissions(
        @Body() checkMultiplePermissionsDto: CheckMultiplePermissionsDto,
        @CurrentUser() user: UserContext,
    ): Promise<Record<string, boolean>> {
        return this.permissionsService.checkMultiplePermissions(
            user.id,
            checkMultiplePermissionsDto.permissions,
        );
    }

    /**
     * ユーザーの全権限取得
     */
    @Get('permissions/my')
    @ApiOperation({ summary: '現在のユーザーの権限一覧取得' })
    @ApiResponse({
        status: 200,
        description: '権限一覧取得成功',
    })
    async getMyPermissions(@CurrentUser() user: UserContext): Promise<{ permissions: string[] }> {
        const permissions = await this.permissionsService.getUserPermissions(user.id);
        return { permissions };
    }
}