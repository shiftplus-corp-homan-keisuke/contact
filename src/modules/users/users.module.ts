/**
 * ユーザー管理モジュール
 * 要件: 4.1, 4.2 (ユーザー管理機能の独立性確保)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// エンティティ
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { UserHistory } from './entities/user-history.entity';

// サービス
import { RoleService } from './services/role.service';

// リポジトリ
import { UserRepository } from './repositories/user.repository';

// コントローラー
import { RoleController } from './controllers/role.controller';

// 権限管理サービス
import { PermissionService } from './services/permission.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserHistory]),
  ],
  controllers: [RoleController],
  providers: [RoleService, UserRepository, PermissionService],
  exports: [RoleService, UserRepository, PermissionService],
})
export class UsersModule {}