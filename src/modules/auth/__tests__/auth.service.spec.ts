import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { PermissionsService } from '../../users/services/permissions.service';
import { AuthAttempt } from '../entities/auth-attempt.entity';
import { User } from '../../users/entities/user.entity';

describe('AuthService', () => {
    let service: AuthService;
    let usersService: UsersService;
    let permissionsService: PermissionsService;
    let jwtService: JwtService;
    let authAttemptRepository: Repository<AuthAttempt>;

    const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashedPassword',
        roleId: 'role1',
        isActive: true,
        lastLoginAt: null,
        profileImageUrl: null,
        phoneNumber: null,
        department: null,
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: null,
        history: [],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: {
                        findByEmail: jest.fn(),
                        findById: jest.fn(),
                        updateLastLogin: jest.fn(),
                    },
                },
                {
                    provide: PermissionsService,
                    useValue: {
                        getUserPermissions: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(),
                        verify: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(AuthAttempt),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
        permissionsService = module.get<PermissionsService>(PermissionsService);
        jwtService = module.get<JwtService>(JwtService);
        authAttemptRepository = module.get<Repository<AuthAttempt>>(getRepositoryToken(AuthAttempt));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateUser', () => {
        it('should return user when credentials are valid', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
            jest.spyOn(authAttemptRepository, 'create').mockReturnValue({} as AuthAttempt);
            jest.spyOn(authAttemptRepository, 'save').mockResolvedValue({} as AuthAttempt);

            const result = await service.validateUser('test@example.com', 'password');

            expect(result).toEqual(mockUser);
            expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
        });

        it('should return null when user not found', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
            jest.spyOn(authAttemptRepository, 'create').mockReturnValue({} as AuthAttempt);
            jest.spyOn(authAttemptRepository, 'save').mockResolvedValue({} as AuthAttempt);

            const result = await service.validateUser('test@example.com', 'password');

            expect(result).toBeNull();
        });

        it('should return null when password is invalid', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
            jest.spyOn(authAttemptRepository, 'create').mockReturnValue({} as AuthAttempt);
            jest.spyOn(authAttemptRepository, 'save').mockResolvedValue({} as AuthAttempt);

            const result = await service.validateUser('test@example.com', 'wrongpassword');

            expect(result).toBeNull();
        });
    });

    describe('login', () => {
        it('should return auth result with tokens', async () => {
            const mockPermissions = ['inquiry:read', 'inquiry:write'];
            jest.spyOn(jwtService, 'sign').mockReturnValue('mock-token');
            jest.spyOn(usersService, 'updateLastLogin').mockResolvedValue(undefined);
            jest.spyOn(permissionsService, 'getUserPermissions').mockResolvedValue(mockPermissions);

            const result = await service.login(mockUser, { ip: '127.0.0.1', userAgent: 'test' });

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('user');
            expect(result.user.permissions).toEqual(mockPermissions);
        });
    });
});