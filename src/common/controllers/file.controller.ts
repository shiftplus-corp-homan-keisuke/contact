import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { FileService } from '../../modules/files/services/file.service';
import {
  FileUploadDto,
  FileResponseDto,
  FileSearchDto,
  FileUpdateDto,
  FileStatsDto,
  FileValidationResultDto
} from '../dto/file.dto';
import { BaseResponseDto } from '../dto/base-response.dto';
import { User } from '../../modules/users/entities/user.entity';

/**
 * ファイル管理コントローラー
 * ファイルのアップロード、ダウンロード、管理機能のAPIエンドポイント
 */
@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * ファイルアップロード
   */
  @Post('upload')
  @ApiOperation({ summary: 'ファイルアップロード' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'ファイルアップロード成功',
    type: FileResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'バリデーションエラー'
  })
  @RequirePermission('file', 'create')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, callback) => {
      // 基本的なファイルタイプチェック
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new BadRequestException('許可されていないファイル形式です'), false);
      }
    }
  }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: FileUploadDto,
    @CurrentUser() user: User
  ): Promise<BaseResponseDto<FileResponseDto>> {
    if (!file) {
      throw new BadRequestException('ファイルが選択されていません');
    }

    const result = await this.fileService.uploadFile(
      file,
      uploadDto.inquiryId,
      user.id,
      uploadDto.description
    );

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    // FileMetadataをFileResponseDtoに変換
    const fileResponse: FileResponseDto = {
      id: result.file.id,
      filename: result.file.filename,
      originalFilename: result.file.originalFilename,
      size: result.file.size,
      mimeType: result.file.mimeType,
      inquiryId: result.file.inquiryId,
      uploadedBy: result.file.uploadedBy,
      uploadedAt: result.file.uploadedAt,
      isScanned: result.file.isScanned,
      scanResult: result.file.scanResult as 'clean' | 'infected' | 'suspicious' | 'pending',
      scannedAt: result.file.scannedAt,
      description: result.file.description,
      downloadCount: result.file.downloadCount,
      lastDownloadedAt: result.file.lastDownloadedAt,
      expiresAt: result.file.expiresAt,
      createdAt: result.file.uploadedAt, // FileMetadataにはcreatedAtがないのでuploadedAtを使用
      updatedAt: result.file.uploadedAt  // FileMetadataにはupdatedAtがないのでuploadedAtを使用
    };

    return new BaseResponseDto(fileResponse, true, 'ファイルアップロードが完了しました');
  }

  /**
   * ファイル情報取得
   */
  @Get(':fileId')
  @ApiOperation({ summary: 'ファイル情報取得' })
  @ApiParam({ name: 'fileId', description: 'ファイルID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ファイル情報取得成功',
    type: FileResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ファイルが見つかりません'
  })
  @RequirePermission('file', 'read')
  async getFile(
    @Param('fileId', ParseUUIDPipe) fileId: string
  ): Promise<BaseResponseDto<FileResponseDto>> {
    const file = await this.fileService.getFile(fileId);

    // FileMetadataをFileResponseDtoに変換
    const fileResponse: FileResponseDto = {
      id: file.id,
      filename: file.filename,
      originalFilename: file.originalFilename,
      size: file.size,
      mimeType: file.mimeType,
      inquiryId: file.inquiryId,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
      isScanned: file.isScanned,
      scanResult: file.scanResult as 'clean' | 'infected' | 'suspicious' | 'pending',
      scannedAt: file.scannedAt,
      description: file.description,
      downloadCount: file.downloadCount,
      lastDownloadedAt: file.lastDownloadedAt,
      expiresAt: file.expiresAt,
      createdAt: file.uploadedAt,
      updatedAt: file.uploadedAt
    };

    return new BaseResponseDto(fileResponse);
  }

  /**
   * ファイルダウンロード
   */
  @Get(':fileId/download')
  @ApiOperation({ summary: 'ファイルダウンロード' })
  @ApiParam({ name: 'fileId', description: 'ファイルID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ファイルダウンロード成功'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ファイルが見つかりません'
  })
  @RequirePermission('file', 'read')
  async downloadFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() user: User,
    @Res() res: Response
  ): Promise<void> {
    const downloadInfo = await this.fileService.downloadFile(fileId, user.id);

    res.set({
      'Content-Type': downloadInfo.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadInfo.filename)}"`,
      'Content-Length': downloadInfo.size.toString()
    });

    downloadInfo.stream.pipe(res);
  }

  /**
   * 問い合わせのファイル一覧取得
   */
  @Get('inquiry/:inquiryId')
  @ApiOperation({ summary: '問い合わせのファイル一覧取得' })
  @ApiParam({ name: 'inquiryId', description: '問い合わせID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ファイル一覧取得成功',
    type: [FileResponseDto]
  })
  @RequirePermission('file', 'read')
  async getFilesByInquiry(
    @Param('inquiryId', ParseUUIDPipe) inquiryId: string
  ): Promise<BaseResponseDto<FileResponseDto[]>> {
    const files = await this.fileService.getFilesByInquiry(inquiryId);

    // FileMetadata[]をFileResponseDto[]に変換
    const fileResponses: FileResponseDto[] = files.map(file => ({
      id: file.id,
      filename: file.filename,
      originalFilename: file.originalFilename,
      size: file.size,
      mimeType: file.mimeType,
      inquiryId: file.inquiryId,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
      isScanned: file.isScanned,
      scanResult: file.scanResult as 'clean' | 'infected' | 'suspicious' | 'pending',
      scannedAt: file.scannedAt,
      description: file.description,
      downloadCount: file.downloadCount,
      lastDownloadedAt: file.lastDownloadedAt,
      expiresAt: file.expiresAt,
      createdAt: file.uploadedAt,
      updatedAt: file.uploadedAt
    }));

    return new BaseResponseDto(fileResponses);
  }

  /**
   * ファイル検索
   */
  @Get()
  @ApiOperation({ summary: 'ファイル検索' })
  @ApiQuery({ name: 'inquiryId', required: false, description: '問い合わせID' })
  @ApiQuery({ name: 'uploadedBy', required: false, description: 'アップロードユーザーID' })
  @ApiQuery({ name: 'mimeType', required: false, description: 'MIMEタイプ' })
  @ApiQuery({ name: 'scanResult', required: false, description: 'スキャン結果' })
  @ApiQuery({ name: 'uploadedAfter', required: false, description: 'アップロード開始日' })
  @ApiQuery({ name: 'uploadedBefore', required: false, description: 'アップロード終了日' })
  @ApiQuery({ name: 'filename', required: false, description: 'ファイル名' })
  @ApiQuery({ name: 'minSize', required: false, description: '最小ファイルサイズ' })
  @ApiQuery({ name: 'maxSize', required: false, description: '最大ファイルサイズ' })
  @ApiQuery({ name: 'page', required: false, description: 'ページ番号' })
  @ApiQuery({ name: 'limit', required: false, description: '1ページあたりの件数' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ファイル検索成功'
  })
  @RequirePermission('file', 'read')
  async searchFiles(
    @Query() searchDto: FileSearchDto
  ): Promise<BaseResponseDto<any>> {
    const criteria = {
      inquiryId: searchDto.inquiryId,
      uploadedBy: searchDto.uploadedBy,
      mimeType: searchDto.mimeType,
      scanResult: searchDto.scanResult as any, // FileScanResult enumに変換
      uploadedAfter: searchDto.uploadedAfter ? new Date(searchDto.uploadedAfter) : undefined,
      uploadedBefore: searchDto.uploadedBefore ? new Date(searchDto.uploadedBefore) : undefined,
      filename: searchDto.filename,
      minSize: searchDto.minSize,
      maxSize: searchDto.maxSize,
      includeDeleted: false
    };

    const result = await this.fileService.searchFiles(
      criteria,
      searchDto.page || 1,
      searchDto.limit || 20
    );

    return new BaseResponseDto(result);
  }

  /**
   * ファイル情報更新
   */
  @Put(':fileId')
  @ApiOperation({ summary: 'ファイル情報更新' })
  @ApiParam({ name: 'fileId', description: 'ファイルID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ファイル情報更新成功',
    type: FileResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ファイルが見つかりません'
  })
  @RequirePermission('file', 'update')
  async updateFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() updateDto: FileUpdateDto,
    @CurrentUser() user: User
  ): Promise<BaseResponseDto<FileResponseDto>> {
    const updates = {
      description: updateDto.description,
      expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined
    };

    const file = await this.fileService.updateFile(fileId, updates, user.id);

    // FileMetadataをFileResponseDtoに変換
    const fileResponse: FileResponseDto = {
      id: file.id,
      filename: file.filename,
      originalFilename: file.originalFilename,
      size: file.size,
      mimeType: file.mimeType,
      inquiryId: file.inquiryId,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
      isScanned: file.isScanned,
      scanResult: file.scanResult as 'clean' | 'infected' | 'suspicious' | 'pending',
      scannedAt: file.scannedAt,
      description: file.description,
      downloadCount: file.downloadCount,
      lastDownloadedAt: file.lastDownloadedAt,
      expiresAt: file.expiresAt,
      createdAt: file.uploadedAt,
      updatedAt: file.uploadedAt
    };

    return new BaseResponseDto(fileResponse, true, 'ファイル情報を更新しました');
  }

  /**
   * ファイル削除
   */
  @Delete(':fileId')
  @ApiOperation({ summary: 'ファイル削除' })
  @ApiParam({ name: 'fileId', description: 'ファイルID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ファイル削除成功'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ファイルが見つかりません'
  })
  @RequirePermission('file', 'delete')
  async deleteFile(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() user: User
  ): Promise<BaseResponseDto<void>> {
    const result = await this.fileService.deleteFile(fileId, user.id);

    if (!result.success) {
      throw new BadRequestException(result.error);
    }

    return new BaseResponseDto(null, true, 'ファイルを削除しました');
  }

  /**
   * ファイル統計情報取得
   */
  @Get('admin/statistics')
  @ApiOperation({ summary: 'ファイル統計情報取得' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ファイル統計情報取得成功',
    type: FileStatsDto
  })
  @RequirePermission('file', 'admin')
  async getFileStatistics(): Promise<BaseResponseDto<FileStatsDto>> {
    const stats = await this.fileService.getFileStatistics();

    return new BaseResponseDto(stats as FileStatsDto);
  }

  /**
   * ストレージ使用量取得
   */
  @Get('admin/storage-usage')
  @ApiOperation({ summary: 'ストレージ使用量取得' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ストレージ使用量取得成功'
  })
  @RequirePermission('file', 'admin')
  async getStorageUsage(): Promise<BaseResponseDto<any>> {
    const usage = await this.fileService.getStorageUsage();

    return new BaseResponseDto(usage);
  }

  /**
   * 期限切れファイルクリーンアップ
   */
  @Post('admin/cleanup-expired')
  @ApiOperation({ summary: '期限切れファイルクリーンアップ' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'クリーンアップ実行成功'
  })
  @RequirePermission('file', 'admin')
  async cleanupExpiredFiles(): Promise<BaseResponseDto<any>> {
    const result = await this.fileService.cleanupExpiredFiles();

    return new BaseResponseDto(result, true, `${result.cleanedFileCount}個のファイルをクリーンアップしました`);
  }
}