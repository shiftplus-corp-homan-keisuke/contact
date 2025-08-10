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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
// import { RolesGuard } from '../guards/roles.guard';
// import { Roles } from '../decorators/roles.decorator';
import { RealtimeNotificationService } from '../services/realtime-notification.service';
import { NotificationRuleEngineService } from '../services/notification-rule-engine.service';
import { SlackNotificationService } from '../services/slack-notification.service';
import { TeamsNotificationService } from '../services/teams-notification.service';
import {
  NotificationRequestDto,
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
  UpdateUserNotificationSettingsDto,
} from '../dto/notification.dto';

/**
 * 通知管理コントローラー
 */
@ApiTags('通知管理')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private realtimeNotificationService: RealtimeNotificationService,
    private notificationRuleEngine: NotificationRuleEngineService,
    private slackNotificationService: SlackNotificationService,
    private teamsNotificationService: TeamsNotificationService,
  ) {}

  /**
   * 通知を送信
   */
  @Post('send')
  @ApiOperation({ summary: '通知を送信' })
  @ApiResponse({ status: 201, description: '通知が正常に送信されました' })
  async sendNotification(@Body() notification: NotificationRequestDto) {
    await this.realtimeNotificationService.sendNotification(notification);
    return { message: '通知を送信しました' };
  }

  /**
   * 複数の通知を一括送信
   */
  @Post('send-bulk')
  @ApiOperation({ summary: '複数の通知を一括送信' })
  @ApiResponse({ status: 201, description: '通知が正常に送信されました' })
  async sendBulkNotifications(@Body() notifications: NotificationRequestDto[]) {
    await this.realtimeNotificationService.sendBulkNotifications(notifications);
    return { message: `${notifications.length}件の通知を送信しました` };
  }

  /**
   * システム通知を送信
   */
  @Post('system')
  @ApiOperation({ summary: 'システム通知を送信' })
  @ApiResponse({ status: 201, description: 'システム通知が正常に送信されました' })
  async sendSystemNotification(
    @Body() body: { title: string; message: string; priority?: string },
  ) {
    await this.realtimeNotificationService.sendSystemNotification(
      body.title,
      body.message,
      body.priority as any,
    );
    return { message: 'システム通知を送信しました' };
  }

  /**
   * 通知ルールを作成
   */
  @Post('rules')
  @ApiOperation({ summary: '通知ルールを作成' })
  @ApiResponse({ status: 201, description: '通知ルールが正常に作成されました' })
  async createNotificationRule(
    @Body() createRuleDto: CreateNotificationRuleDto,
    @Request() req,
  ) {
    // TODO: NotificationRuleServiceを実装して通知ルールを作成
    return { message: '通知ルールを作成しました' };
  }

  /**
   * 通知ルール一覧を取得
   */
  @Get('rules')
  @ApiOperation({ summary: '通知ルール一覧を取得' })
  @ApiResponse({ status: 200, description: '通知ルール一覧' })
  async getNotificationRules() {
    // TODO: NotificationRuleServiceを実装して通知ルール一覧を取得
    return [];
  }

  /**
   * 通知ルールを更新
   */
  @Put('rules/:id')
  @ApiOperation({ summary: '通知ルールを更新' })
  @ApiResponse({ status: 200, description: '通知ルールが正常に更新されました' })
  async updateNotificationRule(
    @Param('id') id: string,
    @Body() updateRuleDto: UpdateNotificationRuleDto,
  ) {
    // TODO: NotificationRuleServiceを実装して通知ルールを更新
    return { message: '通知ルールを更新しました' };
  }

  /**
   * 通知ルールを削除
   */
  @Delete('rules/:id')
  @ApiOperation({ summary: '通知ルールを削除' })
  @ApiResponse({ status: 200, description: '通知ルールが正常に削除されました' })
  async deleteNotificationRule(@Param('id') id: string) {
    // TODO: NotificationRuleServiceを実装して通知ルールを削除
    return { message: '通知ルールを削除しました' };
  }

  /**
   * ユーザーの通知設定を取得
   */
  @Get('settings')
  @ApiOperation({ summary: 'ユーザーの通知設定を取得' })
  @ApiResponse({ status: 200, description: 'ユーザーの通知設定' })
  async getUserNotificationSettings(@Request() req) {
    const settings = await this.notificationRuleEngine.getUserNotificationSettings(req.user.id);
    return settings;
  }

  /**
   * ユーザーの通知設定を更新
   */
  @Put('settings')
  @ApiOperation({ summary: 'ユーザーの通知設定を更新' })
  @ApiResponse({ status: 200, description: '通知設定が正常に更新されました' })
  async updateUserNotificationSettings(
    @Body() updateSettingsDto: UpdateUserNotificationSettingsDto,
    @Request() req,
  ) {
    // TODO: UserNotificationSettingsServiceを実装して設定を更新
    return { message: '通知設定を更新しました' };
  }

  /**
   * 通知統計を取得
   */
  @Get('stats')
  @ApiOperation({ summary: '通知統計を取得' })
  @ApiResponse({ status: 200, description: '通知統計' })
  async getNotificationStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const stats = await this.realtimeNotificationService.getNotificationStats(start, end);
    return stats;
  }

  /**
   * 接続中のユーザー数を取得
   */
  @Get('connected-users')
  @ApiOperation({ summary: '接続中のユーザー数を取得' })
  @ApiResponse({ status: 200, description: '接続中のユーザー数' })
  async getConnectedUsersCount() {
    const count = this.realtimeNotificationService.getConnectedUsersCount();
    return { connectedUsers: count };
  }

  /**
   * ユーザーのオンライン状態を確認
   */
  @Get('online-status/:userId')
  @ApiOperation({ summary: 'ユーザーのオンライン状態を確認' })
  @ApiResponse({ status: 200, description: 'ユーザーのオンライン状態' })
  async getUserOnlineStatus(@Param('userId') userId: string) {
    const isOnline = this.realtimeNotificationService.isUserOnline(userId);
    return { userId, isOnline };
  }

  /**
   * Slack接続テスト
   */
  @Post('test/slack')
  @ApiOperation({ summary: 'Slack接続テスト' })
  @ApiResponse({ status: 200, description: 'Slack接続テスト結果' })
  async testSlackConnection() {
    const isConnected = await this.slackNotificationService.testConnection();
    return { service: 'Slack', connected: isConnected };
  }

  /**
   * Teams接続テスト
   */
  @Post('test/teams')
  @ApiOperation({ summary: 'Teams接続テスト' })
  @ApiResponse({ status: 200, description: 'Teams接続テスト結果' })
  async testTeamsConnection() {
    const isConnected = await this.teamsNotificationService.testConnection();
    return { service: 'Teams', connected: isConnected };
  }

  /**
   * Slackチャンネル一覧を取得
   */
  @Get('slack/channels')
  @ApiOperation({ summary: 'Slackチャンネル一覧を取得' })
  @ApiResponse({ status: 200, description: 'Slackチャンネル一覧' })
  async getSlackChannels() {
    try {
      const channels = await this.slackNotificationService.getChannels();
      return channels;
    } catch (error) {
      return { error: 'Slackチャンネルの取得に失敗しました' };
    }
  }

  /**
   * Slackユーザー情報を取得
   */
  @Get('slack/users/:userId')
  @ApiOperation({ summary: 'Slackユーザー情報を取得' })
  @ApiResponse({ status: 200, description: 'Slackユーザー情報' })
  async getSlackUserInfo(@Param('userId') userId: string) {
    try {
      const user = await this.slackNotificationService.getUserInfo(userId);
      return user;
    } catch (error) {
      return { error: 'Slackユーザー情報の取得に失敗しました' };
    }
  }

  /**
   * Teamsユーザー情報を取得
   */
  @Get('teams/users/:userId')
  @ApiOperation({ summary: 'Teamsユーザー情報を取得' })
  @ApiResponse({ status: 200, description: 'Teamsユーザー情報' })
  async getTeamsUserInfo(@Param('userId') userId: string) {
    try {
      const user = await this.teamsNotificationService.getUserInfo(userId);
      return user;
    } catch (error) {
      return { error: 'Teamsユーザー情報の取得に失敗しました' };
    }
  }
}