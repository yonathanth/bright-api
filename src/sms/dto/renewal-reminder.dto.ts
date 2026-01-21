import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RenewalReminderDto {
  @ApiPropertyOptional({
    description: 'Number of days before expiry to send reminders (defaults to configured value)',
    example: 3,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;
}


