import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './controllers/users.controller';
import { RolesController } from './controllers/roles.controller';
import { UsersService } from './services/users.service';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { UserHistory } from './entities/user-history.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Role, UserHistory]),
    ],
    controllers: [UsersController, RolesController],
    providers: [UsersService, RolesService, PermissionsService],
    exports: [UsersService, RolesService, PermissionsService],
})
export class UsersModule { }