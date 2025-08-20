import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailNotificationData } from '../types';

@Injectable()
export class EmailNotificationService {
    private readonly logger = new Logger(EmailNotificationService.name);
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.initializeTransporter();
    }

    private initializeTransporter() {
        const smtpConfig = {
            host: this.configService.get<string>('SMTP_HOST', 'localhost'),
            port: this.configService.get<number>('SMTP_PORT', 587),
            secure: this.configService.get<boolean>('SMTP_SECURE', false),
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        };

        this.transporter = nodemailer.createTransport(smtpConfig);
        this.logger.log('Email transporter initialized');
    }

    async sendEmail(data: EmailNotificationData): Promise<void> {
        try {
            const mailOptions = {
                from: this.configService.get<string>('SMTP_FROM', 'noreply@example.com'),
                to: data.to.join(', '),
                subject: data.subject,
                text: data.content,
                html: data.html || this.convertTextToHtml(data.content),
                attachments: data.attachments?.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    contentType: att.contentType,
                })),
            };

            const result = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent successfully: ${result.messageId}`);
        } catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`, error.stack);
            throw error;
        }
    }

    async sendBulkEmails(emails: EmailNotificationData[]): Promise<void> {
        const promises = emails.map(email => this.sendEmail(email));
        await Promise.allSettled(promises);
    }

    private convertTextToHtml(text: string): string {
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            this.logger.log('SMTP connection verified successfully');
            return true;
        } catch (error) {
            this.logger.error(`SMTP connection verification failed: ${error.message}`);
            return false;
        }
    }
}