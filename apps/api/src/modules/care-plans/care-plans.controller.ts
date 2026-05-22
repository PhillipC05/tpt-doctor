import { Controller, Get, Post, Patch, Body, Param, Query, Headers } from '@nestjs/common';
import { CarePlansService } from './care-plans.service';
import { CreateCarePlanDto, UpdateCarePlanDto, UpdateCarePlanStatusDto } from './care-plans.dto';

@Controller('api/v1/care-plans')
export class CarePlansController {
  constructor(private readonly carePlansService: CarePlansService) {}

  @Post()
  create(@Body() body: CreateCarePlanDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.carePlansService.create(body, tenantId, userId);
  }

  @Get()
  findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('patientId') patientId?: string,
    @Query('planType') planType?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const p = page ?? 1;
    const ps = pageSize ?? 20;
    return this.carePlansService.findAll(tenantId, { patientId, planType, status, page: p, pageSize: ps });
  }

  @Get('stats')
  getStats(@Headers('x-tenant-id') tenantId: string) {
    return this.carePlansService.getStats(tenantId);
  }

  @Get('due-reviews')
  getDueReviews(@Headers('x-tenant-id') tenantId: string) {
    return this.carePlansService.getDueReviews(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.carePlansService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCarePlanDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.carePlansService.update(id, body, tenantId, userId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateCarePlanStatusDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.carePlansService.updateStatus(id, body.status, tenantId, userId);
  }
}
