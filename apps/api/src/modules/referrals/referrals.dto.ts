import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateReferralDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  referringStaffId: string;

  @IsEnum(['INTERNAL', 'EXTERNAL'])
  referralType: string;

  @IsEnum(['URGENT', 'SEMI_URGENT', 'ROUTINE'])
  priority: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  specialistName?: string;

  @IsOptional()
  @IsString()
  facility?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  letterContent?: string;

  @IsOptional()
  @IsObject()
  clinicalSummary?: Record<string, unknown>;
}

export class UpdateReferralDto extends PartialType(CreateReferralDto) {}

export class UpdateReferralStatusDto {
  @IsEnum(['DRAFT', 'SENT', 'ACKNOWLEDGED', 'BOOKED', 'COMPLETED', 'CLOSED'])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
