import { Controller, Get, Post, Patch, Body, Param, Query, Headers } from '@nestjs/common';
import { PatientIntakeService } from './patient-intake.service';
import { RejectIntakeDto, SubmitIntakeDto } from './patient-intake.dto';

@Controller('api/v1/patient-intake')
export class PatientIntakeController {
  constructor(private readonly intakeService: PatientIntakeService) {}

  @Post('submit')
  submit(@Body() body: SubmitIntakeDto, @Headers('x-tenant-id') tenantId: string) {
    return this.intakeService.submit(body, tenantId);
  }

  @Get()
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const p = page ?? 1;
    const ps = pageSize ?? 20;
    return this.intakeService.findAll(tenantId, { status, page: p, pageSize: ps });
  }

  @Get('stats')
  getStats(@Headers('x-tenant-id') tenantId: string) {
    return this.intakeService.getStats(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.intakeService.findOne(id, tenantId);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.intakeService.approve(id, tenantId, userId);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() body: RejectIntakeDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.intakeService.reject(id, body.reason, tenantId, userId);
  }
}
