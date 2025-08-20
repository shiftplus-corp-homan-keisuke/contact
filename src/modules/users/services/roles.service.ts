import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from '../dto/role.dto';

@Injectable()
export class RolesService {
    private readonly logger = new Logger(RolesService.name);

    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
    ) { }

    /**
     * 役割作成
     */
    async create(createRoleDto: CreateRoleDto): Promise<Role> {
        // 役割名の重複チェック
        const existingRole = await this.findByName(createRoleDto.name);
        if (existingRole) {
            throw new ConflictException('この役割名は既に使用されています');
        }

        const role = this.roleRepository.create(createRoleDto);
        const savedRole = await this.roleRepository.save(role);

        this.logger.log(`役割作成: ${savedRole.name} (ID: ${savedRole.id})`);
        return savedRole;
    }

    /**
     * 全役割取得
     */
    async findAll(): Promise<Role[]> {
        return this.roleRepository.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
    }

    /**
     * ID で役割検索
     */
    async findById(id: string): Promise<Role | null> {
        return this.roleRepository.findOne({
            where: { id, isActive: true },
        });
    }

    /**
     * 名前で役割検索
     */
    async findByName(name: string): Promise<Role | null> {
        return this.roleRepository.findOne({
            where: { name, isActive: true },
        });
    }

    /**
     * 役割更新
     */
    async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
        const role = await this.findById(id);
        if (!role) {
            throw new NotFoundException('役割が見つかりません');
        }

        // 役割名変更時の重複チェック
        if (updateRoleDto.name && updateRoleDto.name !== role.name) {
            const existingRole = await this.findByName(updateRoleDto.name);
            if (existingRole) {
                throw new ConflictException('この役割名は既に使用されています');
            }
        }

        Object.assign(role, updateRoleDto);
        const updatedRole = await this.roleRepository.save(role);

        this.logger.log(`役割更新: ${updatedRole.name} (ID: ${updatedRole.id})`);
        return updatedRole;
    }

    /**
     * 役割削除（ソフトデリート）
     */
    async remove(id: string): Promise<void> {
        const role = await this.findById(id);
        if (!role) {
            throw new NotFoundException('役割が見つかりません');
        }

        role.isActive = false;
        await this.roleRepository.save(role);

        this.logger.log(`役割削除: ${role.name} (ID: ${role.id})`);
    }

    /**
     * デフォルト役割の作成
     */
    async createDefaultRoles(): Promise<void> {
        const defaultRoles = [
            {
                name: '管理者',
                description: 'システム全体の管理権限を持つ',
                permissions: [
                    'system:admin',
                    'user:create',
                    'user:read',
                    'user:update',
                    'user:delete',
                    'role:create',
                    'role:read',
                    'role:update',
                    'role:delete',
                    'inquiry:create',
                    'inquiry:read',
                    'inquiry:update',
                    'inquiry:delete',
                    'response:create',
                    'response:read',
                    'response:update',
                    'response:delete',
                    'faq:create',
                    'faq:read',
                    'faq:update',
                    'faq:delete',
                    'analytics:read',
                    'template:create',
                    'template:read',
                    'template:update',
                    'template:delete',
                    'file:upload',
                    'file:download',
                    'file:delete',
                    'api-key:create',
                    'api-key:read',
                    'api-key:update',
                    'api-key:delete',
                ],
                sortOrder: 1,
            },
            {
                name: 'サポート担当者',
                description: '問い合わせ対応とFAQ管理権限を持つ',
                permissions: [
                    'inquiry:create',
                    'inquiry:read',
                    'inquiry:update',
                    'response:create',
                    'response:read',
                    'response:update',
                    'faq:create',
                    'faq:read',
                    'faq:update',
                    'template:read',
                    'template:use',
                    'file:upload',
                    'file:download',
                    'analytics:read',
                ],
                sortOrder: 2,
            },
            {
                name: '閲覧者',
                description: '問い合わせとFAQの閲覧権限のみ',
                permissions: [
                    'inquiry:read',
                    'response:read',
                    'faq:read',
                    'template:read',
                    'file:download',
                ],
                sortOrder: 3,
            },
            {
                name: 'API利用者',
                description: 'API経由での問い合わせ登録権限のみ',
                permissions: [
                    'inquiry:create',
                    'inquiry:read',
                    'file:upload',
                ],
                sortOrder: 4,
            },
        ];

        for (const roleData of defaultRoles) {
            const existingRole = await this.findByName(roleData.name);
            if (!existingRole) {
                await this.create(roleData);
            }
        }

        this.logger.log('デフォルト役割の作成が完了しました');
    }
}