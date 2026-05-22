import { Controller, Get, Post, Param, Body, Headers, Query } from '@nestjs/common';
import { ImmunisationsService } from './immunisations.service';
import { RecordAdministrationDto, RecordAdverseEventDto, RecordColdChainBreachDto } from './immunisations.dto';

@Controller('api/v1/immunisations')
export class ImmunisationsController {
  constructor(private readonly immunisationsService: ImmunisationsService) {}

  @Get('schedule')
  async getSchedule(@Query('countryCode') countryCode: string = 'AU', @Query('ageMonths') ageMonths?: string) {
    return this.immunisationsService.getSchedule(countryCode, ageMonths ? parseInt(ageMonths, 10) : undefined);
  }

  @Get('due/:patientId')
  async getDueVaccinations(
    @Param('patientId') patientId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Query('countryCode') countryCode: string = 'AU',
  ) {
    return this.immunisationsService.getDueVaccinations(patientId, tenantId, countryCode);
  }

  @Post('administer')
  async recordAdministration(
    @Body() body: RecordAdministrationDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.immunisationsService.recordAdministration(body, tenantId, userId);
  }

  @Get('patient/:patientId')
  async getPatientImmunisations(
    @Param('patientId') patientId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.immunisationsService.getImmunisationHistory(patientId, tenantId);
  }

  @Post(':id/adverse-event')
  async recordAdverseEvent(
    @Param('id') id: string,
    @Body() body: RecordAdverseEventDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.immunisationsService.recordAdverseEvent(id, body, tenantId, userId);
  }

  @Get('alerts')
  async getDueOverdueAlerts(
    @Headers('x-tenant-id') tenantId: string,
    @Query('countryCode') countryCode: string = 'AU',
  ) {
    return this.immunisationsService.getDueOverdueAlerts(tenantId, countryCode);
  }

  @Post('sync-registry')
  async syncToRegistry(
    @Headers('x-tenant-id') tenantId: string,
    @Query('countryCode') countryCode: string = 'AU',
  ) {
    return this.immunisationsService.syncToRegistry(tenantId, countryCode);
  }

  @Post('cold-chain-breach')
  async recordColdChainBreach(
    @Body() body: RecordColdChainBreachDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.immunisationsService.recordColdChainBreach(body, tenantId, userId);
  }
}
