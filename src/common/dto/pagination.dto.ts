import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { APP_CONSTANTS } from '../constants';

export class PaginationDto {
    @ApiProperty({
        description: 'ページ番号',
        minimum: 1,
        default: 1,
        required: false
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'ページ番号は整数である必要があります' })
    @Min(1, { message: 'ページ番号は1以上である必要があります' })
    page?: number = 1;

    @ApiProperty({
        description: '1ページあたりの取得件数',
        minimum: 1,
        maximum: APP_CONSTANTS.MAX_PAGE_SIZE,
        default: APP_CONSTANTS.DEFAULT_PAGE_SIZE,
        required: false
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: '取得件数は整数である必要があります' })
    @Min(1, { message: '取得件数は1以上である必要があります' })
    @Max(APP_CONSTANTS.MAX_PAGE_SIZE, {
        message: `取得件数は${APP_CONSTANTS.MAX_PAGE_SIZE}以下である必要があります`
    })
    limit?: number = APP_CONSTANTS.DEFAULT_PAGE_SIZE;

    @ApiProperty({
        description: 'ソート項目',
        required: false,
        example: 'createdAt'
    })
    @IsOptional()
    @IsString({ message: 'ソート項目は文字列である必要があります' })
    sortBy?: string;

    @ApiProperty({
        description: 'ソート順序',
        enum: ['ASC', 'DESC'],
        default: 'DESC',
        required: false
    })
    @IsOptional()
    @IsIn(['ASC', 'DESC'], { message: 'ソート順序はASCまたはDESCである必要があります' })
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class PaginationMetaDto {
    @ApiProperty({ description: '現在のページ番号' })
    page: number;

    @ApiProperty({ description: '1ページあたりの取得件数' })
    limit: number;

    @ApiProperty({ description: '総件数' })
    total: number;

    @ApiProperty({ description: '総ページ数' })
    totalPages: number;

    @ApiProperty({ description: '次のページが存在するか' })
    hasNext: boolean;

    @ApiProperty({ description: '前のページが存在するか' })
    hasPrev: boolean;

    constructor(page: number, limit: number, total: number) {
        this.page = page;
        this.limit = limit;
        this.total = total;
        this.totalPages = Math.ceil(total / limit);
        this.hasNext = page < this.totalPages;
        this.hasPrev = page > 1;
    }
}

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'データ配列', isArray: true })
    items: T[];

    @ApiProperty({ description: 'ページネーション情報', type: PaginationMetaDto })
    meta: PaginationMetaDto;

    constructor(items: T[], total: number, page: number, limit: number) {
        this.items = items;
        this.meta = new PaginationMetaDto(page, limit, total);
    }
}