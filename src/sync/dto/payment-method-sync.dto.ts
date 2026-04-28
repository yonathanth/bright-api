import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class PaymentMethodSyncDto {
  @IsInt()
  id: number;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsBoolean()
  isActive: boolean;
}
