import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SmsMessage } from '../entities/sms-message.entity';
import { SmsTemplate } from '../entities/sms-template.entity';
import { Member } from '../entities/member.entity';
import { SmsService } from './sms.service';
import { SmsTemplateService } from './sms-template.service';
import { SmsRenewalService } from './sms-renewal.service';
import { SmsController } from './sms.controller';
import { SmsConfigService } from './sms.config';
import { MembersModule } from '../members/members.module';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([SmsMessage, SmsTemplate, Member]),
    MembersModule,
  ],
  controllers: [SmsController],
  providers: [SmsService, SmsTemplateService, SmsRenewalService, SmsConfigService],
  exports: [SmsService, SmsRenewalService],
})
export class SmsModule implements OnModuleInit {
  private readonly logger = new Logger(SmsModule.name);

  constructor(
    @InjectRepository(SmsTemplate)
    private templateRepository: Repository<SmsTemplate>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  private async seedDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'Subscription Renewal Reminder',
        type: 'renewal',
        content:
          'Hi {memberName}, your subscription expires on {expiryDate}. Please renew to continue enjoying our services!',
        variables: {
          memberName: 'Member full name',
          expiryDate: 'Subscription expiry date',
          daysLeft: 'Days until expiry',
          serviceName: 'Service name',
        },
        isActive: true,
      },
      {
        name: 'General Notification',
        type: 'general',
        content: 'Hello {memberName}, {message}',
        variables: {
          memberName: 'Member full name',
          message: 'Custom message content',
        },
        isActive: true,
      },
      {
        name: 'Payment Confirmation',
        type: 'payment',
        content:
          'Hi {memberName}, thank you for your payment of {amount}. Your subscription is now active until {expiryDate}.',
        variables: {
          memberName: 'Member full name',
          amount: 'Payment amount',
          expiryDate: 'New subscription expiry date',
          serviceName: 'Service name',
        },
        isActive: true,
      },
    ];

    for (const templateData of defaultTemplates) {
      const existing = await this.templateRepository.findOne({
        where: { name: templateData.name, type: templateData.type },
      });

      if (!existing) {
        await this.templateRepository.save(templateData);
        this.logger.log(
          `Seeded default template: ${templateData.name} (${templateData.type})`,
        );
      }
    }
  }
}

