import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApproveTimeOffDto,
  CreateCredentialDto,
  CreateStaffDto,
  CreateTimeOffDto,
  SetScheduleDto,
  UpdateCredentialDto,
  UpdateStaffDto,
} from './staff.dto';

@ApiTags('Staff')
@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Create a staff member' })
  async create(@Body() data: CreateStaffDto, @Req() req: any) {
    return this.staffService.create(data, req.user.tenantId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all staff' })
  async findAll(
    @Query('role') role: string,
    @Query('isActive') isActive: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.staffService.findAll(req.user.tenantId, {
      role,
      isActive: isActive ? isActive === 'true' : undefined,
      page, pageSize,
    });
  }

  @Get('doctors')
  @ApiOperation({ summary: 'Get all active doctors' })
  async getDoctors(@Req() req: any) {
    return this.staffService.getDoctors(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.staffService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update staff member' })
  async update(@Param('id') id: string, @Body() data: UpdateStaffDto, @Req() req: any) {
    return this.staffService.update(id, data, req.user.tenantId, req.user.id);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Set staff schedule' })
  async setSchedule(@Param('id') id: string, @Body() body: SetScheduleDto, @Req() req: any) {
    return this.staffService.setSchedule(id, req.user.tenantId, body.schedule);
  }

  // ===== PTO / Leave Management =====
  @Post('time-off')
  @ApiOperation({ summary: 'Create time off request' })
  async createTimeOff(@Body() data: CreateTimeOffDto, @Req() req: any) {
    return this.staffService.createTimeOff(data, req.user.tenantId, req.user.id);
  }

  @Get('time-off')
  @ApiOperation({ summary: 'Get time off requests' })
  async getTimeOffRequests(
    @Query('staffId') staffId: string,
    @Query('status') status: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.staffService.getTimeOffRequests(req.user.tenantId, { staffId, status, startDate, endDate, page, pageSize });
  }

  @Patch('time-off/:id/approve')
  @ApiOperation({ summary: 'Approve or deny time off request' })
  async approveTimeOff(@Param('id') id: string, @Body() data: ApproveTimeOffDto, @Req() req: any) {
    return this.staffService.approveTimeOff(id, data, req.user.tenantId, req.user.id);
  }

  // ===== Credentialing =====
  @Post('credentials')
  @ApiOperation({ summary: 'Add a credential' })
  async createCredential(@Body() data: CreateCredentialDto, @Req() req: any) {
    return this.staffService.createCredential(data, req.user.tenantId, req.user.id);
  }

  @Get('credentials')
  @ApiOperation({ summary: 'Get credentials' })
  async getCredentials(
    @Query('staffId') staffId: string,
    @Query('status') status: string,
    @Query('expiringSoon') expiringSoon: string,
    @Req() req: any,
  ) {
    return this.staffService.getCredentials(req.user.tenantId, {
      staffId, status, expiringSoon: expiringSoon === 'true',
    });
  }

  @Patch('credentials/:id')
  @ApiOperation({ summary: 'Update a credential' })
  async updateCredential(@Param('id') id: string, @Body() data: UpdateCredentialDto, @Req() req: any) {
    return this.staffService.updateCredential(id, data, req.user.tenantId, req.user.id);
  }

  // ===== Performance Metrics =====
  @Get('metrics/performance')
  @ApiOperation({ summary: 'Get staff performance metrics' })
  async getPerformanceMetrics(
    @Query('staffId') staffId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @Req() req: any,
  ) {
    return this.staffService.getPerformanceMetrics(req.user.tenantId, {
      staffId, periodStart, periodEnd,
    });
  }
}
