import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Query,
    Body,
    UseInterceptors,
    UploadedFile,
    Res,
    HttpStatus,
    ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { FilesService } from '../services';
import {
    FileUploadDto,
    FileSearchDto,
    FileDeleteDto,
    FileStatisticsDto
} from '../dto';
import { FileMetadata, FileStatistics } from '../types';

/**
 * ファイル管理コントローラー
 * ファイルのアップロード、ダウンロード、管理機能を提供
 */
@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
    constructor(private readonly filesService: FilesService) { }

    /**
     * ファイルアップロード
     */
    @Post('upload')
    @ApiOperation({ summary: 'ファイルアップロード' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({
        status: 201,
        description: 'ファイルアップロード成功',
        type: 'object'
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() uploadDto: FileUploadDto,
        @CurrentUser() user: any,
    ): Promise<{ success: boolean; data: FileMetadata }> {
        if (!file) {
            throw new Error('ファイルが選択されていません');
        }

        const uploadRequest = {
            filename: file.filename || file.originalname,
            originalName: file.originalname,
            buffer: file.buffer,
            mimeType: file.mimetype,
            size: file.size,
            inquiryId: uploadDto.inquiryId,
            uploadedBy: user.id,
            metadata: uploadDto.metadata,
        };

        const fileMetadata = await this.filesService.uploadFile(uploadRequest);

        return {
            success: true,
            data: fileMetadata,
        };
    }

    /**
     * ファイルダウンロード
     */
    @Get(':id/download')
    @ApiOperation({ summary: 'ファイルダウンロード' })
    @ApiResponse({ status: 200, description: 'ファイルダウンロード成功' })
    async downloadFile(
        @Param('id', ParseUUIDPipe) fileId: string,
        @CurrentUser() user: any,
        @Res() res: Response,
    ): Promise<void> {
        const fileData = await this.filesService.downloadFile(fileId, user?.id);

        // レスポンスヘッダーを設定
        res.setHeader('Content-Type', fileData.metadata.mimeType);
        res.setHeader('Content-Length', fileData.metadata.size);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(fileData.metadata.originalName)}"`
        );

        // ファイルデータを送信
        res.send(fileData.buffer);
    }

    /**
     * ファイルメタデータ取得
     */
    @Get(':id')
    @ApiOperation({ summary: 'ファイルメタデータ取得' })
    @ApiResponse({
        status: 200,
        description: 'ファイルメタデータ取得成功',
        type: 'object'
    })
    async getFileMetadata(
        @Param('id', ParseUUIDPipe) fileId: string,
        @CurrentUser() user: any,
    ): Promise<{ success: boolean; data: FileMetadata }> {
        const metadata = await this.filesService.getFileMetadata(fileId, user?.id);

        return {
            success: true,
            data: metadata,
        };
    }

    /**
     * 問い合わせのファイル一覧取得
     */
    @Get('inquiry/:inquiryId')
    @ApiOperation({ summary: '問い合わせのファイル一覧取得' })
    @ApiResponse({
        status: 200,
        description: 'ファイル一覧取得成功',
        type: 'array'
    })
    async getFilesByInquiry(
        @Param('inquiryId', ParseUUIDPipe) inquiryId: string,
        @CurrentUser() user: any,
    ): Promise<{ success: boolean; data: FileMetadata[] }> {
        const files = await this.filesService.getFilesByInquiry(inquiryId, user?.id);

        return {
            success: true,
            data: files,
        };
    }

    /**
     * ファイル検索
     */
    @Get()
    @ApiOperation({ summary: 'ファイル検索' })
    @ApiResponse({
        status: 200,
        description: 'ファイル検索成功',
        type: 'object'
    })
    async searchFiles(
        @Query() searchDto: FileSearchDto,
        @CurrentUser() user: any,
    ): Promise<{
        success: boolean;
        data: {
            files: FileMetadata[];
            total: number;
            page: number;
            limit: number;
        };
    }> {
        const filters = {
            inquiryId: searchDto.inquiryId,
            uploadedBy: searchDto.uploadedBy,
            mimeType: searchDto.mimeType,
            scanResult: searchDto.scanResult,
            isDeleted: searchDto.isDeleted,
            dateRange: searchDto.startDate && searchDto.endDate ? {
                start: searchDto.startDate,
                end: searchDto.endDate,
            } : undefined,
            sizeRange: searchDto.minSize !== undefined && searchDto.maxSize !== undefined ? {
                min: searchDto.minSize,
                max: searchDto.maxSize,
            } : undefined,
        };

        const result = await this.filesService.searchFiles(
            filters,
            searchDto.page,
            searchDto.limit,
            user?.id
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * ファイル削除
     */
    @Delete(':id')
    @ApiOperation({ summary: 'ファイル削除' })
    @ApiResponse({ status: 200, description: 'ファイル削除成功' })
    async deleteFile(
        @Param('id', ParseUUIDPipe) fileId: string,
        @Body() deleteDto: FileDeleteDto,
        @CurrentUser() user: any,
    ): Promise<{ success: boolean; message: string }> {
        await this.filesService.deleteFile(fileId, user.id, deleteDto.reason);

        return {
            success: true,
            message: 'ファイルが削除されました',
        };
    }

    /**
     * ファイル統計取得
     */
    @Get('statistics/overview')
    @ApiOperation({ summary: 'ファイル統計取得' })
    @ApiResponse({
        status: 200,
        description: 'ファイル統計取得成功',
        type: 'object'
    })
    async getFileStatistics(
        @Query() statisticsDto: FileStatisticsDto,
    ): Promise<{ success: boolean; data: FileStatistics }> {
        const statistics = await this.filesService.getFileStatistics(
            statisticsDto.startDate,
            statisticsDto.endDate,
            statisticsDto.groupBy
        );

        return {
            success: true,
            data: statistics,
        };
    }
}