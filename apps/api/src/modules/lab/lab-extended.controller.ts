import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LabExtendedService } from './lab-extended.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateExternalLabConfigDto,
  CreateLabPanelDto,
  CreateOrderFromPanelDto,
  ImportFhirResultsDto,
} from './lab-extended.dto';

@ApiTags('Lab Extended')
@Controller('lab')
@UseGuards(JwtAuthGuard)
export class LabExtendedController {
  constructor(private readonly labExtendedService: LabExtendedService) {}

  // Lab Panels
  @Post('panels')
  @ApiOperation({ summary: 'Create a lab panel configuration' })
  async createLabPanel(@Body() data: CreateLabPanelDto, @Req() req: any) {
    return this.labExtendedService.createLabPanel(data, req.user.tenantId, req.user.id);
  }

  @Get('panels')
  @ApiOperation({ summary: 'List lab panels' })
  async findAllLabPanels(
    @Query('labName') labName: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.labExtendedService.findAllLabPanels(req.user.tenantId, { labName, page, pageSize });
  }

  @Post('panels/:id/order')
  @ApiOperation({ summary: 'Create lab orders from a panel' })
  async createOrderFromPanel(
    @Param('id') id: string,
    @Body() body: CreateOrderFromPanelDto,
    @Req() req: any,
  ) {
    return this.labExtendedService.createOrderFromPanel(id, body.patientId, body.staffId, req.user.tenantId, req.user.id);
  }

  // External Lab Integration
  @Post('external-config')
  @ApiOperation({ summary: 'Create external lab integration config (Quest, LabCorp)' })
  async createExternalLabConfig(@Body() data: CreateExternalLabConfigDto, @Req() req: any) {
    return this.labExtendedService.createExternalLabConfig(data, req.user.tenantId, req.user.id);
  }

  @Get('external-config')
  @ApiOperation({ summary: 'Get external lab integration configs' })
  async getExternalLabConfigs(@Req() req: any) {
    return this.labExtendedService.getExternalLabConfigs(req.user.tenantId);
  }

  @Post('external-config/:id/sync')
  @ApiOperation({ summary: 'Sync lab orders with external lab' })
  async syncLabOrders(@Param('id') id: string, @Req() req: any) {
    return this.labExtendedService.syncLabOrders(id, req.user.tenantId, req.user.id);
  }

  // HL7 FHIR Import
  @Post('fhir-import')
  @ApiOperation({ summary: 'Import lab results via HL7 FHIR' })
  async importFhirResults(@Body() data: ImportFhirResultsDto, @Req() req: any) {
    return this.labExtendedService.importFhirResults(data, req.user.tenantId, req.user.id);
  }

  @Get('fhir-import-logs')
  @ApiOperation({ summary: 'Get FHIR import logs' })
  async getFhirImportLogs(
    @Query('source') source: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.labExtendedService.getFhirImportLogs(req.user.tenantId, { source, page, pageSize });
  }
}
