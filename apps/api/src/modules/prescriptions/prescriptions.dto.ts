import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePrescriptionDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  refills?: number;

  @IsOptional()
  @IsBoolean()
  daw?: boolean;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePrescriptionStatusDto {
  @IsEnum(['DRAFT', 'SUBMITTED', 'FILLED', 'CANCELLED', 'EXPIRED'])
  status: string;
}
