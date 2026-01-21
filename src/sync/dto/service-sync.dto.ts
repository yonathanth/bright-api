import { IsNotEmpty, IsNumber, IsString, IsOptional, IsInt } from 'class-validator';

export class ServiceSyncDto {
  @IsNotEmpty()
  @IsInt()
  id: number; // localId from SQLite

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  period: number;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  maxUsageCount?: number | null;

  @IsNotEmpty()
  @IsString()
  usageType: string;

  @IsNotEmpty()
  @IsString()
  status: string;
}




