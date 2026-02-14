import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffAttendance } from '../entities/staff-attendance.entity';

@ApiTags('staff-attendance')
@Controller('api/staff-attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class StaffAttendanceController {
  constructor(private readonly staffService: StaffService) {}

  @Get('by-date')
  @ApiOperation({
    summary: 'Get staff attendance by date',
    description: 'Returns all staff check-ins for a given date (daily log)',
  })
  @ApiQuery({ name: 'date', description: 'Date (YYYY-MM-DD)', example: '2026-02-14' })
  @ApiResponse({ status: 200, description: 'Staff attendance for the date' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getByDate(@Query('date') date: string): Promise<StaffAttendance[]> {
    const dateStr = date || new Date().toISOString().slice(0, 10);
    return this.staffService.findByDate(dateStr);
  }
}
