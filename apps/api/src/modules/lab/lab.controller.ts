import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LabService } from './lab.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateLabOrderDto, UpdateLabResultDto, UpdateLabStatusDto } from './lab.dto';

@ApiTags('Lab')
@Controller('lab')
@UseGuards(JwtAuthGuard)
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Post('orders')
  @ApiOperation({ summary: 'Create a lab order' })
  async create(@Body() data: CreateLabOrderDto, @Req() req: any) {
    return this.labService.create(data, req.user.tenantId, req.user.id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List lab orders' })
  async findAll(
    @Query('patientId') patientId: string, @Query('status') status: string,
    @Query('page') page: number, @Query('pageSize') pageSize: number, @Req() req: any,
  ) {
    return this.labService.findAll(req.user.tenantId, { patientId, status, page, pageSize });
  }

  @Get('orders/pending')
  @ApiOperation({ summary: 'Get pending lab results' })
  async getPending(@Req() req: any) {
    return this.labService.getPendingResults(req.user.tenantId);
  }

  @Get('orders/abnormal')
  @ApiOperation({ summary: 'Get abnormal lab results' })
  async getAbnormal(@Req() req: any) {
    return this.labService.getAbnormalResults(req.user.tenantId);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get lab order by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.labService.findOne(id, req.user.tenantId);
  }

  @Patch('orders/:id/result')
  @ApiOperation({ summary: 'Update lab result' })
  async updateResult(@Param('id') id: string, @Body() data: UpdateLabResultDto, @Req() req: any) {
    return this.labService.updateResult(id, data, req.user.tenantId, req.user.id);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update lab order status' })
  async updateStatus(@Param('id') id: string, @Body() body: UpdateLabStatusDto, @Req() req: any) {
    return this.labService.updateStatus(id, body.status, req.user.tenantId);
  }
}
