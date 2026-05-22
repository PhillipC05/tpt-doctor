import {
  IsBoolean,
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postcode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsObject()
  insurance?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  emergencyContact?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  nextOfKin?: Record<string, unknown>;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class MergePatientsDto {
  @IsUUID()
  survivingPatientId: string;

  @IsUUID()
  mergedPatientId: string;

  @IsOptional()
  @IsString()
  mergeReason?: string;
}

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateConsentDto {
  @IsBoolean()
  isGranted: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
