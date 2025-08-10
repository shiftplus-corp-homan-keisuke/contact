import { IsString, IsArray, IsEnum, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  EMAIL = 'email',
  SLACK = 'slack',
  TEAMS = 'teams',
  WEBSOCKET = 'websocket',
  WEBHOOK = 'webhook',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationTrigger {
  INQUIRY_CREATED = 'inquiry_created',
  STATUS_CHANGED = 'status_changed',
  SLA_VIOLATION = 'sla_violation',
  ESCALATION = 'escalation',
  RESPONSE_ADDED = 'response_added',
}

/**
 * 通知送信リクエストDTO
 */
export class NotificationRequestDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: NotificationPriority })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 通知ルール作成DTO
 */
export class CreateNotificationRuleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: NotificationTrigger })
  @IsEnum(NotificationTrigger)
  trigger: NotificationTrigger;

  @ApiProperty()
  @IsObject()
  conditions: Record<string, any>;

  @ApiProperty()
  @IsObject()
  actions: Record<string, any>;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * 通知ルール更新DTO
 */
export class UpdateNotificationRuleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: NotificationTrigger, required: false })
  @IsOptional()
  @IsEnum(NotificationTrigger)
  trigger?: NotificationTrigger;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  actions?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * ユーザー通知設定更新DTO
 */
export class UpdateUserNotificationSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  slackEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  teamsEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  websocketEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slackUserId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  teamsUserId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}

/**
 * WebSocket通知メッセージDTO
 */
export class WebSocketNotificationDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty()
  timestamp: Date;
}