export class SyncResultDto {
  successful: number[];
  failed: number[];
}

export class DetailedSyncResultsDto {
  services?: SyncResultDto;
  members?: SyncResultDto;
  attendance?: SyncResultDto;
  transactions?: SyncResultDto;
}

export class SyncResponseDto {
  success: boolean;
  membersSynced: number;
  attendanceSynced: number;
  transactionsSynced: number;
  servicesSynced: number;
  errors?: string[];
  timestamp: string;
  results?: DetailedSyncResultsDto;
}




