import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SlaMonitoringService } from '../services/sla-monitoring.service';
import { EscalationService } from '../services/escalation.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SlaConfig } from '../entities/sla-config.entity';
import { SlaViolation } from '../entities/sla-violation.entity';
import {
  CreateSlaConfigDto,
  UpdateSlaConfigDto,
  SlaViolationResponseDto,
  SlaMetricsDto,
  EscalationRuleDto,
} from '../dto/sla.dto';

/**
 * SLA管理コントローラー
 * SLA設定、監視、アラート機能のAPIを提供
 */
@ApiTags('SLA管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sla')
export class SlaController {
  constructor(
    @InjectRepository(SlaConfig)
    private readonly slaConfigRepository: Repository<SlaConfig>,
    @InjectRepository(SlaViolation)
    private readonly slaViolationRepository: Repository<SlaViolation>,
    private readonly slaMonitoringService: SlaMonitoringService,
    private readonly escalationService: EscalationService,
  ) {}

  /**
   * SLA設定の作成
   */
  @Post('configs')
  @ApiOperation({ summary: 'SLA設定の作成' })
  @ApiResponse({ status: 201, description: 'SLA設定が正常に作成されました' })
  async createSlaConfig(@Body() createSlaConfigDto: CreateSlaConfigDto): Promise<SlaConfig> {
    const slaConfig = this.slaConfigRepository.create(createSlaConfigDto);
    return this.slaConfigRepository.save(slaConfig);
  }

