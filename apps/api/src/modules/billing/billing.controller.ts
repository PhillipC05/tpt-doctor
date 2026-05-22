import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateClaimDto, CreateInvoiceDto, ProcessPaymentDto } from './billing.dto';

@ApiTags('Billing')
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('invoices')
  @Throttle({ strict: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create an invoice' })
  async createInvoice(@Body() data: CreateInvoiceDto, @Req() req: any) {
    return this.billingService.createInvoice(data, req.user.tenantId, req.user.id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  async findAllInvoices(
    @Query('patientId') patientId: string,
    @Query('status') status: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.billingService.findAllInvoices(req.user.tenantId, { patientId, status, page, pageSize });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findInvoice(@Param('id') id: string, @Req() req: any) {
    return this.billingService.findInvoice(id, req.user.tenantId);
  }

  @Post('payments')
  @Throttle({ strict: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Process a payment' })
  async processPayment(@Body() data: ProcessPaymentDto, @Req() req: any) {
    return this.billingService.processPayment(data, req.user.tenantId, req.user.id);
  }

  @Post('claims')
  @Throttle({ strict: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create an insurance claim' })
  async createClaim(@Body() data: CreateClaimDto, @Req() req: any) {
    return this.billingService.createClaim(data, req.user.tenantId, req.user.id);
  }

  @Get('claims')
  @ApiOperation({ summary: 'List claims' })
  async findAllClaims(
    @Query('status') status: string,
    @Query('patientId') patientId: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.billingService.findAllClaims(req.user.tenantId, { status, patientId, page, pageSize });
  }
}
