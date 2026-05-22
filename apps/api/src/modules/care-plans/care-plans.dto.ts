import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateCarePlanDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  staffId: string;

  @IsEnum(['GPMP', 'TCA', 'MHTP', 'HEALTH_ASSESSMENT', 'CHRONIC_DISEASE', 'OTHER'])
  planType: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  goals?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  teamMembers?: string[];

  @IsOptional()
  @IsObject()
  clinicalIndicators?: Record<string, unknown>;

  @IsOptional()
  @IsISO8601()
  reviewDate?: string;
}

export class UpdateCarePlanDto extends PartialType(CreateCarePlanDto) {
  @IsOptional()
  @IsObject()
  interventions?: Record<string, unknown>;
}

export class UpdateCarePlanStatusDto {
  @IsEnum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'REVIEW_DUE'])
  status: string;
}
