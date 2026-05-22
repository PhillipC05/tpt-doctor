import { Controller, Get, Post, Query, Headers, Body } from '@nestjs/common';
import { PhiAnomalyService } from './phi-anomaly.service';
import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

class ScanOptionsDto {
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() volumeWindowMinutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() @Max(100000) volumeThreshold?: number;
  @IsOptional() @Type(() => Number) @IsInt() offHoursStart?: number;
  @IsOptional() @Type(() => Number) @IsInt() offHoursEnd?: number;
  @IsOptional() @Type(() => Number) @IsInt() @IsPositive() ipSwitchWindowMinutes?: number;
}

@Controller('api/v1/security/phi-anomaly')
export class PhiAnomalyController {
  constructor(private readonly anomalyService: PhiAnomalyService) {}

  @Get('scan')
  runScan(@Headers('x-tenant-id') tenantId: string, @Query() opts: ScanOptionsDto) {
    return this.anomalyService.runFullScan(tenantId, opts);
  }

  @Get('volume')
  detectVolume(
    @Headers('x-tenant-id') tenantId: string,
    @Query('windowMinutes') windowMinutes?: number,
    @Query('threshold') threshold?: number,
  ) {
    return this.anomalyService.detectVolumeAnomalies(tenantId, windowMinutes, threshold);
  }

  @Get('off-hours')
  detectOffHours(
    @Headers('x-tenant-id') tenantId: string,
    @Query('startHour') startHour?: number,
    @Query('endHour') endHour?: number,
  ) {
    return this.anomalyService.detectOffHoursAccess(tenantId, startHour, endHour);
  }

  @Get('ip-switching')
  detectIpSwitching(
    @Headers('x-tenant-id') tenantId: string,
    @Query('windowMinutes') windowMinutes?: number,
  ) {
    return this.anomalyService.detectRapidIpSwitching(tenantId, windowMinutes);
  }

  @Get('bulk-export')
  detectBulkExport(
    @Headers('x-tenant-id') tenantId: string,
    @Query('threshold') threshold?: number,
    @Query('lookbackHours') lookbackHours?: number,
  ) {
    return this.anomalyService.detectBulkExportAccess(tenantId, threshold, lookbackHours);
  }
}
