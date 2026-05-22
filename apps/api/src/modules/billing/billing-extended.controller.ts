import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingExtendedService } from './billing-extended.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateCptCodeDto,
  CreateHsaFsaDto,
  CreateIcd10CodeDto,
  CreateWriteOffDto,
  ProcessEraDto,
  ProcessPaymentWithProviderDto,
  ProcessRefundDto,
  RecordCopayDto,
  SubmitClaimDto,
  VerifyInsuranceDto,
} from './billing-extended.dto';

@ApiTags('Billing Extended')
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingExtendedController {
  constructor(private readonly billingExtendedService: BillingExtendedService) {}

  // CPT Codes
  @Post('cpt-codes')
  @ApiOperation({ summary: 'Create a CPT code' })
  async createCptCode(@Body() data: CreateCptCodeDto) {
    return this.billingExtendedService.createCptCode(data);
  }

  @Get('cpt-codes')
  @ApiOperation({ summary: 'List CPT codes' })
  async findAllCptCodes(
    @Query('category') category: string,
    @Query('search') search: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.billingExtendedService.findAllCptCodes({ category, search, page, pageSize });
  }

  // ICD-10 Codes
  @Post('icd10-codes')
  @ApiOperation({ summary: 'Create an ICD-10 code' })
  async createIcd10Code(@Body() data: CreateIcd10CodeDto) {
    return this.billingExtendedService.createIcd10Code(data);
  }

  @Get('icd10-codes')
  @ApiOperation({ summary: 'List ICD-10 codes' })
  async findAllIcd10Codes(
    @Query('category') category: string,
    @Query('search') search: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.billingExtendedService.findAllIcd10Codes({ category, search, page, pageSize });
  }

  // Insurance Verification
  @Post('insurance-verification')
  @ApiOperation({ summary: 'Verify insurance eligibility' })
  async verifyInsurance(@Body() data: VerifyInsuranceDto, @Req() req: any) {
    return this.billingExtendedService.verifyInsurance(data, req.user.tenantId, req.user.id);
  }

  @Get('insurance-verification/:patientId')
  @ApiOperation({ summary: 'Get insurance verifications for a patient' })
  async getInsuranceVerifications(@Param('patientId') patientId: string, @Req() req: any) {
    return this.billingExtendedService.getInsuranceVerifications(patientId, req.user.tenantId);
  }

  // Claim Submissions (837)
  @Post('claims/submit')
  @ApiOperation({ summary: 'Submit claim in 837 format' })
  async submitClaim(@Body() data: SubmitClaimDto, @Req() req: any) {
    return this.billingExtendedService.submitClaim(data, req.user.tenantId, req.user.id);
  }

  @Get('claims/:claimId/submissions')
  @ApiOperation({ summary: 'Get claim submissions' })
  async getClaimSubmissions(@Param('claimId') claimId: string, @Req() req: any) {
    return this.billingExtendedService.getClaimSubmissions(claimId, req.user.tenantId);
  }

  // ERA / EOB
  @Post('era')
  @ApiOperation({ summary: 'Process ERA/EOB record' })
  async processEra(@Body() data: ProcessEraDto, @Req() req: any) {
    return this.billingExtendedService.processEra(data, req.user.tenantId);
  }

  @Get('era/:claimId')
  @ApiOperation({ summary: 'Get ERA records for a claim' })
  async getEraRecords(@Param('claimId') claimId: string, @Req() req: any) {
    return this.billingExtendedService.getEraRecords(claimId, req.user.tenantId);
  }

  // Billing Statements
  @Post('statements/generate/:patientId')
  @ApiOperation({ summary: 'Generate billing statement for a patient' })
  async generateStatement(@Param('patientId') patientId: string, @Req() req: any) {
    return this.billingExtendedService.generateStatement(patientId, req.user.tenantId, req.user.id);
  }

  @Get('statements/:patientId')
  @ApiOperation({ summary: 'Get billing statements for a patient' })
  async getStatements(@Param('patientId') patientId: string, @Req() req: any) {
    return this.billingExtendedService.getStatements(patientId, req.user.tenantId);
  }

  // Stripe/Airwallex Payment Processing
  @Post('payments/provider')
  @ApiOperation({ summary: 'Process payment via provider (Stripe/Airwallex)' })
  async processPaymentWithProvider(@Body() data: ProcessPaymentWithProviderDto, @Req() req: any) {
    return this.billingExtendedService.processPaymentWithProvider(data, req.user.tenantId, req.user.id);
  }

  // Copay Tracking
  @Post('copay')
  @ApiOperation({ summary: 'Record a copay collection' })
  async recordCopay(@Body() data: RecordCopayDto, @Req() req: any) {
    return this.billingExtendedService.recordCopay(data, req.user.tenantId, req.user.id);
  }

  @Get('copay/:patientId')
  @ApiOperation({ summary: 'Get copay collection history' })
  async getCopayHistory(@Param('patientId') patientId: string, @Req() req: any) {
    return this.billingExtendedService.getCopayHistory(patientId, req.user.tenantId);
  }

  // HSA/FSA
  @Post('hsa-fsa')
  @ApiOperation({ summary: 'Create an HSA/FSA account' })
  async createHsaFsaAccount(@Body() data: CreateHsaFsaDto, @Req() req: any) {
    return this.billingExtendedService.createHsaFsaAccount(data, req.user.tenantId, req.user.id);
  }

  @Get('hsa-fsa/:patientId')
  @ApiOperation({ summary: 'Get HSA/FSA accounts for a patient' })
  async getHsaFsaAccounts(@Param('patientId') patientId: string, @Req() req: any) {
    return this.billingExtendedService.getHsaFsaAccounts(patientId, req.user.tenantId);
  }

  // Aging Reports
  @Post('aging-reports/generate')
  @ApiOperation({ summary: 'Generate accounts receivable aging report' })
  async generateAgingReport(@Req() req: any) {
    return this.billingExtendedService.generateAgingReport(req.user.tenantId, req.user.id);
  }

  @Get('aging-reports')
  @ApiOperation({ summary: 'Get aging reports' })
  async getAgingReports(@Req() req: any) {
    return this.billingExtendedService.getAgingReports(req.user.tenantId);
  }

  // Write-offs
  @Post('write-offs')
  @ApiOperation({ summary: 'Create a write-off' })
  async createWriteOff(@Body() data: CreateWriteOffDto, @Req() req: any) {
    return this.billingExtendedService.createWriteOff(data, req.user.tenantId, req.user.id);
  }

  @Get('write-offs')
  @ApiOperation({ summary: 'List write-offs' })
  async getWriteOffs(
    @Query('invoiceId') invoiceId: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.billingExtendedService.getWriteOffs(req.user.tenantId, { invoiceId, page, pageSize });
  }

  // Refunds
  @Post('refunds')
  @ApiOperation({ summary: 'Process a refund' })
  async processRefund(@Body() data: ProcessRefundDto, @Req() req: any) {
    return this.billingExtendedService.processRefund(data, req.user.tenantId, req.user.id);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'List refunds' })
  async getRefunds(
    @Query('invoiceId') invoiceId: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.billingExtendedService.getRefunds(req.user.tenantId, { invoiceId, page, pageSize });
  }
}
