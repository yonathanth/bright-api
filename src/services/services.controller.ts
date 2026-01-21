import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { ServiceQueryDto } from './dto/service-query.dto';
import { ServiceResponseDto, ServiceStatsDto, ServiceWebDto } from './dto/service-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { Service } from '../entities/service.entity';

@ApiTags('services')
@Controller('api/services')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all services',
    description: 'Returns a paginated list of services with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of services',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(@Query() query: ServiceQueryDto): Promise<PaginatedResponseDto<ServiceWebDto>> {
    return this.servicesService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get service statistics',
    description: 'Returns aggregate statistics about services',
  })
  @ApiResponse({
    status: 200,
    description: 'Service statistics',
    type: ServiceStatsDto,
  })
  async getStats(): Promise<ServiceStatsDto> {
    return this.servicesService.getStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get service by ID',
    description: 'Returns a single service by its database ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Service found',
    type: ServiceWebDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ServiceWebDto> {
    const service = await this.servicesService.findOne(id);
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    return this.servicesService.transformToWebFormat(service);
  }
}









