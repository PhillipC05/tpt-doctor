import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateMedicalCertificateDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  staffId: string;

  @IsEnum(['SICK_LEAVE', 'FITNESS_FOR_WORK', 'WORKERS_COMPENSATION', 'INSURANCE', 'OTHER'])
  certificateType: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  restrictions?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMedicalCertificateDto extends PartialType(CreateMedicalCertificateDto) {}

export class VoidCertificateDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
