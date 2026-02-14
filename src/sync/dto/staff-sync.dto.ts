import { IsNotEmpty, IsInt, IsString, IsOptional } from 'class-validator';

export class StaffSyncDto {
  @IsNotEmpty()
  @IsInt()
  id: number; // localId from desktop

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @IsOptional()
  @IsString()
  role?: string | null;
}
