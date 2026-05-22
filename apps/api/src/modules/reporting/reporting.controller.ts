import { Controller, Get, Post, Param, Query, Body, UseGuards, Req, Res, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdhocReportDto, ExportReportDto } from './reporting.dto';

@ApiTags('Reporting')
@Controller('reporting')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  async getDashboard(@Req() req: any) {
    return this.reportingService.getDashboardKPIs(req.user.tenantId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  async getRevenue(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getRevenueReport(req.user.tenantId, startDate, endDate);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Get appointment analytics' })
  async getAppointments(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getAppointmentReport(req.user.tenantId, startDate, endDate);
  }

  @Get('demographics')
  @ApiOperation({ summary: 'Get patient demographics' })
  async getDemographics(@Req() req: any) {
    return this.reportingService.getPatientDemographics(req.user.tenantId);
  }

  @Get('lab')
  @ApiOperation({ summary: 'Get lab analytics' })
  async getLab(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getLabReport(req.user.tenantId, startDate, endDate);
  }

  @Get('clinical')
  @ApiOperation({ summary: 'Get clinical data (top conditions, allergies)' })
  async getClinical(@Req() req: any) {
    return this.reportingService.getClinicalReport(req.user.tenantId);
  }

  @Get('staff-performance')
  @ApiOperation({ summary: 'Get staff performance report' })
  async getStaffPerformance(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getStaffPerformanceReport(req.user.tenantId, startDate, endDate);
  }

  @Get('appointments/utilization')
  @ApiOperation({ summary: 'Get appointment utilization analytics' })
  async getAppointmentUtilization(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getAppointmentUtilizationReport(req.user.tenantId, startDate, endDate);
  }

  @Get('appointments/no-show-patterns')
  @ApiOperation({ summary: 'Get detailed no-show patterns' })
  async getNoShowPatterns(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getNoShowPatternsReport(req.user.tenantId, startDate, endDate);
  }

  @Get('population-health/chronic-prevalence')
  @ApiOperation({ summary: 'Get chronic disease prevalence analytics' })
  async getChronicPrevalence(@Req() req: any) {
    return this.reportingService.getChronicPrevalenceReport(req.user.tenantId);
  }

  @Get('referrals/conversion')
  @ApiOperation({ summary: 'Get referral conversion analytics' })
  async getReferralConversion(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getReferralConversionReport(req.user.tenantId, startDate, endDate);
  }

  @Get('referrals/wait-times')
  @ApiOperation({ summary: 'Get referral wait-time analytics' })
  async getReferralWaitTimes(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getReferralWaitTimesReport(req.user.tenantId, startDate, endDate);
  }

  @Get('referrals/top-referrers')
  @ApiOperation({ summary: 'Get top referrers analytics' })
  async getTopReferrers(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getTopReferrersReport(req.user.tenantId, startDate, endDate);
  }

  @Get('revenue/payer-mix')
  @ApiOperation({ summary: 'Get revenue payer mix analytics' })
  async getPayerMix(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getPayerMixReport(req.user.tenantId, startDate, endDate);
  }

  @Get('revenue/procedure-profitability')
  @ApiOperation({ summary: 'Get procedure profitability' })
  async getProcedureProfitability(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reportingService.getProcedureProfitabilityReport(req.user.tenantId, startDate, endDate);
  }

  @Post('adhoc')
  @ApiOperation({ summary: 'Build an ad-hoc report' })
  @HttpCode(200)
  async buildAdhocReport(@Body() config: AdhocReportDto, @Req() req: any) {
    return this.reportingService.buildAdhocReport(req.user.tenantId, config);
  }

  @Post('export/csv')
  @Throttle({ export: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Export report as CSV' })
  @HttpCode(200)
  async exportCSV(@Body() config: ExportReportDto, @Req() req: any, @Res() res: Response) {
    const csv = await this.reportingService.exportReportCSV(req.user.tenantId, config);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${config.entity}-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Post('export/json')
  @Throttle({ export: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Export report as JSON' })
  @HttpCode(200)
  async exportJSON(@Body() config: ExportReportDto, @Req() req: any) {
    return this.reportingService.exportReportJSON(req.user.tenantId, config);
  }

  @Post('export/pdf')
  @Throttle({ export: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Export report as HTML (printable as PDF)' })
  @HttpCode(200)
  async exportPDF(@Body() config: ExportReportDto, @Req() req: any, @Res() res: Response) {
    const { html, filename } = await this.reportingService.exportReportPDF(req.user.tenantId, config);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(html);
  }

  @Get('widgets')
  @ApiOperation({ summary: 'Get available dashboard widgets' })
  async getWidgets(@Req() req: any) {
    return this.reportingService.getCustomWidgets(req.user.tenantId);
  }

  @Get('widgets/:widgetId/data')
  @ApiOperation({ summary: 'Get data for a specific widget' })
  async getWidgetData(@Param('widgetId') widgetId: string, @Req() req: any) {
    return this.reportingService.getWidgetData(req.user.tenantId, widgetId);
  }
}
