import { Controller, Get, Post, Patch, Body, Param, Query, Headers } from '@nestjs/common';
import { MedicalCertificatesService } from './medical-certificates.service';
import { CreateMedicalCertificateDto, UpdateMedicalCertificateDto, VoidCertificateDto } from './medical-certificates.dto';

@Controller('api/v1/medical-certificates')
export class MedicalCertificatesController {
  constructor(private readonly certificatesService: MedicalCertificatesService) {}

  @Post()
  create(@Body() body: CreateMedicalCertificateDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.certificatesService.create(body, tenantId, userId);
  }

  @Get()
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('certificateType') certificateType?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const p = page ?? 1;
    const ps = pageSize ?? 20;
    return this.certificatesService.findAll(tenantId, { patientId, certificateType, status, page: p, pageSize: ps });
  }

  @Get('stats')
  getStats(@Headers('x-tenant-id') tenantId: string) {
    return this.certificatesService.getStats(tenantId);
  }

  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certificatesService.verify(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.certificatesService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateMedicalCertificateDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.certificatesService.update(id, body, tenantId, userId);
  }

  @Patch(':id/issue')
  issue(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.certificatesService.issue(id, tenantId, userId);
  }

  @Patch(':id/void')
  voidCertificate(@Param('id') id: string, @Body() body: VoidCertificateDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.certificatesService.void(id, body.reason, tenantId, userId);
  }
}
