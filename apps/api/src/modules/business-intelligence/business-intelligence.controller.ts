import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { CreateSavedReportDto, UpdateSavedReportDto } from './business-intelligence.dto';

@Controller('analytics')
export class BusinessIntelligenceController {
  constructor(private readonly biService: BusinessIntelligenceService) {}

  @Get('revenue')
  async getRevenueAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.biService.getRevenueAnalytics(tenantId, periodStart, periodEnd);
  }

  @Get('appointments')
  async getAppointmentUtilization(
    @Query('tenantId') tenantId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.biService.getAppointmentUtilization(tenantId, periodStart, periodEnd);
  }

  @Get('productivity')
  async getClinicianProductivity(
    @Query('tenantId') tenantId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.biService.getClinicianProductivity(tenantId, periodStart, periodEnd);
  }

  @Get('demographics')
  async getPatientDemographics(@Query('tenantId') tenantId: string) {
    return this.biService.getPatientDemographics(tenantId);
  }

  @Get('referrals')
  async getReferralAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.biService.getReferralAnalytics(tenantId, periodStart, periodEnd);
  }

  @Post('reports')
  async createSavedReport(@Body() body: CreateSavedReportDto) {
    return this.biService.createSavedReport(body.tenantId, body);
  }

  @Get('reports')
  async getSavedReports(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.biService.getSavedReports(tenantId, category);
  }

  @Put('reports/:id')
  async updateSavedReport(@Param('id') id: string, @Body() body: UpdateSavedReportDto) {
    return this.biService.updateSavedReport(id, body.tenantId!, body);
  }

  @Delete('reports/:id')
  async deleteSavedReport(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.biService.deleteSavedReport(id, tenantId);
  }

  @Post('reports/:id/execute')
  async executeSavedReport(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.biService.executeSavedReport(id, tenantId);
  }
}
