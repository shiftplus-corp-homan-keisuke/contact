import { ApiProperty } from '@nestjs/swagger';

/**
 * ユーザーコンテキストDTO（Swagger用）
 */
export class UserContextDto {
    @ApiProperty({
        description: 'ユーザーID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    id: string;

    @ApiProperty({
        description: 'メールアドレス',
        example: 'user@example.com',
    })
    email: string;

    @ApiProperty({
        description: 'ユーザー名',
        example: '田中太郎',
    })
    name: string;

    @ApiProperty({
        description: '役割ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    roleId: string;

    @ApiProperty({
        description: '権限リスト',
        example: ['inquiry:read', 'inquiry:write'],
    })
    permissions: string[];
}