import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { APP_CONSTANTS } from '../constants';

export class PaginationDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'ページ番号は整数である必要があります' })
    @Min(1, { message: 'ページ番号は1以上である必要があります' })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: '取得件数は整数である必要があります' })
    @Min(1, { message: '取得件数は1以上である必要があります' })
    @Max(APP_CONSTANTS.MAX_PAGE_SIZE, {
        message: `取得件数は${APP_CONSTANTS.MAX_PAGE_SIZE}以下である必要があります`
    })
    limit?: number = APP_CONSTANTS.DEFAULT_PAGE_SIZE;

    @IsOptional()
    @IsString({ message: 'ソート項目は文字列である必要があります' })
    sortBy?: string;

    @IsOptional()
    @IsIn(['ASC', 'DESC'], { message: 'ソート順序はASCまたはDESCである必要があります' })
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export class PaginatedResponseDto<T> {
    items: T[];
    meta: PaginationMeta;

    constructor(items: T[], total: number, page: number, limit: number) {
        this.items = items;
        this.meta = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        };
    }
}