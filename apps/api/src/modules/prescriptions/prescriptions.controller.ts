import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PrescriptionsService } from './prescriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePrescriptionDto, UpdatePrescriptionStatusDto } from './prescriptions.dto';

@ApiTags('Prescriptions')
@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Throttle({ strict: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a prescription' })
  async create(@Body() data: CreatePrescriptionDto, @Req() req: any) {
    return this.prescriptionsService.create(data, req.user.tenantId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List prescriptions' })
  async findAll(
    @Query('patientId') patientId: string,
    @Query('status') status: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.prescriptionsService.findAll(req.user.tenantId, { patientId, status, page, pageSize });
  }

  @Get('active/:patientId')
  @ApiOperation({ summary: 'Get active prescriptions for a patient' })
  async getActive(@Param('patientId') patientId: string, @Req() req: any) {
    return this.prescriptionsService.getActivePrescriptions(patientId, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prescription by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.prescriptionsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update prescription status' })
  async updateStatus(@Param('id') id: string, @Body() body: UpdatePrescriptionStatusDto, @Req() req: any) {
    return this.prescriptionsService.updateStatus(id, body.status, req.user.tenantId, req.user.id);
  }
}
