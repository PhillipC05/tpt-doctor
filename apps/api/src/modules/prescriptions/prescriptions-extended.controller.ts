import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrescriptionsExtendedService } from './prescriptions-extended.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateDrugDto,
  CreateDrugInteractionDto,
  CreatePharmacyDto,
  LogControlledSubstanceDto,
  SendToPharmacyDto,
} from './prescriptions-extended.dto';

@ApiTags('Prescriptions Extended')
@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsExtendedController {
  constructor(private readonly prescriptionsExtendedService: PrescriptionsExtendedService) {}

  // ePrescribing
  @Post(':id/send-to-pharmacy')
  @ApiOperation({ summary: 'Send prescription to pharmacy via ePrescribing (Surescripts)' })
  async sendToPharmacy(@Param('id') id: string, @Body() data: SendToPharmacyDto, @Req() req: any) {
    return this.prescriptionsExtendedService.sendToPharmacy(id, data, req.user.tenantId, req.user.id);
  }

  @Get(':id/eprescribing-transactions')
  @ApiOperation({ summary: 'Get ePrescribing transactions for a prescription' })
  async getEPrescribingTransactions(@Param('id') id: string, @Req() req: any) {
    return this.prescriptionsExtendedService.getEPrescribingTransactions(id, req.user.tenantId);
  }

  // Drug Interaction Checker
  @Get('interactions/check/:patientId')
  @ApiOperation({ summary: 'Check drug interactions for a patient' })
  async checkDrugInteractions(@Param('patientId') patientId: string, @Req() req: any) {
    return this.prescriptionsExtendedService.checkDrugInteractions(patientId, req.user.tenantId);
  }

  @Get('interactions/check-drugs')
  @ApiOperation({ summary: 'Check interaction between two drugs' })
  async checkSingleDrugInteraction(
    @Query('drug1') drug1: string,
    @Query('drug2') drug2: string,
  ) {
    return this.prescriptionsExtendedService.checkSingleDrugInteraction(drug1, drug2);
  }

  @Post('interactions')
  @ApiOperation({ summary: 'Create a drug interaction record' })
  async createDrugInteraction(@Body() data: CreateDrugInteractionDto) {
    return this.prescriptionsExtendedService.createDrugInteraction(data);
  }

  @Get('interactions')
  @ApiOperation({ summary: 'List drug interactions' })
  async getDrugInteractions(
    @Query('severity') severity: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.prescriptionsExtendedService.getDrugInteractions({ severity, page, pageSize });
  }

  // Drug Database
  @Post('drugs')
  @ApiOperation({ summary: 'Add a drug to the database' })
  async createDrug(@Body() data: CreateDrugDto) {
    return this.prescriptionsExtendedService.createDrug(data);
  }

  @Get('drugs')
  @ApiOperation({ summary: 'List drugs in the database' })
  async findAllDrugs(
    @Query('search') search: string,
    @Query('isControlled') isControlled: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.prescriptionsExtendedService.findAllDrugs({
      search,
      isControlled: isControlled ? isControlled === 'true' : undefined,
      page, pageSize,
    });
  }

  // Controlled Substances
  @Post('controlled-substances/log')
  @ApiOperation({ summary: 'Log a controlled substance action (DEA compliance)' })
  async logControlledSubstance(@Body() data: LogControlledSubstanceDto, @Req() req: any) {
    return this.prescriptionsExtendedService.logControlledSubstance(data, req.user.tenantId, req.user.id);
  }

  @Get(':id/controlled-substances')
  @ApiOperation({ summary: 'Get controlled substance logs for a prescription' })
  async getControlledSubstanceLogs(@Param('id') id: string, @Req() req: any) {
    return this.prescriptionsExtendedService.getControlledSubstanceLogs(id, req.user.tenantId);
  }

  @Get('controlled-substances/report')
  @ApiOperation({ summary: 'Get controlled substance compliance report' })
  async getControlledSubstanceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('staffId') staffId: string,
    @Req() req: any,
  ) {
    return this.prescriptionsExtendedService.getControlledSubstanceReport(req.user.tenantId, { startDate, endDate, staffId });
  }

  // Pharmacy Directory
  @Post('pharmacies')
  @ApiOperation({ summary: 'Add a pharmacy to the directory' })
  async createPharmacy(@Body() data: CreatePharmacyDto) {
    return this.prescriptionsExtendedService.createPharmacy(data);
  }

  @Get('pharmacies')
  @ApiOperation({ summary: 'List pharmacies in the directory' })
  async findAllPharmacies(
    @Query('search') search: string,
    @Query('supportsEprescribing') supportsEprescribing: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.prescriptionsExtendedService.findAllPharmacies({
      search,
      supportsEprescribing: supportsEprescribing ? supportsEprescribing === 'true' : undefined,
      page, pageSize,
    });
  }
}
