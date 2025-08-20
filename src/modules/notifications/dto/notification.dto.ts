import { IsString, IsArray, IsEnum, IsOptional, IsBoolean, IsUUID, ValidateNested, IsUrl, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationTrigger, NotificationCondition, NotificationAction } from '../entities';

export class CreateNotificationRuleDto {
    @ApiProperty({ description: '通知ルール名' })
    @IsString()
    name: string;

    @ApiProperty({ enum: ['inquiry_created', 'status_changed', 'response_added', 'sla_violation', 'escalation'] })
    @IsEnum(['inquiry_created', 'status_changed', 'response_added', 'sla_violation', 'escalation'])
    trigger: NotificationTrigger;

    @ApiProperty({ description: '通知条件', type: 'array' })
    @IsArray()
    conditions: NotificationCondition[];

    @ApiProperty({ description: '通知アクション', type: 'array' })
    @IsArray()
    actions: NotificationAction[];

    @ApiPropertyOptional({ description: 'ルールの有効/無効', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateNotificationRuleDto {
    @ApiPropertyOptional({ description: '通知ルール名' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ enum: ['inquiry_created', 'status_changed', 'response_added', 'sla_violation', 'escalation'] })
    @IsOptional()
    @IsEnum(['inquiry_created', 'status_changed', 'response_added', 'sla_violation', 'escalation'])
    trigger?: NotificationTrigger;

    @ApiPropertyOptional({ description: '通知条件', type: 'array' })
    @IsOptional()
    @IsArray()
    conditions?: NotificationCondition[];

    @ApiPropertyOptional({ description: '通知アクション', type: 'array' })
    @IsOptional()
    @IsArray()
    actions?: NotificationAction[];

    @ApiPropertyOptional({ description: 'ルールの有効/無効' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class SendNotificationDto {
    @ApiProperty({ enum: ['email', 'slack', 'teams', 'webhook'] })
    @IsEnum(['email', 'slack', 'teams', 'webhook'])
    type: NotificationChannel;

    @ApiProperty({ description: '受信者リスト', type: [String] })
    @IsArray()
    @IsString({ each: true })
    recipients: string[];

    @ApiProperty({ description: '件名' })
    @IsString()
    subject: string;

    @ApiProperty({ description: '内容' })
    @IsString()
    content: string;

    @ApiProperty({ enum: ['low', 'medium', 'high', 'urgent'] })
    @IsEnum(['low', 'medium', 'high', 'urgent'])
    priority: 'low' | 'medium' | 'high' | 'urgent';

    @ApiPropertyOptional({ description: 'メタデータ' })
    @IsOptional()
    metadata?: Record<string, any>;
}

export class NotificationChannelSettingsDto {
    @ApiProperty({ enum: ['inquiry_created', 'status_changed', 'response_added', 'sla_violation', 'escalation'] })
    @IsEnum(['inquiry_created', 'status_changed', 'response_added', 'sla_violation', 'escalation'])
    trigger: NotificationTrigger;

    @ApiProperty({ enum: ['email', 'slack', 'teams', 'webhook'] })
    @IsEnum(['email', 'slack', 'teams', 'webhook'])
    channel: NotificationChannel;

    @ApiProperty({ description: '有効/無効' })
    @IsBoolean()
    isEnabled: boolean;

    @ApiPropertyOptional({ description: 'メールアドレス' })
    @IsOptional()
    @IsEmail()
    emailAddress?: string;

    @ApiPropertyOptional({ description: 'Slack Webhook URL' })
    @IsOptional()
    @IsUrl()
    slackWebhookUrl?: string;

    @ApiPropertyOptional({ description: 'Teams Webhook URL' })
    @IsOptional()
    @IsUrl()
    teamsWebhookUrl?: string;

    @ApiPropertyOptional({ description: 'カスタム Webhook URL' })
    @IsOptional()
    @IsUrl()
    webhookUrl?: string;
}

export class UpdateUserNotificationSettingsDto {
    @ApiProperty({ description: '通知設定', type: [NotificationChannelSettingsDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NotificationChannelSettingsDto)
    settings: NotificationChannelSettingsDto[];
}

export class NotificationRuleResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    trigger: NotificationTrigger;

    @ApiProperty()
    conditions: NotificationCondition[];

    @ApiProperty()
    actions: NotificationAction[];

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    createdBy: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class NotificationLogResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    channel: NotificationChannel;

    @ApiProperty()
    recipient: string;

    @ApiProperty()
    subject: string;

    @ApiProperty()
    status: string;

    @ApiProperty()
    sentAt?: Date;

    @ApiProperty()
    createdAt: Date;
}