  /**
   * SLA設定一覧の取得
   */
  @Get('configs')
  @ApiOperation({ summary: 'SLA設定一覧の取得' })
  @ApiQuery({ name: 'applicationId', required: false, description: 'アプリケーションID' })
  @ApiResponse({ status: 200, description: 'SLA設定一覧', type: [SlaConfig] })
  async getSlaConfigs(
    @Query('applicationId') applicationId?: string,
  ): Promise<SlaConfig[]> {
    const where = applicationId ? { applicationId } : {};
    return this.slaConfigRepository.find({
      where,
      relations: ['application'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * SLA設定の取得
   */
  @Get('configs/:id')
  @ApiOperation({ summary: 'SLA設定の取得' })
  @ApiResponse({ status: 200, description: 'SLA設定', type: SlaConfig })
  async getSlaConfig(@Param('id', ParseUUIDPipe) id: string): Promise<SlaConfig> {
    return this.slaConfigRepository.findOneOrFail({
      where: { id },
      relations: ['application'],
    });
  }

  /**
   * SLA設定の更新
   */
  @Put('configs/:id')
  @ApiOperation({ summary: 'SLA設定の更新' })
  @ApiResponse({ status: 200, description: 'SLA設定が正常に更新されました' })
  async updateSlaConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSlaConfigDto: UpdateSlaConfigDto,
  ): Promise<SlaConfig> {
    await this.slaConfigRepository.update(id, updateSlaConfigDto);
    return this.getSlaConfig(id);
  }

  /**
   * SLA設定の削除
   */
  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'SLA設定の削除' })
  @ApiResponse({ status: 204, description: 'SLA設定が正常に削除されました' })
  async deleteSlaConfig(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.slaConfigRepository.delete(id);
  }

  /**
   * SLA違反一覧の取得
   */
  @Get('violations')
  @ApiOperation({ summary: 'SLA違反一覧の取得' })
  @ApiQuery({ name: 'applicationId', required: false, description: 'アプリケーションID' })
  @ApiQuery({ name: 'severity', required: false, description: '重要度' })
  @ApiQuery({ name: 'isResolved', required: false, description: '解決済みフラグ' })
  @ApiQuery({ name: 'startDate', required: false, description: '開始日' })
  @ApiQuery({ name: 'endDate', required: false, description: '終了日' })
  @ApiResponse({ status: 200, description: 'SLA違反一覧', type: [SlaViolationResponseDto] })
  async getSlaViolations(
    @Query('applicationId') applicationId?: string,
    @Query('severity') severity?: string,
    @Query('isResolved') isResolved?: boolean,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SlaViolation[]> {
    const where: any = {};

    if (severity) {
      where.severity = severity;
    }

    if (isResolved !== undefined) {
      where.isResolved = isResolved;
    }

    if (startDate && endDate) {
      where.violationTime = Between(new Date(startDate), new Date(endDate));
    }

    let queryBuilder = this.slaViolationRepository
      .createQueryBuilder('violation')
      .leftJoinAndSelect('violation.inquiry', 'inquiry')
      .leftJoinAndSelect('violation.slaConfig', 'slaConfig')
      .leftJoinAndSelect('violation.escalatedToUser', 'escalatedToUser');

    if (applicationId) {
      queryBuilder = queryBuilder.where('slaConfig.applicationId = :applicationId', { applicationId });
    }

    Object.keys(where).forEach(key => {
      if (key === 'violationTime') {
        queryBuilder = queryBuilder.andWhere('violation.violationTime BETWEEN :startDate AND :endDate', {
          startDate: where[key].from,
          endDate: where[key].to,
        });
      } else {
        queryBuilder = queryBuilder.andWhere(`violation.${key} = :${key}`, { [key]: where[key] });
      }
    });

    return queryBuilder
      .orderBy('violation.violationTime', 'DESC')
      .getMany();
  }

  /**
   * SLA違反の詳細取得
   */
  @Get('violations/:id')
  @ApiOperation({ summary: 'SLA違反の詳細取得' })
  @ApiResponse({ status: 200, description: 'SLA違反詳細', type: SlaViolationResponseDto })
  async getSlaViolation(@Param('id', ParseUUIDPipe) id: string): Promise<SlaViolation> {
    return this.slaViolationRepository.findOneOrFail({
      where: { id },
      relations: ['inquiry', 'slaConfig', 'escalatedToUser'],
    });
  }

  /**
   * SLAメトリクスの取得
   */
  @Get('metrics')
  @ApiOperation({ summary: 'SLAメトリクスの取得' })
  @ApiQuery({ name: 'applicationId', required: true, description: 'アプリケーションID' })
  @ApiQuery({ name: 'startDate', required: true, description: '開始日' })
  @ApiQuery({ name: 'endDate', required: true, description: '終了日' })
  @ApiResponse({ status: 200, description: 'SLAメトリクス', type: SlaMetricsDto })
  async getSlaMetrics(
    @Query('applicationId') applicationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<SlaMetricsDto> {
    return this.slaMonitoringService.getSlaMetrics(
      applicationId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * 手動エスカレーションの実行
   */
  @Post('violations/:id/escalate')
  @ApiOperation({ summary: '手動エスカレーションの実行' })
  @ApiResponse({ status: 200, description: 'エスカレーションが正常に実行されました' })
  async escalateViolation(
    @Param('id', ParseUUIDPipe) violationId: string,
    @Body() escalationRule: EscalationRuleDto,
    // TODO: 実際の実装では認証されたユーザーIDを取得
    // @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    // 仮のユーザーID（実際の実装では認証されたユーザーから取得）
    const escalatedByUserId = 'current-user-id';
    
    await this.escalationService.performManualEscalation(
      violationId,
      escalationRule,
      escalatedByUserId,
    );

    return { message: 'エスカレーションが正常に実行されました' };
  }

  /**
   * エスカレーション履歴の取得
   */
  @Get('inquiries/:inquiryId/escalations')
  @ApiOperation({ summary: 'エスカレーション履歴の取得' })
  @ApiResponse({ status: 200, description: 'エスカレーション履歴', type: [SlaViolationResponseDto] })
  async getEscalationHistory(
    @Param('inquiryId', ParseUUIDPipe) inquiryId: string,
  ): Promise<SlaViolation[]> {
    return this.escalationService.getEscalationHistory(inquiryId);
  }

  /**
   * エスカレーション統計の取得
   */
  @Get('escalations/stats')
  @ApiOperation({ summary: 'エスカレーション統計の取得' })
  @ApiQuery({ name: 'startDate', required: true, description: '開始日' })
  @ApiQuery({ name: 'endDate', required: true, description: '終了日' })
  @ApiResponse({ status: 200, description: 'エスカレーション統計' })
  async getEscalationStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    return this.escalationService.getEscalationStats(
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * SLA違反の解決マーク
   */
  @Put('violations/:id/resolve')
  @ApiOperation({ summary: 'SLA違反の解決マーク' })
  @ApiResponse({ status: 200, description: 'SLA違反が解決済みにマークされました' })
  async resolveSlaViolation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('resolutionNotes') resolutionNotes?: string,
  ): Promise<SlaViolation> {
    const violation = await this.slaViolationRepository.findOneOrFail({
      where: { id },
    });

    violation.isResolved = true;
    violation.resolvedAt = new Date();
    if (resolutionNotes) {
      violation.resolutionNotes = resolutionNotes;
    }

    return this.slaViolationRepository.save(violation);
  }

  /**
   * アラートダッシュボード用データの取得
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'アラートダッシュボード用データの取得' })
  @ApiResponse({ status: 200, description: 'ダッシュボードデータ' })
  async getDashboardData(): Promise<any> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 過去24時間のSLA違反
    const recentViolations = await this.slaViolationRepository.find({
      where: {
        violationTime: Between(last24Hours, now),
      },
      relations: ['inquiry', 'slaConfig'],
      order: { violationTime: 'DESC' },
      take: 10,
    });

    // 未解決のSLA違反数
    const unresolvedViolations = await this.slaViolationRepository.count({
      where: { isResolved: false },
    });

    // 重要度別の未解決違反数
    const violationsBySeverity = await this.slaViolationRepository
      .createQueryBuilder('violation')
      .select('violation.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where('violation.isResolved = false')
      .groupBy('violation.severity')
      .getRawMany();

    // 過去7日間のエスカレーション数
    const recentEscalations = await this.slaViolationRepository.count({
      where: {
        isEscalated: true,
        escalatedAt: Between(last7Days, now),
      },
    });

    // アプリケーション別のSLA違反数（過去7日間）
    const violationsByApp = await this.slaViolationRepository
      .createQueryBuilder('violation')
      .leftJoin('violation.slaConfig', 'slaConfig')
      .leftJoin('slaConfig.application', 'application')
      .select('application.name', 'applicationName')
      .addSelect('COUNT(*)', 'count')
      .where('violation.violationTime >= :startDate', { startDate: last7Days })
      .groupBy('application.name')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      recentViolations,
      unresolvedViolations,
      violationsBySeverity: violationsBySeverity.reduce((acc, item) => {
        acc[item.severity] = parseInt(item.count);
        return acc;
      }, {}),
      recentEscalations,
      violationsByApp,
      lastUpdated: now,
    };
  }
}