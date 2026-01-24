import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  DashboardOverviewDto,
  RevenueBreakdownDto,
  AttendanceTrendsDto,
  MemberGrowthDto,
} from './dto/dashboard-stats.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('dashboard')
@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard overview',
    description: 'Returns key metrics for the dashboard including members, revenue, and attendance',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview statistics',
    type: DashboardOverviewDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getOverview(): Promise<DashboardOverviewDto> {
    return this.dashboardService.getOverview();
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Get revenue breakdown',
    description: 'Returns detailed revenue statistics including trends and comparisons',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue breakdown',
    type: RevenueBreakdownDto,
  })
  async getRevenue(): Promise<RevenueBreakdownDto> {
    return this.dashboardService.getRevenue();
  }

  @Get('attendance-trends')
  @ApiOperation({
    summary: 'Get attendance trends',
    description: 'Returns attendance statistics and trends over time',
  })
  @ApiResponse({
    status: 200,
    description: 'Attendance trends',
    type: AttendanceTrendsDto,
  })
  async getAttendanceTrends(): Promise<AttendanceTrendsDto> {
    return this.dashboardService.getAttendanceTrends();
  }

  @Get('member-growth')
  @ApiOperation({
    summary: 'Get member growth',
    description: 'Returns member registration trends and growth statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Member growth statistics',
    type: MemberGrowthDto,
  })
  async getMemberGrowth(): Promise<MemberGrowthDto> {
    return this.dashboardService.getMemberGrowth();
  }
}















