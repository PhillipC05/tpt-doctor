import { Controller, Get, Post, Delete, Patch, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateApiKeyDto {
  @IsString() @IsNotEmpty() name: string;
  @IsArray() @IsString({ each: true }) scopes: string[];
  @IsOptional() @IsDateString() expiresAt?: string;
}

@Controller('api/v1/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async create(
    @Body() body: CreateApiKeyDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.apiKeysService.createApiKey(tenantId, userId, {
      name: body.name,
      scopes: body.scopes,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Get()
  list(@Headers('x-tenant-id') tenantId: string) {
    return this.apiKeysService.listApiKeys(tenantId);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.apiKeysService.revokeApiKey(id, tenantId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.apiKeysService.deleteApiKey(id, tenantId);
  }
}
