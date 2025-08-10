import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min, Max } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ 
    description: 'ページ番号',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'ページ番号は1以上である必要があります' })
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: '1ページあたりの件数',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: '1ページあたりの件数は1以上である必要があります' })
  @Max(100, { message: '1ページあたりの件数は100以下である必要があります' })
  limit?: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}