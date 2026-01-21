import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Member } from '../entities/member.entity';
import { SmsService } from './sms.service';
import { SmsTemplateService } from './sms-template.service';
import { SmsConfigService } from './sms.config';

@Injectable()
export class SmsRenewalService {
  private readonly logger = new Logger(SmsRenewalService.name);
  private readonly batchSize = 100;

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    private smsService: SmsService,
    private templateService: SmsTemplateService,
    private smsConfig: SmsConfigService,
  ) {}

  async findMembersExpiringSoon(days: number): Promise<Member[]> {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + days);

    const members = await this.memberRepository.find({
      where: {
        status: 'active',
        subscriptionStatus: 'active',
        subscriptionEndDate: Between(now, targetDate),
      },
      relations: ['service'],
    });

    this.logger.log(
      `Found ${members.length} members expiring within ${days} days`,
    );

    return members;
  }

  formatRenewalMessage(member: Member, template: string): string {
    const now = new Date();
    const expiryDate = new Date(member.subscriptionEndDate);
    const daysLeft = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    const variables: Record<string, string> = {
      memberName: member.fullName,
      expiryDate: expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      daysLeft: daysLeft.toString(),
      serviceName: member.service?.name || 'your service',
    };

    return this.templateService.renderTemplate(template, variables);
  }

  async sendRenewalReminders(days?: number): Promise<{
    success: number;
    failed: number;
    total: number;
  }> {
    const reminderDays = days || this.smsConfig.getRenewalReminderDays();
    this.logger.log(
      `Starting renewal reminder process for members expiring in ${reminderDays} days`,
    );

    const members = await this.findMembersExpiringSoon(reminderDays);

    if (members.length === 0) {
      this.logger.log('No members found expiring soon');
      return { success: 0, failed: 0, total: 0 };
    }

    const template = await this.templateService.getTemplate('renewal');

    if (!template) {
      this.logger.error('No renewal template found');
      throw new Error('Renewal template not found');
    }

    let success = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < members.length; i += this.batchSize) {
      const batch = members.slice(i, i + this.batchSize);
      this.logger.log(
        `Processing batch ${Math.floor(i / this.batchSize) + 1} of ${Math.ceil(members.length / this.batchSize)}`,
      );

      const recipients = batch.map((member) => {
        const message = this.formatRenewalMessage(member, template.content);
        return {
          phone: member.phoneNumber,
          message,
        };
      });

      // Send messages individually to track member IDs, but process in parallel
      const sendPromises = batch.map(async (member) => {
        try {
          const message = this.formatRenewalMessage(member, template.content);
          await this.smsService.sendSingle(member.phoneNumber, message, {
            memberId: member.id,
          });
          return { success: true, memberId: member.id };
        } catch (error) {
          this.logger.error(
            `Failed to send renewal reminder to member ${member.id}: ${error}`,
          );
          return { success: false, memberId: member.id };
        }
      });

      const results = await Promise.all(sendPromises);
      results.forEach((result) => {
        if (result.success) {
          success++;
        } else {
          failed++;
        }
      });
    }

    this.logger.log(
      `Renewal reminder process completed: ${success} successful, ${failed} failed out of ${members.length} total`,
    );

    return { success, failed, total: members.length };
  }

  @Cron('0 9 * * *')
  async handleScheduledRenewalReminders(): Promise<void> {
    this.logger.log('Running scheduled renewal reminder job');
    try {
      const result = await this.sendRenewalReminders();
      this.logger.log(
        `Scheduled renewal reminders completed: ${result.success} successful, ${result.failed} failed`,
      );
    } catch (error) {
      this.logger.error(
        `Scheduled renewal reminder job failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

