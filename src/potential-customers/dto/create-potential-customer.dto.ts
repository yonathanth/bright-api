import { IsNotEmpty, IsString, IsEmail, IsOptional, MaxLength, IsNumber, IsInt } from 'class-validator';

export class CreatePotentialCustomerDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  fullName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  serviceId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

