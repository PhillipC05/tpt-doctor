import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto, UpdateReferralDto, UpdateReferralStatusDto } from './referrals.dto';

@Controller('api/v1/referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  create(@Body() body: CreateReferralDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.referralsService.create(body, tenantId, userId);
  }

  @Get()
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('referralType') referralType?: string,
    @Query('priority') priority?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const p = page ?? 1;
    const ps = pageSize ?? 20;
    return this.referralsService.findAll(tenantId, { patientId, status, referralType, priority, page: p, pageSize: ps });
  }

  @Get('stats')
  getStats(@Headers('x-tenant-id') tenantId: string) {
    return this.referralsService.getStats(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.referralsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateReferralDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.referralsService.update(id, body, tenantId, userId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateReferralStatusDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.referralsService.updateStatus(id, body.status, body, tenantId, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.referralsService.delete(id, tenantId, userId);
  }
}
