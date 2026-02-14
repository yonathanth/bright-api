export class SyncResultDto {
  successful: number[];
  failed: number[];
}

export class DetailedSyncResultsDto {
  services?: SyncResultDto;
  members?: SyncResultDto;
  attendance?: SyncResultDto;
  transactions?: SyncResultDto;
  healthMetrics?: SyncResultDto;
  staff?: SyncResultDto;
  staffAttendance?: SyncResultDto;
}

export class SyncResponseDto {
  success: boolean;
  membersSynced: number;
  attendanceSynced: number;
  transactionsSynced: number;
  servicesSynced: number;
  healthMetricsSynced: number;
  staffSynced: number;
  staffAttendanceSynced: number;
  errors?: string[];
  timestamp: string;
  results?: DetailedSyncResultsDto;
}




