import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateSavedReportDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsObject()
  config: Record<string, unknown>;

  @IsOptional()
  @IsString()
  schedule?: string;
}

export class UpdateSavedReportDto extends PartialType(CreateSavedReportDto) {}
