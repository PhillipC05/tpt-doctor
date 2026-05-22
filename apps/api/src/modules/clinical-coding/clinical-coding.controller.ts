import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { ClinicalCodingService } from './clinical-coding.service';
import { CreateMappingDto, ImportSnomedCodesDto } from './clinical-coding.dto';

@Controller('api/v1/clinical-coding')
export class ClinicalCodingController {
  constructor(private readonly codingService: ClinicalCodingService) {}

  @Get('snomed-ct')
  searchSnomedCt(@Query('q') query: string, @Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    const p = page ?? 1;
    const ps = pageSize ?? 20;
    return this.codingService.searchSnomedCt(query, p, ps);
  }

  @Get('snomed-ct/parent/:parentId')
  getSnomedCtByParent(@Param('parentId') parentId: string) {
    return this.codingService.getSnomedCtByParent(parentId);
  }

  @Get('mapping/:sourceSystem/:sourceCode')
  findMappings(@Param('sourceSystem') sourceSystem: string, @Param('sourceCode') sourceCode: string) {
    return this.codingService.findMappings(sourceSystem, sourceCode);
  }

  @Get('map/:sourceSystem/:sourceCode/to/:targetSystem')
  mapCode(@Param('sourceSystem') sourceSystem: string, @Param('sourceCode') sourceCode: string, @Param('targetSystem') targetSystem: string) {
    return this.codingService.mapCode(sourceSystem.toUpperCase(), sourceCode, targetSystem.toUpperCase());
  }

  @Post('mappings')
  createMapping(@Body() body: CreateMappingDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.codingService.createMapping(body, tenantId, userId);
  }

  @Post('snomed-ct/import')
  importSnomedCodes(@Body() body: ImportSnomedCodesDto, @Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.codingService.importSnomedCodes(body.codes, tenantId, userId);
  }

  @Get('suggest')
  suggestCodes(@Query('text') text: string) {
    return this.codingService.suggestCodes(text);
  }

  @Get('lookup/:system/:code')
  lookupCode(@Param('system') system: string, @Param('code') code: string) {
    return this.codingService.lookupCode(system.toUpperCase(), code);
  }

  @Get('stats')
  getStats() {
    return this.codingService.getStats();
  }
}
