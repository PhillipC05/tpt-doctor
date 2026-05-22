import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SendToPharmacyDto {
  @IsOptional()
  @IsUUID()
  pharmacyId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDrugInteractionDto {
  @IsString()
  @IsNotEmpty()
  drug1: string;

  @IsString()
  @IsNotEmpty()
  drug2: string;

  @IsEnum(['MAJOR', 'MODERATE', 'MINOR', 'UNKNOWN'])
  severity: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  clinicalSignificance?: string;
}

export class CreateDrugDto {
  @IsString()
  @IsNotEmpty()
  genericName: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  drugClass?: string;

  @IsOptional()
  @IsBoolean()
  isControlled?: boolean;

  @IsOptional()
  @IsString()
  deaSchedule?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class LogControlledSubstanceDto {
  @IsUUID()
  prescriptionId: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}

export class CreatePharmacyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  fax?: string;

  @IsOptional()
  @IsBoolean()
  supportsEprescribing?: boolean;

  @IsOptional()
  @IsString()
  ncpdpId?: string;
}
