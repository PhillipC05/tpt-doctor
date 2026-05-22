// ============================================================================
// TPT Doctor — Country Profiles Controller (Phase 11)
// ============================================================================

import { Controller, Get, Post, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { CountryProfilesService } from './country-profiles.service';
import { AuService } from './services/au/au.service';
import { NzService } from './services/nz/nz.service';
import { UkService } from './services/uk/uk.service';
import { CaService } from './services/ca/ca.service';
import {
  ConfigureProfileDto,
  SubmitMbsClaimDto,
  SubmitPbsPrescriptionDto,
  SubmitMyHealthRecordDocumentDto,
  SubmitAirRecordDto,
  GeneratePipReportDto,
  SubmitNzClaimDto,
  GeneratePhoReportDto,
  ValidateNhiDto,
  CreateGp2GpTransferDto,
  GenerateQofReportDto,
  CreateGpConnectInteractionDto,
  CreateSpineInteractionDto,
  SubmitEpsPrescriptionDto,
  SubmitCaClaimDto,
  SubmitCaImmunisationDto,
  CreateInfowayInteractionDto,
} from './country-profiles.dto';

@Controller('api/v1/countries')
export class CountryProfilesController {
  constructor(
    private readonly profilesService: CountryProfilesService,
    private readonly auService: AuService,
    private readonly nzService: NzService,
    private readonly ukService: UkService,
    private readonly caService: CaService,
  ) {}

  // ======================================================================
  // Profile Configuration
  // ======================================================================

  @Get('profiles/defaults')
  getDefaultProfiles() {
    return ['AU', 'NZ', 'US', 'UK', 'CA'].map(cc => this.profilesService.getDefaultProfile(cc));
  }

  @Get('profiles/default/:countryCode')
  getDefaultProfile(@Param('countryCode') countryCode: string) {
    return this.profilesService.getDefaultProfile(countryCode.toUpperCase());
  }

  @Post('profiles')
  configureProfile(@Body() body: ConfigureProfileDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.profilesService.configureProfile(body, tenantId, userId);
  }

  @Get('profiles')
  getProfiles(@Headers('x-tenant-id') tenantId: string) {
    return this.profilesService.getAllProfiles(tenantId);
  }

  @Get('profiles/:countryCode')
  getProfile(@Param('countryCode') countryCode: string, @Headers('x-tenant-id') tenantId: string) {
    return this.profilesService.getProfile(tenantId, countryCode.toUpperCase());
  }

  @Delete('profiles/:id')
  deleteProfile(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.profilesService.deleteProfile(id, tenantId, userId);
  }

  // ======================================================================
  // AU — Australia (Medicare, PBS, My Health Record, AIR, PIP)
  // ======================================================================

  // --- MBS Claims ---
  @Post('au/claims/mbs')
  submitMbsClaim(@Body() body: SubmitMbsClaimDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.auService.submitMbsClaim(body, tenantId, userId);
  }

  @Get('au/claims/mbs')
  listMbsClaims(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auService.listMbsClaims(tenantId, patientId, status, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Get('au/claims/mbs/:id')
  getMbsClaim(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.auService.getMbsClaim(id, tenantId);
  }

  @Get('au/mbs-items')
  listMbsItems(@Query('itemType') itemType?: string, @Query('search') search?: string) {
    return this.auService.listMbsItems(itemType, search);
  }

  // --- PBS Prescriptions ---
  @Post('au/prescriptions/pbs')
  submitPbsPrescription(@Body() body: SubmitPbsPrescriptionDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.auService.submitPbsPrescription(body, tenantId, userId);
  }

  @Get('au/prescriptions/pbs')
  listPbsPrescriptions(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auService.listPbsPrescriptions(tenantId, patientId, status, Number(page ?? 1), Number(pageSize ?? 20));
  }

  // --- My Health Record ---
  @Post('au/my-health-record/documents')
  submitMyHealthRecordDocument(@Body() body: SubmitMyHealthRecordDocumentDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.auService.submitMyHealthRecordDocument(body, tenantId, userId);
  }

  @Get('au/my-health-record/documents')
  listMyHealthRecordDocuments(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auService.listMyHealthRecordDocuments(tenantId, patientId, status, Number(page ?? 1), Number(pageSize ?? 20));
  }

  // --- AIR (Australian Immunisation Register) ---
  @Post('au/immunisations')
  submitAirRecord(@Body() body: SubmitAirRecordDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.auService.submitAirRecord(body, tenantId, userId);
  }

  @Get('au/immunisations')
  listAirRecords(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auService.listAirRecords(tenantId, patientId, status, Number(page ?? 1), Number(pageSize ?? 20));
  }

  // --- PIP Reports ---
  @Get('au/reports/pip')
  getPipReports(
    @Headers('x-tenant-id') tenantId: string,
    @Query('reportPeriod') reportPeriod?: string,
  ) {
    return this.auService.getPipReports(tenantId, reportPeriod);
  }

  @Post('au/reports/pip/generate')
  generatePipReport(@Body() body: GeneratePipReportDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.auService.generatePipReport(body, tenantId, userId);
  }

  // ======================================================================
  // NZ — New Zealand (MOH, PHO, Immunisation, NHI)
  // ======================================================================

  @Post('nz/claims')
  submitNzClaim(@Body() body: SubmitNzClaimDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.nzService.submitClaim(body, tenantId, userId);
  }

  @Get('nz/claims')
  listNzClaims(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.nzService.listClaims(tenantId, patientId, status, page ?? 1, pageSize ?? 20);
  }

  @Get('nz/claims/:id')
  getNzClaim(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.nzService.getClaim(id, tenantId);
  }

  // --- PHO Reports ---
  @Get('nz/reports/pho')
  getPhoReports(
    @Headers('x-tenant-id') tenantId: string,
    @Query('reportPeriod') reportPeriod?: string,
  ) {
    return this.nzService.getPhoReports(tenantId, reportPeriod);
  }

  @Post('nz/reports/pho/generate')
  generatePhoReport(@Body() body: GeneratePhoReportDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.nzService.generatePhoReport(body, tenantId, userId);
  }

  // --- Immunisations (CIR) ---
  @Post('nz/immunisations')
  submitNzImmunisation(@Body() body: SubmitAirRecordDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.nzService.submitImmunisation(body, tenantId, userId);
  }

  @Get('nz/immunisations')
  listNzImmunisations(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.nzService.listImmunisations(tenantId, patientId, status, page ?? 1, pageSize ?? 20);
  }

  // --- NHI Validation ---
  @Post('nz/nhi/validate')
  validateNhi(@Body() body: ValidateNhiDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.nzService.validateNhi(body, tenantId, userId);
  }

  @Get('nz/nhi/logs')
  getNhiValidationLogs(
    @Headers('x-tenant-id') tenantId: string,
    @Query('nhiNumber') nhiNumber?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.nzService.getNhiValidationLogs(tenantId, nhiNumber, page ?? 1, pageSize ?? 20);
  }

  // ======================================================================
  // UK — United Kingdom (GP2GP, QOF, GP Connect, Spine, EPS)
  // ======================================================================

  // --- GP2GP ---
  @Post('uk/gp2gp')
  createGp2GpTransfer(@Body() body: CreateGp2GpTransferDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.ukService.createGp2GpTransfer(body, tenantId, userId);
  }

  @Get('uk/gp2gp')
  listGp2GpTransfers(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.ukService.listGp2GpTransfers(tenantId, status, page ?? 1, pageSize ?? 20);
  }

  // --- QOF ---
  @Get('uk/reports/qof')
  getQofReports(
    @Headers('x-tenant-id') tenantId: string,
    @Query('reportPeriod') reportPeriod?: string,
  ) {
    return this.ukService.getQofReports(tenantId, reportPeriod);
  }

  @Post('uk/reports/qof/generate')
  generateQofReport(@Body() body: GenerateQofReportDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.ukService.generateQofReport(body, tenantId, userId);
  }

  // --- GP Connect ---
  @Post('uk/gp-connect')
  createGpConnectInteraction(@Body() body: CreateGpConnectInteractionDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.ukService.createGpConnectInteraction(body, tenantId, userId);
  }

  // --- Spine (PDS, SCR) ---
  @Post('uk/spine')
  createSpineInteraction(@Body() body: CreateSpineInteractionDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.ukService.createSpineInteraction(body, tenantId, userId);
  }

  // --- EPS ---
  @Post('uk/prescriptions/eps')
  submitEpsPrescription(@Body() body: SubmitEpsPrescriptionDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.ukService.submitEpsPrescription(body, tenantId, userId);
  }

  @Get('uk/prescriptions/eps')
  listEpsPrescriptions(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.ukService.listEpsPrescriptions(tenantId, status, page ?? 1, pageSize ?? 20);
  }

  // ======================================================================
  // CA — Canada (Provincial Claims, Drug DB, Immunisation, Infoway)
  // ======================================================================

  // --- Provincial Claims ---
  @Post('ca/claims')
  submitCaClaim(@Body() body: SubmitCaClaimDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.caService.submitClaim(body, tenantId, userId);
  }

  @Get('ca/claims')
  listCaClaims(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('healthPlan') healthPlan?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.caService.listClaims(tenantId, patientId, healthPlan, status, page ?? 1, pageSize ?? 20);
  }

  // --- Drug Database ---
  @Get('ca/drug-database')
  searchDrugDatabase(
    @Query('din') din?: string,
    @Query('brandName') brandName?: string,
    @Query('genericName') genericName?: string,
    @Query('province') province?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.caService.searchDrugDatabase(din, brandName, genericName, province, page ?? 1, pageSize ?? 20);
  }

  @Get('ca/drug-database/:din')
  lookupDrugByDin(@Param('din') din: string) {
    return this.caService.lookupDrugByDin(din);
  }

  // --- Immunisations ---
  @Post('ca/immunisations')
  submitCaImmunisation(@Body() body: SubmitCaImmunisationDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.caService.submitImmunisation(body, tenantId, userId);
  }

  @Get('ca/immunisations')
  listCaImmunisations(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.caService.listImmunisations(tenantId, patientId, status, page ?? 1, pageSize ?? 20);
  }

  // --- Infoway ---
  @Post('ca/infoway')
  createInfowayInteraction(@Body() body: CreateInfowayInteractionDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.caService.createInfowayInteraction(body, tenantId, userId);
  }

  @Get('ca/infoway')
  listInfowayInteractions(
    @Headers('x-tenant-id') tenantId: string,
    @Query('interactionType') interactionType?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.caService.listInfowayInteractions(tenantId, interactionType, page ?? 1, pageSize ?? 20);
  }
}