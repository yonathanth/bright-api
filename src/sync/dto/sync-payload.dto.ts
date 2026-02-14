import {
  IsNotEmpty,
  IsArray,
  IsDateString,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceSyncDto } from './service-sync.dto';
import { MemberSyncDto } from './member-sync.dto';
import { AttendanceSyncDto } from './attendance-sync.dto';
import { TransactionSyncDto } from './transaction-sync.dto';
import { HealthMetricSyncDto } from './health-metric-sync.dto';
import { StaffSyncDto } from './staff-sync.dto';
import { StaffAttendanceSyncDto } from './staff-attendance-sync.dto';

export class SyncPayloadDto {
  @IsNotEmpty()
  @IsDateString()
  timestamp: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceSyncDto)
  services: ServiceSyncDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberSyncDto)
  members: MemberSyncDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceSyncDto)
  attendance: AttendanceSyncDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionSyncDto)
  transactions: TransactionSyncDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HealthMetricSyncDto)
  healthMetrics: HealthMetricSyncDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffSyncDto)
  staff?: StaffSyncDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffAttendanceSyncDto)
  staffAttendance?: StaffAttendanceSyncDto[];
}




