import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { Service } from '../entities/service.entity';
import { Member } from '../entities/member.entity';
import { Attendance } from '../entities/attendance.entity';
import { Transaction } from '../entities/transaction.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { HealthMetric } from '../entities/health-metric.entity';
import { Staff } from '../entities/staff.entity';
import { StaffAttendance } from '../entities/staff-attendance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service, Member, Attendance, Transaction, PaymentMethod, HealthMetric, Staff, StaffAttendance]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}




