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

import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { User, UserHistory } from '../entities';
import { Permission } from '../decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserContext } from '../../auth/types/auth.types';

@ApiTags('ユーザー管理')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(private readonly usersService: UsersService) { }

    /**
     * ユーザー一覧取得
     */
    @Get()
    @Permission('user', 'read')
    @ApiOperation({ summary: 'ユーザー一覧取得' })
    @ApiResponse({
        status: 200,
        description: 'ユーザー一覧取得成功',
        type: [User],
    })
    async findAll(): Promise<User[]> {
        return this.usersService.findAll();
    }

    /**
     * ユーザー詳細取得
     */
    @Get(':id')
    @Permission('user', 'read')
    @ApiOperation({ summary: 'ユーザー詳細取得' })
    @ApiResponse({
        status: 200,
        description: 'ユーザー詳細取得成功',
        type: User,
    })
    @ApiResponse({
        status: 404,
        description: 'ユーザーが見つかりません',
    })
    async findOne(@Param('id') id: string): Promise<User> {
        return this.usersService.findById(id);
    }

    /**
     * ユーザー作成
     */
    @Post()
    @Permission('user', 'create')
    @ApiOperation({ summary: 'ユーザー作成' })
    @ApiResponse({
        status: 201,
        description: 'ユーザー作成成功',
        type: User,
    })
    @ApiResponse({
        status: 400,
        description: '入力データ不正',
    })
    @ApiResponse({
        status: 409,
        description: 'メールアドレスが既に存在',
    })
    async create(
        @Body() createUserDto: CreateUserDto,
        @CurrentUser() user: UserContext,
    ): Promise<User> {
        this.logger.log(`ユーザー作成: ${createUserDto.email} by ${user.email}`);
        return this.usersService.create(createUserDto);
    }

    /**
     * ユーザー更新
     */
    @Put(':id')
    @Permission('user', 'update')
    @ApiOperation({ summary: 'ユーザー更新' })
    @ApiResponse({
        status: 200,
        description: 'ユーザー更新成功',
        type: User,
    })
    @ApiResponse({
        status: 404,
        description: 'ユーザーが見つかりません',
    })
    async update(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @CurrentUser() user: UserContext,
    ): Promise<User> {
        this.logger.log(`ユーザー更新: ${id} by ${user.email}`);
        return this.usersService.update(id, updateUserDto, user.id);
    }

    /**
     * ユーザー削除
     */
    @Delete(':id')
    @Permission('user', 'delete')
    @ApiOperation({ summary: 'ユーザー削除' })
    @ApiResponse({
        status: 200,
        description: 'ユーザー削除成功',
    })
    @ApiResponse({
        status: 404,
        description: 'ユーザーが見つかりません',
    })
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: UserContext,
    ): Promise<{ message: string }> {
        this.logger.log(`ユーザー削除: ${id} by ${user.email}`);
        await this.usersService.remove(id, user.id);
        return { message: 'ユーザーを削除しました' };
    }

    /**
     * ユーザー履歴取得
     */
    @Get(':id/history')
    @Permission('user', 'read')
    @ApiOperation({ summary: 'ユーザー履歴取得' })
    @ApiResponse({
        status: 200,
        description: 'ユーザー履歴取得成功',
        type: [UserHistory],
    })
    async getUserHistory(@Param('id') id: string): Promise<UserHistory[]> {
        return this.usersService.getUserHistory(id);
    }
}