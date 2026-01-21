import {
  IsNotEmpty,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceSyncDto } from './service-sync.dto';
import { MemberSyncDto } from './member-sync.dto';
import { AttendanceSyncDto } from './attendance-sync.dto';
import { TransactionSyncDto } from './transaction-sync.dto';
import { HealthMetricSyncDto } from './health-metric-sync.dto';

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
}




